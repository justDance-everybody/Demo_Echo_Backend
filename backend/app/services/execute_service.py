from typing import Dict, Any, Optional
from loguru import logger
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx  # 导入 httpx
import json

from app.utils.mcp_client import mcp_client
from app.schemas.execute import ExecuteResponse

# 可以在这里导入 Session, Log 模型用于数据库操作
# from app.models.session import Session
# from app.models.log import Log
# from app.utils.db import db_session
from app.models.session import Session
from app.models.log import Log
from app.models.tool import Tool
from app.utils.openai_client import openai_client
from app.config import settings  # 导入 settings 以获取模型名称等


class ExecuteService:
    """处理工具执行请求的服务"""

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

                # 暂时注释掉连接清理，避免影响测试流程
                # try:
                #     if hasattr(mcp_client, '_connection_pool') and target_server in mcp_client._connection_pool:
                #         await mcp_client._connection_pool[target_server].close()
                #         del mcp_client._connection_pool[target_server]
                #         logger.info(f"✅ 工具执行完毕，已清理MCP连接: {target_server}")
                # except Exception as cleanup_error:
                #     logger.warning(f"⚠️ 清理MCP连接时出错: {cleanup_error}")
                #     # 不影响主流程，继续执行

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
                        summary_response = (
                            await openai_client.client.chat.completions.create(
                                model=settings.LLM_MODEL,
                                messages=[{"role": "user", "content": summary_prompt}],
                                temperature=0.2,
                                max_tokens=250,
                            )
                        )
                        tts_message = summary_response.choices[0].message.content.strip()
                        logger.info(f"LLM 成功总结了 MCP 工具 '{tool_id}' 的结果。")
                    except Exception as llm_err:
                        logger.error(
                            f"调用 LLM 总结 MCP 工具 '{tool_id}' 结果时出错: {llm_err}，将返回通用成功消息。",
                            exc_info=True,
                        )
                        tts_message = f"已成功执行工具 {tool_id}。"

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
                            session.status = 'completed'
                            db.add(session)
                            success_log = Log(session_id=session_id, step='execute_end', status='success', message=tts_message)
                            db.add(success_log)
                            await db.commit()
                            logger.info(f"Updated session {session_id} status to completed and logged success.")
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
                            # --- 实现调用 Dify API 的逻辑 ---
                            dify_url = (
                                base_url or "https://api.dify.ai/v1"
                            ) + "/chat-messages"
                            headers = {
                                "Authorization": f"Bearer {api_key}",
                                "Content-Type": "application/json",
                            }
                            # 从输入参数中获取用户查询，假设 LLM 放入了 'query' 字段
                            user_query = params.get("query", "")
                            if not user_query:
                                logger.warning(
                                    f"调用 Dify 工具 '{tool_id}' 时缺少 'query' 参数"
                                )

                            dify_payload = {
                                "inputs": {},  # 根据 Dify 文档，inputs 在有 conversation_id 时会被忽略
                                "query": user_query,
                                "user": user_id
                                or "echo-backend-user",  # 使用传入的 user_id 或默认值
                                "response_mode": app_config.get(
                                    "response_mode", "blocking"
                                ),  # 默认阻塞模式
                                # MVP 暂时不传递 conversation_id，每次都是新会话
                            }

                            logger.info(
                                f"准备调用 Dify API: URL={dify_url}, Payload={dify_payload}"
                            )
                            response = await client.post(
                                dify_url, headers=headers, json=dify_payload
                            )
                            response.raise_for_status()  # 检查 HTTP 错误 (4xx, 5xx)

                            api_result = response.json()
                            raw_result = api_result.get(
                                "answer", "Dify did not provide an answer."
                            )
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
                                summary_response = (
                                    await openai_client.client.chat.completions.create(
                                        model=settings.LLM_MODEL,
                                        messages=[
                                            {"role": "user", "content": summary_prompt}
                                        ],
                                        temperature=0.2,
                                        max_tokens=150,
                                    )
                                )
                                tts_message = summary_response.choices[
                                    0
                                ].message.content.strip()
                                logger.info(
                                    f"LLM 成功总结了 Dify 工具 '{tool_id}' 的结果。"
                                )
                            except Exception as llm_err:
                                logger.error(
                                    f"调用 LLM 总结 Dify 工具 '{tool_id}' 结果时出错: {llm_err}，将直接使用原始结果。",
                                    exc_info=True,
                                )
                                tts_message = str(raw_result)  # 出错时回退到原始结果
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
                                summary_response = (
                                    await openai_client.client.chat.completions.create(
                                        model=settings.LLM_MODEL,
                                        messages=[
                                            {"role": "user", "content": summary_prompt}
                                        ],
                                        temperature=0.2,
                                        max_tokens=150,
                                    )
                                )
                                tts_message = summary_response.choices[
                                    0
                                ].message.content.strip()
                                logger.info(
                                    f"LLM 成功总结了 Coze 工具 '{tool_id}' 的结果。"
                                )
                            except Exception as llm_err:
                                logger.error(
                                    f"调用 LLM 总结 Coze 工具 '{tool_id}' 结果时出错: {llm_err}，将直接使用原始结果。",
                                    exc_info=True,
                                )
                                tts_message = str(raw_result)  # 出错时回退到原始结果
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

                                # 从响应中提取需要的结果
                                result_path = app_config.get("result_path")
                                if result_path:
                                    # 支持用点号分隔的路径，如"data.items.0.message"
                                    current = api_result
                                    try:
                                        for key in result_path.split('.'):
                                            if key.isdigit():  # 处理数组索引
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

                                # --- [调用 LLM 总结] ---
                                try:
                                    logger.debug(
                                        f"准备调用 LLM 总结通用 HTTP 工具 '{tool_id}' 的结果。"
                                    )
                                    summary_prompt = (
                                        f"你是一个智能助手，需要将以下工具执行的原始结果总结成一段简洁、流畅、适合直接对用户语音播报的话。\n"
                                        f"用户的原始问题(或相关参数)是：{params}\n"
                                        f"工具 '{tool_id}' (HTTP API) 返回的原始结果是：\n```\n{str(raw_result)}\n```\n"
                                        f"请生成总结。"
                                    )
                                    summary_response = (
                                        await openai_client.client.chat.completions.create(
                                            model=settings.LLM_MODEL,
                                            messages=[
                                                {"role": "user", "content": summary_prompt}
                                            ],
                                            temperature=0.2,
                                            max_tokens=150,
                                        )
                                    )
                                    tts_message = summary_response.choices[
                                        0
                                    ].message.content.strip()
                                    logger.info(
                                        f"LLM 成功总结了通用 HTTP 工具 '{tool_id}' 的结果。"
                                    )
                                except Exception as llm_err:
                                    logger.error(
                                        f"调用 LLM 总结通用 HTTP 工具 '{tool_id}' 结果时出错: {llm_err}，将直接使用原始结果。",
                                        exc_info=True,
                                    )
                                    tts_message = str(raw_result)  # 出错时回退到原始结果

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
                        # 处理 HTTP 错误 (4xx, 5xx)
                        error_body = ""
                        try:
                            error_body = e.response.text
                        except Exception:
                            pass  # 忽略读取响应体的错误
                        logger.error(
                            f"调用外部 HTTP API '{platform}' 失败 (HTTP Status {e.response.status_code}): {error_body}",
                            exc_info=False,
                        )
                        return ExecuteResponse(
                            tool_id=tool_id,
                            success=False,
                            data=None,
                            error={
                                "code": f"{platform.upper()}_HTTP_ERROR",
                                "message": f"调用 {platform} API 失败 (Status: {e.response.status_code})",
                                "details": error_body[:500],
                            },  # 限制 details 长度
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


# 创建服务实例 (如果不需要状态，可以直接使用类方法，或在Controller中实例化)
execute_service = ExecuteService()
