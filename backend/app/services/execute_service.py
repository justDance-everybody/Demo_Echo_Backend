from typing import Dict, Any, Optional
from loguru import logger
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx  # 导入 httpx
import json
import time
import uuid

from app.utils.mcp_client import mcp_client
from app.schemas.execute import ExecuteResponse

# 可以在这里导入 Session, Log 模型用于数据库操作
# from app.models.session import Session
# from app.models.log import Log
# from app.utils.db import db_session
from app.models.session import Session
from app.models.log import Log
from app.models.tool import Tool
from app.utils.openai_client import get_openai_client
from app.config import settings  # 导入 settings 以获取模型名称等


class ExecuteService:
    """处理工具执行请求的服务"""

    def _abbrev_addresses(self, text: str) -> str:
        import re
        def abbr(s: str, head: int = 6, tail: int = 4) -> str:
            if len(s) <= head + tail:
                return s
            return s[:head] + "…" + s[-tail:]
        patterns = [
            (r"0x[a-fA-F0-9]{40}", None),
            (r"bc1[ac-hj-np-z0-9]{25,60}", None),
            (r"[13][a-km-zA-HJ-NP-Z1-9]{25,34}", None),
            (r"[1-9A-HJ-NP-Za-km-z]{32,44}", None),
            (r"r[1-9A-HJ-NP-Za-km-z]{24,34}", None),
            (r"ton://[A-Za-z0-9_-]{48,64}", "ton://"),
        ]
        out = text
        for pat, prefix in patterns:
            def repl(m):
                s = m.group(0)
                if prefix and s.startswith(prefix):
                    addr = s[len(prefix):]
                    return prefix + abbr(addr)
                return abbr(s)
            out = re.sub(pat, repl, out)
        return out

    def _extract_speakable_text(self, raw: Any) -> str:
        def to_text(v: Any) -> str:
            if v is None:
                return ""
            if isinstance(v, (str, int, float)):
                s = str(v)
                try:
                    obj = json.loads(s)
                    # 解析为对象后，递归提取常见文本键
                    return to_text(obj)
                except Exception:
                    try:
                        fixed = _fix_json_like(s)
                        obj2 = json.loads(fixed)
                        return to_text(obj2)
                    except Exception:
                        extracted = _extract_pairs_from_json_like(s)
                        if extracted:
                            return "\n".join(extracted)
                        return s
            try:
                return json.dumps(v, ensure_ascii=False)
            except Exception:
                return str(v)

        def _fix_json_like(s: str) -> str:
            x = s.strip()
            x = x.replace("…", "")
            if x.count('"') % 2 == 1:
                x += '"'
            opens = x.count('{') - x.count('}')
            if opens > 0:
                x += '}' * opens
            opens_b = x.count('[') - x.count(']')
            if opens_b > 0:
                x += ']' * opens_b
            return x

        def _extract_pairs_from_json_like(s: str) -> list:
            import re
            lines = []
            names = re.findall(r'"name"\s*:\s*"([^"]+)"', s)
            addrs = re.findall(r'"address"\s*:\s*"([^"]+)"', s)
            locs = re.findall(r'"location"\s*:\s*"([^"]+)"', s)
            m = max(len(names), len(addrs), len(locs))
            for i in range(m):
                name = names[i] if i < len(names) else None
                addr = addrs[i] if i < len(addrs) else (locs[i] if i < len(locs) else None)
                if name and addr:
                    lines.append(f"{name}（{addr}）")
                elif name:
                    lines.append(name)
            for key in ["title", "summary", "desc", "description", "message", "content", "answer", "text"]:
                vals = re.findall(rf'"{key}"\s*:\s*"([^"]+)"', s)
                for v in vals[:5]:
                    v2 = ' '.join(v.split())
                    if v2 and v2 not in lines:
                        lines.append(v2)
            return lines

        def collect_text(obj: Any, lines: list) -> None:
            if obj is None:
                return
            if isinstance(obj, str):
                s = obj.strip()
                if s:
                    lines.append(s)
                return
            if isinstance(obj, (int, float)):
                lines.append(str(obj))
                return
            if isinstance(obj, list):
                for item in obj[:20]:
                    collect_text(item, lines)
                return
            if isinstance(obj, dict):
                # 优先组合通用键
                name = obj.get("name")
                addr = obj.get("address") or obj.get("location") or obj.get("place")
                if isinstance(name, str):
                    if isinstance(addr, str) and addr.strip():
                        lines.append(f"{name.strip()}（{addr.strip()}）")
                    else:
                        lines.append(name.strip())
                # 常见文本键
                keys = ["title", "summary", "desc", "description", "message", "content", "answer", "text"]
                for k in keys:
                    v = obj.get(k)
                    if isinstance(v, str) and v.strip():
                        lines.append(v.strip())
                # 递归遍历其余键值
                for k, v in list(obj.items())[:50]:
                    if k in ("name", "address", "location", "place"):
                        continue
                    collect_text(v, lines)
                return
            # 其他类型回退
            lines.append(str(obj))

        lines: list[str] = []
        collect_text(raw, lines)
        # 去重与清洗
        cleaned = []
        seen = set()
        for line in lines:
            x = line.replace("\\n", " ").replace("\\t", " ")
            x = " ".join(x.split())
            # 移除裸 URL
            import re
            x = re.sub(r"https?://\S+", "", x)
            if x and x not in seen:
                cleaned.append(x)
                seen.add(x)
        text = "\n".join(cleaned)

        # 清洗：统一空白，保留语义字符
        text = text.replace("\\n", "\n").replace("\\t", " ")
        text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
        if len(text) > 1200:
            text = text[:1200] + "…"
        return text

    async def _faithful_tts(self, params: Dict[str, Any], raw_text: str) -> str:
        client = get_openai_client()
        try:
            params_text = json.dumps(params, ensure_ascii=False)
        except Exception:
            params_text = str(params)
        def clean_out(s: str) -> str:
            import re
            x = s.strip()
            prefixes = [
                r"^(?:好的[，,]?|以下是|总结[:：]?|综上|我可以|我将|让我来|抱歉|对不起|很抱歉|提示[:：]?)[\s\-:：]*",
            ]
            for p in prefixes:
                x = re.sub(p, "", x)
            x = self._abbrev_addresses(x)
            x = x.replace("\\n", "\n").replace("\\t", " ")
            x = "\n".join(line.strip() for line in x.splitlines() if line.strip())
            x = re.sub(r"\s+", " ", x)
            if len(x) > 200:
                x = x[:200] + "…"
            return x
        if not client or not settings.LLM_MODEL:
            out = clean_out(raw_text)
            import re
            numbers = re.findall(r"\b\d+(?:[.,]\d+)?\b", raw_text)
            uppers = re.findall(r"\b[A-Z]{2,}\b", raw_text)
            required_marks = numbers[:5] + uppers[:5]
            missing_marks = [m for m in required_marks if m not in out]
            if (len(required_marks) > 0 and len(missing_marks) > len(required_marks) * 0.7):
                return raw_text
            return out
        system_prompt = (
            "仅输出播报正文。不含前缀、说明、道歉、工具或实现细节。"
            "保持原语言与事实，保留数字/实体/否定。最长200字，无法忠实则原文。"
            "如检测到区块链地址，统一缩写后输出。"
        )
        prompt = (
            "用户参数：" + params_text + "\n" + "原文：\n" + raw_text
        )
        try:
            resp = await client.client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=200,
            )
            tts = (resp.choices[0].message.content or "").strip()
            suspicious = [
                "抱歉", "对不起", "sorry", "请稍后", "暂无", "无数据", "unknown", "N/A",
                "无法获取", "不能提供", "不予以", "无法给出", "未能"
            ]
            contains_suspicious = any(s in tts for s in suspicious)
            import re
            numbers = re.findall(r"\b\d+(?:[.,]\d+)?\b", raw_text)
            uppers = re.findall(r"\b[A-Z]{2,}\b", raw_text)
            required_marks = numbers[:5] + uppers[:5]
            missing_marks = [m for m in required_marks if m not in tts]
            if (not tts) or contains_suspicious or (len(required_marks) > 0 and len(missing_marks) > len(required_marks) * 0.7):
                tts = raw_text
            return clean_out(tts)
        except Exception:
            return clean_out(raw_text)

    

    # @stable(tested=2025-04-30, test_script=backend/test_api.py)
    async def execute_tool(
        self,
        tool_id: str,
        params: Dict[str, Any],
        db: AsyncSession,
        session_id: Optional[str] = None,
        user_id: Optional[int] = None,
        original_query: Optional[str] = None,  # 新增参数: 接收原始查询
    ) -> ExecuteResponse:
        """
        执行指定的工具

        Args:
            tool_id: 工具ID
            params: 工具参数
            db: 异步数据库会话
            session_id: 会话ID (可选)
            user_id: 用户ID (可选)
            original_query: 用户的原始查询 (可选，用于总结)

        Returns:
            执行结果响应
        """
        logger.info(f"服务层：开始执行工具: tool_id={tool_id}, session_id={session_id}")
        session: Optional[Session] = None

        # 可以在这里添加数据库日志记录：记录执行尝试
        if session_id:
            try:
                # 首先检查会话是否存在，不存在则尝试创建
                result = await db.execute(select(Session).where(Session.session_id == session_id))
                session = result.scalars().first()
                
                # 如果会话不存在且提供了user_id，则创建新会话
                if not session and user_id is not None:
                    logger.info(f"Session {session_id} not found, creating new session with user_id {user_id}")
                    session = Session(session_id=session_id, user_id=user_id, status='interpreting')
                    db.add(session)
                    
                # 更新会话状态
                if session:
                    session.status = 'executing'
                    db.add(session)
                    # Create log entry
                    start_log = Log(session_id=session_id, step='execute_start', status='processing', message=f"Executing tool: {tool_id}")
                    db.add(start_log)
                    await db.commit()
                    await db.refresh(session)
                    logger.info(f"Updated session {session_id} status to executing and logged start.")
                else:
                    logger.warning(f"Session {session_id} not found and could not be created (user_id missing).")
            except Exception as db_err:
                logger.error(f"Database error during execute_start logging/status update for session {session_id}: {db_err}", exc_info=True)
                await db.rollback()

        try:
            # 1. 查询数据库获取工具信息
            result = await db.execute(select(Tool).where(Tool.tool_id == tool_id))
            tool: Optional[Tool] = result.scalars().first()

            if not tool:
                logger.error(f"服务层：未找到工具: tool_id={tool_id}")
                if session_id and session:
                    try:
                        session.status = 'error'
                        db.add(session)
                        error_log = Log(session_id=session_id, step='execute_end', status='error', message=f"Tool '{tool_id}' not found")
                        db.add(error_log)
                        await db.commit()
                        logger.info(f"Updated session {session_id} status to error and logged tool not found.")
                    except Exception as db_err:
                        logger.error(f"Database error during tool not found logging/status update for session {session_id}: {db_err}", exc_info=True)
                        await db.rollback()
                return ExecuteResponse(
                    tool_id=tool_id,
                    success=False,
                    data=None,
                    error={
                        "code": "TOOL_NOT_FOUND",
                        "message": f"工具 '{tool_id}' 未注册",
                    },
                    session_id=session_id,
                )
            
            # 验证工具配置的完整性
            if not tool.tool_id or not tool.tool_id.strip():
                error_msg = "工具ID为空或无效"
                logger.error(f"服务层：{error_msg}: tool_id='{tool_id}'")
                return ExecuteResponse(
                    tool_id=tool_id,
                    success=False,
                    data=None,
                    error={
                        "code": "INVALID_TOOL_ID",
                        "message": error_msg,
                    },
                    session_id=session_id,
                )

            # 2. 根据工具类型决定执行方式
            if tool.type == "mcp":
                # 执行 MCP 工具
                logger.info(f"服务层：检测到 MCP 类型工具: tool_id={tool_id}")
                
                # 验证MCP工具的server_name
                if not tool.server_name or tool.server_name.strip() in ['', 'None', 'null']:
                    error_msg = f"MCP工具 '{tool_id}' 的服务器名称无效: '{tool.server_name}'"
                    logger.error(error_msg)
                    return ExecuteResponse(
                        tool_id=tool_id,
                        success=False,
                        data=None,
                        error={
                            "code": "INVALID_MCP_SERVER_NAME",
                            "message": error_msg,
                        },
                        session_id=session_id,
                    )
                
                # 暂时跳过MCP服务器管理检查，直接使用MCP客户端连接
                # 这样可以避免重复启动进程的问题
                logger.info(f"直接使用MCP客户端执行工具: {tool_id} (服务器: {tool.server_name})")
                
                # 执行MCP工具
                target_server = tool.server_name
                mcp_result = await mcp_client.execute_tool(
                    tool_id=tool_id, params=params, target_server=target_server
                )
                
                if mcp_result.get("success"):
                    raw_result = mcp_result.get("result", {}).get("message", "")
                    # 调用 LLM 总结
                    try:
                        logger.debug(f"准备调用 LLM 总结 MCP 工具 '{tool_id}' 的结果。")
                        summary_prompt = (
                            f"你是一个智能助手，需要将以下工具执行的原始结果总结成一段简洁、流畅、适合直接对用户语音播报的话。\n"
                            f"用户的原始问题(或相关参数)是：{params}\n"
                            f"工具 '{tool_id}' 返回的原始结果是：\n```\n{str(raw_result)}\n```\n"
                            f"请生成总结。"
                        )
                        speakable = self._extract_speakable_text(raw_result)
                        tts_message = await self._faithful_tts(params, speakable)
                    except Exception as llm_err:
                        logger.error(
                            f"调用 LLM 总结 MCP 工具 '{tool_id}' 结果时出错: {llm_err}，将返回通用成功消息。",
                            exc_info=True,
                        )
                        tts_message = self._extract_speakable_text(raw_result)
                
                    response_data = {"tts_message": tts_message}
                    response = ExecuteResponse(
                        tool_id=tool_id,
                        success=True,
                        data=response_data,
                        error=None,
                        session_id=session_id,
                    )
                    logger.info(f"服务层：MCP 工具执行成功: tool_id={tool_id}")
                    if session_id and session:
                        try:
                            session.status = 'done'
                            db.add(session)
                            success_log = Log(session_id=session_id, step='execute_end', status='success', message=tts_message)
                            db.add(success_log)
                            await db.commit()
                            logger.info(f"Updated session {session_id} status to done and logged success.")
                        except Exception as db_err:
                            logger.error(f"Database error during execute_end success log/status update for session {session_id}: {db_err}", exc_info=True)
                            await db.rollback()
                
                else:
                    # 执行失败 (由MCP客户端包装器返回失败信息)
                    error_info = mcp_result.get(
                        "error",
                        {
                            "code": "UNKNOWN_MCP_ERROR",
                            "message": "MCP客户端返回执行失败",
                        },
                    )
                    response = ExecuteResponse(
                        tool_id=tool_id,
                        success=False,
                        data=None,
                        error=error_info,
                        session_id=session_id,
                    )
                    logger.warning(
                        f"服务层：MCP 工具执行失败 (MCP client error): tool_id={tool_id}, error={error_info}"
                    )
                    if session_id and session:
                        try:
                            session.status = 'error'
                            db.add(session)
                            error_log = Log(session_id=session_id, step='execute_end', status='error', message=json.dumps(error_info))
                            db.add(error_log)
                            await db.commit()
                            logger.info(f"Updated session {session_id} status to error and logged failure.")
                        except Exception as db_err:
                            logger.error(f"Database error during execute_end error log/status update for session {session_id}: {db_err}", exc_info=True)
                            await db.rollback()


            elif tool.type == "http":
                # 2.2 执行 HTTP 工具 (T020-7-9)
                logger.info(f"服务层：检测到 HTTP 类型工具: tool_id={tool_id}")

                # 检查 endpoint 是否是字典并且包含必要信息
                if not isinstance(tool.endpoint, dict):
                    logger.error(
                        f"服务层：HTTP 工具 '{tool_id}' 的 endpoint 配置无效 (非字典)"
                    )
                    return ExecuteResponse(
                        tool_id=tool_id,
                        success=False,
                        data=None,
                        error={
                            "code": "INVALID_ENDPOINT_CONFIG",
                            "message": "HTTP 工具配置无效",
                        },
                        session_id=session_id,
                    )

                platform = tool.endpoint.get("platform")
                api_key = tool.endpoint.get("api_key")
                base_url = tool.endpoint.get("base_url")  # 可选
                app_config = tool.endpoint.get("app_config", {})  # 可选

                if not platform or not api_key:
                    logger.error(
                        f"服务层：HTTP 工具 '{tool_id}' 的 endpoint 配置缺少 platform 或 api_key"
                    )
                    return ExecuteResponse(
                        tool_id=tool_id,
                        success=False,
                        data=None,
                        error={
                            "code": "MISSING_ENDPOINT_CONFIG",
                            "message": "HTTP 工具配置不完整",
                        },
                        session_id=session_id,
                    )

                # 获取全局超时配置，优先使用app_config中的timeout，否则使用默认值
                global_timeout = float(app_config.get("timeout", 120)) if app_config else 120.0
                
                # 准备调用外部 HTTP API
                async with httpx.AsyncClient(timeout=global_timeout) as client:  # 使用动态超时
                    try:
                        if platform == "dify":
                            # --- 实现调用 Dify API 的逻辑（支持多种应用类型）---
                            # 获取应用类型（默认 chat）
                            app_type = tool.endpoint.get("app_type", "chat")
                            base_url = base_url or "https://api.dify.ai/v1"
                            
                            # 从输入参数中获取用户查询
                            user_query = params.get("query", "")
                            if not user_query:
                                logger.warning(
                                    f"调用 Dify 工具 '{tool_id}' 时缺少 'query' 参数"
                                )
                            
                            headers = {
                                "Authorization": f"Bearer {api_key}",
                                "Content-Type": "application/json",
                            }
                            
                            # 根据应用类型构造不同的请求
                            if app_type == "workflow":
                                dify_url = f"{base_url}/workflows/run"
                                inputs_payload = params.get("inputs", {}) if isinstance(params.get("inputs", {}), dict) else {}
                                if user_query and "query" not in inputs_payload:
                                    inputs_payload["query"] = user_query
                                if not inputs_payload and params:
                                    try:
                                        for k, v in params.items():
                                            if k != "inputs":
                                                inputs_payload[k] = v
                                    except Exception:
                                        pass
                                dify_payload = {
                                    "inputs": inputs_payload,
                                    "user": user_id or "echo-backend-user",
                                    "response_mode": app_config.get("response_mode", "blocking")
                                }
                            else:
                                # Chat App / Agent / Completion 类型（使用相似的请求格式）
                                if app_type == "agent":
                                    dify_url = f"{base_url}/agent/chat"
                                elif app_type == "completion":
                                    dify_url = f"{base_url}/completion-messages"
                                else:  # chat (默认)
                                    dify_url = f"{base_url}/chat-messages"
                                
                                dify_payload = {
                                    "inputs": {},
                                    "query": user_query,
                                    "user": user_id or "echo-backend-user",
                                    "response_mode": app_config.get("response_mode", "blocking")
                                }

                            logger.info(
                                f"准备调用 Dify API: Type={app_type}, URL={dify_url}"
                            )
                            try:
                                response = await client.post(
                                    dify_url, headers=headers, json=dify_payload
                                )
                                response.raise_for_status()  # 检查 HTTP 错误 (4xx, 5xx)
                            except httpx.HTTPStatusError as e:
                                # 对 blocking 504/超时等进行兜底：切换 streaming 重试一次
                                fallback_needed = False
                                status_code = getattr(e.response, 'status_code', None)
                                if status_code == 504:
                                    fallback_needed = True
                                # 如果需要兜底，切换为 streaming
                                if fallback_needed:
                                    try:
                                        fallback_mode = "streaming"
                                        # 仅在 app_config 未指定 streaming 时切换
                                        fallback_headers = {**headers, "accept": "text/event-stream"}
                                        fallback_payload = dict(dify_payload)
                                        fallback_payload["response_mode"] = fallback_mode
                                        fallback_resp = await client.post(
                                            dify_url, headers=fallback_headers, json=fallback_payload
                                        )
                                        # 直接读取文本事件流
                                        raw_stream = fallback_resp.text
                                        api_result = {"stream": raw_stream}
                                    except Exception:
                                        raise
                                else:
                                    raise

                            # 正常解析 JSON
                            try:
                                if api_result is None:
                                    api_result = response.json()
                            except Exception:
                                api_result = {"text": response.text}

                            # 根据应用类型提取答案
                            if app_type == "workflow":
                                # 如果上游把完整结果包在 text 字段的 JSON 字符串中，先二次解析
                                if isinstance(api_result, dict) and isinstance(api_result.get("text"), str):
                                    try:
                                        api_result = json.loads(api_result["text"])  # 解析为真正对象
                                    except Exception:
                                        pass
                                # 若是 streaming 兜底，直接返回流文本
                                if isinstance(api_result, dict) and "stream" in api_result:
                                    raw_result = api_result["stream"]
                                else:
                                    raw_result = (
                                        api_result.get("data", {}).get("outputs", {}).get("response")
                                        or api_result.get("data", {}).get("outputs", {}).get("result")
                                        or api_result.get("data", {}).get("outputs", {}).get("text")
                                        or api_result.get("data", {}).get("outputs")
                                        or api_result.get("data")
                                        or "Dify Workflow 未返回结果"
                                    )
                                if isinstance(raw_result, (dict, list)):
                                    try:
                                        raw_result = json.dumps(raw_result, ensure_ascii=False)
                                    except Exception:
                                        raw_result = str(raw_result)
                            else:
                                # Chat/Agent/Completion 响应格式: answer
                                raw_result = api_result.get("answer", "Dify 未返回结果")
                            # --- [修改开始] 调用 LLM 总结 ---
                            try:
                                logger.debug(
                                    f"准备调用 LLM 总结 Dify 工具 '{tool_id}' 的结果。"
                                )
                                summary_prompt = (
                                    f"你是一个智能助手，需要将以下工具执行的原始结果总结成一段简洁、流畅、适合直接对用户语音播报的话。\n"
                                    f"用户的原始问题(或相关参数)是：{params}\n"
                                    f"工具 '{tool_id}' (Dify App) 返回的原始结果是：\n```\n{str(raw_result)}\n```\n"
                                    f"请生成总结。"
                                )
                                # 忠实提取与改写
                                speakable = self._extract_speakable_text(raw_result)
                                tts_message = await self._faithful_tts(params, speakable)
                            except Exception as llm_err:
                                logger.error(
                                    f"生成忠实 tts_message 出错: {llm_err}，回退原文播报。",
                                    exc_info=True,
                                )
                                tts_message = self._extract_speakable_text(raw_result)
                            # --- [修改结束] ---

                            logger.info(f"Dify API 调用成功: tool_id={tool_id}")
                            # 示例：成功调用 Dify 后
                            response_data = {
                                "tts_message": tts_message,
                                "original_dify_response": api_result,
                            }
                            return ExecuteResponse(
                                tool_id=tool_id,
                                success=True,
                                data=response_data,
                                error=None,
                                session_id=session_id,
                            )

                        elif platform == "coze":
                            # --- 实现调用 Coze API 的逻辑 ---
                            coze_url = (
                                base_url or "https://api.coze.com/open_api/v2"
                            ) + "/chat"
                            headers = {
                                "Authorization": f"Bearer {api_key}",
                                "Content-Type": "application/json",
                                "Accept": "*/*",  # Coze API 可能需要
                                "Host": "api.coze.com",  # Coze API 可能需要
                            }
                            bot_id = app_config.get("bot_id")
                            if not bot_id:
                                logger.error(
                                    f"服务层：Coze 工具 '{tool_id}' 的 endpoint 配置缺少 bot_id"
                                )
                                return ExecuteResponse(
                                    tool_id=tool_id,
                                    success=False,
                                    error={
                                        "code": "MISSING_BOT_ID",
                                        "message": "Coze 工具配置缺少 Bot ID",
                                    },
                                    session_id=session_id,
                                )

                            user_query = params.get("query", "")
                            if not user_query:
                                logger.warning(
                                    f"调用 Coze 工具 '{tool_id}' 时缺少 'query' 参数"
                                )

                            coze_payload = {
                                "bot_id": bot_id,
                                "user": user_id or "echo-backend-user",
                                "query": user_query,
                                "stream": False,  # MVP 使用非流式
                                # conversation_id 也是可选的，MVP 暂时不传
                            }

                            logger.info(
                                f"准备调用 Coze API: URL={coze_url}, Payload={coze_payload}"
                            )
                            response = await client.post(
                                coze_url, headers=headers, json=coze_payload
                            )
                            response.raise_for_status()

                            api_result = response.json()
                            raw_result = "Coze did not provide an answer."
                            if api_result.get("code") == 0 and "messages" in api_result:
                                for msg in api_result["messages"]:
                                    if msg.get("type") == "answer":
                                        raw_result = msg.get("content", raw_result)
                                        break
                            else:
                                # Coze 返回错误码 (保持之前的错误处理逻辑)
                                error_msg = api_result.get(
                                    "msg", "Unknown Coze API error"
                                )
                                logger.error(
                                    f"Coze API 返回错误: code={api_result.get('code')}, msg={error_msg}"
                                )
                                return ExecuteResponse(
                                    tool_id=tool_id,
                                    success=False,
                                    error={
                                        "code": "COZE_API_ERROR",
                                        "message": error_msg,
                                    },
                                    session_id=session_id,
                                )

                            # --- [修改开始] 调用 LLM 总结 ---
                            try:
                                logger.debug(
                                    f"准备调用 LLM 总结 Coze 工具 '{tool_id}' 的结果。"
                                )
                                summary_prompt = (
                                    f"你是一个智能助手，需要将以下工具执行的原始结果总结成一段简洁、流畅、适合直接对用户语音播报的话。\n"
                                    f"用户的原始问题(或相关参数)是：{params}\n"
                                    f"工具 '{tool_id}' (Coze Bot) 返回的原始结果是：\n```\n{str(raw_result)}\n```\n"
                                    f"请生成总结。"
                                )
                                speakable = self._extract_speakable_text(raw_result)
                                tts_message = await self._faithful_tts(params, speakable)
                            except Exception as llm_err:
                                logger.error(
                                    f"调用 LLM 总结 Coze 工具 '{tool_id}' 结果时出错: {llm_err}，将直接使用原始结果。",
                                    exc_info=True,
                                )
                                tts_message = self._extract_speakable_text(raw_result)
                            # --- [修改结束] ---

                            logger.info(f"Coze API 调用成功: tool_id={tool_id}")
                            # 示例：成功调用 Coze 后
                            response_data = {
                                "tts_message": tts_message,
                                "original_coze_response": api_result,
                            }
                            return ExecuteResponse(
                                tool_id=tool_id,
                                success=True,
                                data=response_data,
                                error=None,
                                session_id=session_id,
                            )

                        elif platform == "generic":
                            # --- 实现调用通用 HTTP API 的逻辑 ---
                            http_url = app_config.get("url")
                            if not http_url:
                                logger.error(
                                    f"服务层：通用 HTTP 工具 '{tool_id}' 的 app_config 配置缺少 url"
                                )
                                return ExecuteResponse(
                                    tool_id=tool_id,
                                    success=False,
                                    error={
                                        "code": "MISSING_URL",
                                        "message": "通用 HTTP 工具配置缺少 URL",
                                    },
                                    session_id=session_id,
                                )
                            
                            # 获取配置的HTTP方法，默认为POST
                            http_method = app_config.get("method", "POST").upper()
                            # 获取配置的内容类型，默认为application/json
                            content_type = app_config.get("content_type", "application/json")
                            # 获取配置的超时设置，默认为120秒
                            timeout = float(app_config.get("timeout", 120))
                            # 获取配置的请求头
                            headers = app_config.get("headers", {})
                            
                            # 如果提供了API密钥，添加到请求头中
                            if api_key:
                                # 根据配置的auth_type决定如何使用API密钥
                                auth_type = app_config.get("auth_type", "Bearer")
                                if auth_type == "Bearer":
                                    headers["Authorization"] = f"Bearer {api_key}"
                                elif auth_type == "ApiKey":
                                    # 获取API密钥的头名称，默认为X-API-Key
                                    key_header = app_config.get("key_header", "X-API-Key")
                                    headers[key_header] = api_key
                                elif auth_type == "Basic":
                                    import base64
                                    # 假设api_key格式为username:password
                                    basic_auth = base64.b64encode(api_key.encode()).decode()
                                    headers["Authorization"] = f"Basic {basic_auth}"
                            
                            # 设置Content-Type
                            if content_type and "Content-Type" not in headers:
                                headers["Content-Type"] = content_type
                            
                            # 准备请求有效载荷
                            # 这里假设params就是要发送的数据
                            payload = params
                            # 如果指定了payload_key，则使用它作为嵌套的键
                            payload_key = app_config.get("payload_key")
                            if payload_key:
                                payload = {payload_key: params}
                            
                            # 处理URL中的参数占位符
                            try:
                                # 使用format_map在URL中替换{param_name}占位符
                                if "{" in http_url and "}" in http_url:
                                    http_url = http_url.format_map(
                                        {**params, **{"default": ""}}
                                    )
                            except KeyError as e:
                                logger.warning(
                                    f"URL格式化错误，缺少参数 {e}，将使用原始URL"
                                )
                            except Exception as e:
                                logger.warning(
                                    f"URL格式化时发生错误: {e}，将使用原始URL"
                                )
                            
                            logger.info(
                                f"准备调用通用 HTTP API: Method={http_method}, URL={http_url}"
                            )
                            
                            try:
                                # 根据HTTP方法发送请求
                                if http_method == "GET":
                                    # 对于GET请求，将params作为URL参数
                                    response = await client.get(
                                        http_url, 
                                        headers=headers,
                                        params=payload if app_config.get("send_params_in_querystring", False) else None,
                                        timeout=timeout
                                    )
                                elif http_method == "POST":
                                    # 对于POST请求，根据内容类型决定如何发送数据
                                    if content_type == "application/x-www-form-urlencoded":
                                        response = await client.post(
                                            http_url, 
                                            headers=headers,
                                            data=payload,
                                            timeout=timeout
                                        )
                                    else:  # 默认为JSON
                                        response = await client.post(
                                            http_url, 
                                            headers=headers,
                                            json=payload,
                                            timeout=timeout
                                        )
                                elif http_method == "PUT":
                                    response = await client.put(
                                        http_url, 
                                        headers=headers,
                                        json=payload,
                                        timeout=timeout
                                    )
                                elif http_method == "PATCH":
                                    response = await client.patch(
                                        http_url, 
                                        headers=headers,
                                        json=payload,
                                        timeout=timeout
                                    )
                                elif http_method == "DELETE":
                                    response = await client.delete(
                                        http_url, 
                                        headers=headers,
                                        json=payload if app_config.get("send_body_with_delete", False) else None,
                                        timeout=timeout
                                    )
                                else:
                                    logger.error(f"不支持的HTTP方法: {http_method}")
                                    return ExecuteResponse(
                                        tool_id=tool_id,
                                        success=False,
                                        error={
                                            "code": "UNSUPPORTED_HTTP_METHOD",
                                            "message": f"不支持的HTTP方法: {http_method}",
                                        },
                                        session_id=session_id,
                                    )
                                
                                response.raise_for_status()  # 检查HTTP错误
                                
                                # 解析响应
                                try:
                                    api_result = response.json()
                                except Exception:
                                    # 如果无法解析为JSON，则使用文本内容
                                    api_result = {"text": response.text}
                                
                                # 生成可播报文本（优先结构化摘要，其次路径提取，再次字符串化）
                                tts_message = None
                                # 1) 地图/POI 常见结构摘要
                                try:
                                    if isinstance(api_result, dict) and isinstance(api_result.get("pois"), list):
                                        pois = api_result.get("pois") or []
                                        top = pois[:3]
                                        if top:
                                            items = []
                                            for i, poi in enumerate(top, start=1):
                                                name = str(poi.get("name") or "")
                                                addr = str(poi.get("address") or "")
                                                # 清洗多余空白
                                                name = " ".join(name.split())
                                                addr = " ".join(addr.split())
                                                if name and addr:
                                                    items.append(f"{i}. {name}（{addr}）")
                                                elif name:
                                                    items.append(f"{i}. {name}")
                                            radius = params.get("radius")
                                            prefix = "附近范围内" if not radius else f"附近 {radius} 米内"
                                            summary = prefix + ("推荐的地点包括：" if len(items) > 1 else "推荐地点：")
                                            tts_message = summary + (" ".join(items) if len(items) == 1 else "\n" + "\n".join(items))
                                except Exception:
                                    pass

                                # 2) 指定结果路径提取
                                if not tts_message:
                                    result_path = app_config.get("result_path")
                                    if result_path:
                                        current = api_result
                                        try:
                                            for key in result_path.split('.'):
                                                if key.isdigit():
                                                    current = current[int(key)]
                                                else:
                                                    current = current[key]
                                            raw_result = current
                                        except (KeyError, IndexError, TypeError) as e:
                                            logger.warning(
                                                f"无法从响应中提取路径 '{result_path}': {e}"
                                            )
                                            raw_result = str(api_result)
                                    else:
                                        raw_result = str(api_result)
                                else:
                                    raw_result = tts_message
                                
                                # 忠实提取与改写
                                try:
                                    speakable = self._extract_speakable_text(raw_result)
                                    tts_message = await self._faithful_tts(params, speakable)
                                except Exception as llm_err:
                                    logger.error(
                                        f"生成忠实 tts_message 出错: {llm_err}，回退原文播报。",
                                        exc_info=True,
                                    )
                                    tts_message = self._extract_speakable_text(raw_result)
                                
                                logger.info(f"通用 HTTP API 调用成功: tool_id={tool_id}")
                                # 返回结果
                                response_data = {
                                    "tts_message": tts_message,
                                    "original_http_response": api_result,
                                }
                                return ExecuteResponse(
                                    tool_id=tool_id,
                                    success=True,
                                    data=response_data,
                                    error=None,
                                    session_id=session_id,
                                )
                                
                            except httpx.HTTPStatusError as e:
                                # 这些错误会在上面的总catch中被处理
                                raise
                            except httpx.RequestError as e:
                                # 这些错误会在上面的总catch中被处理
                                raise
                                
                        else:
                            # 不支持的平台类型
                            logger.error(f"服务层：不支持的 HTTP 平台: {platform}")
                            return ExecuteResponse(
                                tool_id=tool_id,
                                success=False,
                                data=None,
                                error={
                                    "code": "UNSUPPORTED_HTTP_PLATFORM",
                                    "message": f"不支持的 HTTP 平台: '{platform}'",
                                },
                                session_id=session_id,
                            )

                    except httpx.HTTPStatusError as e:
                        error_body_text = ""
                        error_code = None
                        error_msg = None
                        try:
                            error_body_text = e.response.text or ""
                            try:
                                err_json = e.response.json()
                                error_code = err_json.get("code")
                                error_msg = err_json.get("message")
                            except Exception:
                                pass
                        except Exception:
                            pass
                        logger.error(
                            f"调用外部 HTTP API '{platform}' 失败 (HTTP Status {e.response.status_code}): {error_body_text}",
                            exc_info=False,
                        )
                        error_payload = {
                            "code": f"{platform.upper()}_HTTP_ERROR",
                            "message": f"调用 {platform} API 失败 (Status: {e.response.status_code})",
                            "details": (error_body_text or "")[:500],
                        }
                        if error_code:
                            error_payload["api_error_code"] = error_code
                        if error_msg:
                            error_payload["api_error_message"] = error_msg
                        return ExecuteResponse(
                            tool_id=tool_id,
                            success=False,
                            data=None,
                            error=error_payload,
                            session_id=session_id,
                        )
                    except httpx.RequestError as e:
                        # 处理网络连接或请求相关的错误 (e.g., DNS, ConnectionRefused, Timeout)
                        logger.error(
                            f"调用外部 HTTP API '{platform}' 时发生网络或请求错误: {e}",
                            exc_info=False,
                        )
                        return ExecuteResponse(
                            tool_id=tool_id,
                            success=False,
                            data=None,
                            error={
                                "code": f"{platform.upper()}_REQUEST_ERROR",
                                "message": f"调用 {platform} API 时发生网络错误: {e.__class__.__name__}",
                            },
                            session_id=session_id,
                        )
                    except Exception as e:
                        # 处理其他意外错误，例如 JSON 解析错误
                        logger.error(
                            f"处理 HTTP 工具 '{tool_id}' ('{platform}') 时发生意外错误: {e}",
                            exc_info=True,
                        )
                        return ExecuteResponse(
                            tool_id=tool_id,
                            success=False,
                            data=None,
                            error={
                                "code": "HTTP_EXECUTION_EXCEPTION",
                                "message": f"处理 {platform} 工具时发生内部错误",
                            },
                            session_id=session_id,
                        )

            else:
                # 2.3 未知工具类型
                logger.error(
                    f"服务层：未知工具类型: tool_id={tool_id}, type={tool.type}"
                )
                return ExecuteResponse(
                    tool_id=tool_id,
                    success=False,
                    data=None,
                    error={
                        "code": "UNKNOWN_TOOL_TYPE",
                        "message": f"未知工具类型: '{tool.type}'",
                    },
                    session_id=session_id,
                )

        except Exception as e:
            # 处理调用过程中的意外异常
            logger.error(
                f"服务层：执行工具时发生意外错误: tool_id={tool_id}, error={e}",
                exc_info=True,
            )
            error_info = {
                "code": "EXECUTION_EXCEPTION",
                "message": f"执行工具时发生内部错误: {str(e)}",
            }
            response = ExecuteResponse(
                tool_id=tool_id,
                success=False,
                data=None,
                error=error_info,
                session_id=session_id,
            )
            if session_id and session:
                try:
                    session.status = 'error'
                    db.add(session)
                    exception_log = Log(session_id=session_id, step='execute_end', status='error', message=f"System Error: {str(e)}")
                    db.add(exception_log)
                    await db.commit()
                    logger.info(f"Updated session {session_id} status to error and logged system exception.")
                except Exception as db_err:
                    logger.error(f"Database error during system exception logging/status update for session {session_id}: {db_err}", exc_info=True)
                    await db.rollback()

        return response

    async def execute_tool_in_memory(
        self,
        db: AsyncSession,
        tool_config: dict,
        test_data: dict,
        current_user: "User"
    ) -> dict:
        """
        在内存中执行工具，用于预提交测试。
        不依赖于数据库中存储的工具信息。
        """
        tool_type = tool_config.get("type")
        endpoint_config = tool_config.get("endpoint", {})

        if tool_type == "http":
            return await self._execute_http_in_memory(endpoint_config, test_data)
        elif tool_type == "mcp":
            return await self._execute_mcp_in_memory(db, tool_config, test_data, current_user)
        else:
            return {"success": False, "error": f"不支持的工具类型: {tool_type}"}

    async def _execute_http_in_memory(self, endpoint_config: dict, test_data: dict) -> dict:
        """在内存中执行HTTP工具的辅助方法"""
        platform = endpoint_config.get("platform")
        api_key = endpoint_config.get("api_key")
        base_url = endpoint_config.get("base_url")
        app_type = endpoint_config.get("app_type")

        if not platform:
            return {"success": False, "error": "HTTP工具缺少 'platform' 配置"}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if platform == "dify":
                    if not api_key:
                        return {"success": False, "error": "Dify工具缺少 'api_key'"}
                    base_url = (base_url or "https://api.dify.ai/v1").rstrip('/')

                    headers = {
                        'Authorization': f"Bearer {api_key}",
                        'Content-Type': 'application/json'
                    }

                    # decide app_type: prefer provided, otherwise auto-detect
                    if not app_type:
                        from app.services.dev_tool_service import dev_tool_service
                        try:
                            detected = await dev_tool_service._detect_dify_app_type({
                                "api_key": api_key,
                                "base_url": base_url
                            })
                            app_type = detected
                        except Exception as e:
                            return {"success": False, "error": f"无法识别Dify应用类型: {str(e)}"}

                    if app_type == "workflow":
                        url = f"{base_url}/workflows/run"
                        payload = {
                            "inputs": test_data.get('inputs', {}),
                            "response_mode": "blocking",
                            "user": test_data.get('user', 'api-tester')
                        }
                    elif app_type == "agent":
                        url = f"{base_url}/agent/chat"
                        payload = {
                            "inputs": test_data.get('inputs', {}),
                            "query": test_data.get('query', ''),
                            "response_mode": "blocking",
                            "user": test_data.get('user', 'api-tester')
                        }
                    elif app_type == "completion":
                        url = f"{base_url}/completion-messages"
                        payload = {
                            "inputs": test_data.get('inputs', {}),
                            "response_mode": "blocking",
                            "user": test_data.get('user', 'api-tester')
                        }
                    else:  # chat default
                        url = f"{base_url}/chat-messages"
                        payload = {
                            "inputs": test_data.get('inputs', {}),
                            "query": test_data.get('query', ''),
                            "response_mode": "blocking",
                            "user": test_data.get('user', 'api-tester')
                        }

                    response = await client.post(url, headers=headers, json=payload)
                    response.raise_for_status()
                    response_data = response.json()

                    return {"success": True, "result": response_data}
                
                elif platform == "coze":
                    if not api_key:
                        return {"success": False, "error": "Coze工具缺少 'api_key'"}
                    base_url = (base_url or "https://api.coze.com/open_api").rstrip('/')
                    bot_id = (endpoint_config.get("app_config") or {}).get("bot_id")
                    if not bot_id:
                        return {"success": False, "error": "Coze工具缺少 'bot_id'"}
                    url = f"{base_url}/v3/chat"
                    payload = {
                        "bot_id": bot_id,
                        "user": test_data.get('user', 'api-tester'),
                        "query": test_data.get('query', ''),
                        "stream": False
                    }
                    headers = {
                        'Authorization': f"Bearer {api_key}",
                        'Content-Type': 'application/json'
                    }
                    response = await client.post(url, headers=headers, json=payload)
                    response.raise_for_status()
                    return {"success": True, "result": response.json()}
                else:
                    return {"success": False, "error": f"不支持在内存中测试的HTTP平台: {platform}", "details": {"platform": platform}}

        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            body_text = e.response.text or ""
            details = {
                "platform": platform,
                "status": status_code,
                "endpoint": (url.replace((base_url or "").rstrip('/'), "") if 'url' in locals() else None),
                "body": body_text[:500]
            }
            err_summary = f"HTTP请求失败，状态码: {status_code}"
            try:
                resp_json = e.response.json()
                if isinstance(resp_json, dict):
                    details["response_json"] = {k: (str(v)[:500] if isinstance(v, str) else v) for k, v in resp_json.items()}
                    if platform == "dify":
                        code = resp_json.get("code")
                        msg = resp_json.get("message")
                        if code == "not_chat_app":
                            details["hint"] = "应用模式不匹配：请改用 /agent/chat 或 /workflows/run 或指定 app_type"
                        if msg:
                            err_summary = f"Dify API 错误：{msg}"
                    elif platform == "coze":
                        msg = resp_json.get("msg")
                        if msg:
                            err_summary = f"Coze API 返回错误：{msg}"
            except Exception:
                pass
            return {"success": False, "error": err_summary, "details": details}
        except ValueError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            base = (base_url or "").rstrip('/')
            details = {
                "platform": platform,
                "endpoint": (url.replace(base, "") if 'url' in locals() else None),
                "error_type": type(e).__name__
            }
            return {"success": False, "error": f"HTTP工具执行异常: {str(e)}", "details": details}

    async def _execute_mcp_in_memory(
        self, 
        db: AsyncSession, 
        tool_config: dict, 
        test_data: dict, 
        current_user: "User"
    ) -> dict:
        """在内存中执行MCP工具的辅助方法"""
        server_name = tool_config.get("server_name")
        if not server_name:
            return {"success": False, "error": "MCP工具缺少server_name"}

        # 模拟MCP会话和执行
        try:
            # 这是一个简化的模拟，实际情况会更复杂
            session_id = f"mem-test-{uuid.uuid4()}"
            logger.info(f"为内存测试创建模拟MCP会话: {session_id}")

            # 模拟调用MCP客户端
            # mcp_client = self.get_mcp_client(server_name)
            # if not mcp_client:
            #     return {"success": False, "error": f"MCP服务器 '{server_name}' 不可用"}

            # 假设MCP客户端有一个可以直接传递配置和数据的测试方法
            # result = await mcp_client.test_tool(tool_config, test_data)
            logger.warning("MCP in-memory execution is not fully implemented.")
            result = {"message": "MCP tool in-memory test placeholder."}

            return {"success": True, "result": result}
        except Exception as e:
            return {"success": False, "error": f"MCP工具执行异常: {str(e)}"}


# 创建服务实例 (如果不需要状态，可以直接使用类方法，或在Controller中实例化)
execute_service = ExecuteService()
