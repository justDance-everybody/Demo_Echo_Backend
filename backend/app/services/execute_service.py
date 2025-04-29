from typing import Dict, Any, Optional
from loguru import logger
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx  # 导入 httpx

from app.utils.mcp_client import mcp_client
from app.schemas.execute import ExecuteResponse

# 可以在这里导入 Session, Log 模型用于数据库操作
# from app.models.session import Session
# from app.models.log import Log
# from app.utils.db import db_session
from app.models.tool import Tool
from app.utils.openai_client import openai_client
from app.config import settings  # 导入 settings 以获取模型名称等


class ExecuteService:
    """处理工具执行请求的服务"""

    async def execute_tool(
        self,
        tool_id: str,
        params: Dict[str, Any],
        db: AsyncSession,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
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

        # 可以在这里添加数据库日志记录：记录执行尝试
        # if session_id:
        #     Log.create(session_id=session_id, step='execute_start', status='processing', message=f"Executing tool: {tool_id}")
        #     session = Session.get(session_id)
        #     if session: session.status = 'executing'
        #     db_session.commit()

        try:
            # 1. 查询数据库获取工具信息
            result = await db.execute(select(Tool).where(Tool.tool_id == tool_id))
            tool: Optional[Tool] = result.scalars().first()

            if not tool:
                logger.error(f"服务层：未找到工具: tool_id={tool_id}")
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

            # 2. 根据工具类型决定执行方式
            if tool.type == "mcp":
                # 2.1 执行 MCP 工具
                target_server = tool.server_name
                if not target_server:
                    logger.error(f"服务层：MCP工具 '{tool_id}' 未配置 server_name")
                    return ExecuteResponse(
                        tool_id=tool_id,
                        success=False,
                        data=None,
                        error={
                            "code": "MCP_SERVER_NOT_CONFIGURED",
                            "message": f"MCP工具 '{tool_id}' 未配置目标服务器",
                        },
                        session_id=session_id,
                    )

                logger.info(
                    f"服务层：准备调用 MCP 工具 '{tool_id}' on server '{target_server}'"
                )
                mcp_result = await mcp_client.execute_tool(
                    tool_id=tool_id, params=params, target_server=target_server
                )

                # 检查MCP客户端返回的结果结构
                if mcp_result.get("success"):
                    raw_result = mcp_result.get("result", {}).get("message", "")
                    # --- [修改开始] 调用 LLM 总结 ---
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
                                model=settings.LLM_MODEL,  # 使用主 LLM 模型
                                messages=[{"role": "user", "content": summary_prompt}],
                                temperature=0.2,  # 总结任务温度可以低一些
                                max_tokens=250,  # 限制总结长度
                            )
                        )
                        tts_message = summary_response.choices[
                            0
                        ].message.content.strip()
                        logger.info(f"LLM 成功总结了 MCP 工具 '{tool_id}' 的结果。")
                    except Exception as llm_err:
                        logger.error(
                            f"调用 LLM 总结 MCP 工具 '{tool_id}' 结果时出错: {llm_err}，将返回通用成功消息。",
                            exc_info=True,
                        )
                        tts_message = f"已成功执行工具 {tool_id}。"
                    # --- [修改结束] ---

                    # 修改响应结构，使用 data 字段
                    response_data = {"tts_message": tts_message}
                    response = ExecuteResponse(
                        tool_id=tool_id,
                        success=True,
                        data=response_data,
                        error=None,
                        session_id=session_id,  # 确保 session_id 被包含
                    )
                    logger.info(f"服务层：MCP 工具执行成功: tool_id={tool_id}")
                    # 可以在这里添加数据库日志记录：记录执行成功
                    # if session_id:
                    #     Log.create(session_id=session_id, step='execute_end', status='success', message=success_result.message)
                    #     if session: session.status = 'done' # 或根据业务逻辑设置状态
                    #     db_session.commit()
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
                        session_id=session_id,  # 确保 session_id 被包含
                    )
                    logger.warning(
                        f"服务层：MCP 工具执行失败 (MCP client error): tool_id={tool_id}, error={error_info}"
                    )
                    # 可以在这里添加数据库日志记录：记录执行失败
                    # if session_id:
                    #     Log.create(session_id=session_id, step='execute_end', status='error', message=error_info.get('message'))
                    #     if session: session.status = 'error'
                    #     db_session.commit()

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

                # 准备调用外部 HTTP API
                async with httpx.AsyncClient(timeout=30.0) as client:  # 设置默认超时
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

                        else:
                            # 不支持的平台类型
                            logger.error(f"服务层：不支持的 HTTP 工具平台: {platform}")
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
            # 可以在这里添加数据库日志记录：记录系统异常
            # if session_id:
            #     Log.create(session_id=session_id, step='execute_end', status='error', message=f"System Error: {str(e)}")
            #     if session: session.status = 'error'
            #     db_session.commit()

        return response


# 创建服务实例 (如果不需要状态，可以直接使用类方法，或在Controller中实例化)
execute_service = ExecuteService()
