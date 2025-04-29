import json
from typing import Dict, List, Any, Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from loguru import logger
from app.utils.openai_client import openai_client
from app.models.tool import Tool
from app.config import settings


class IntentService:
    """意图服务，负责解析用户意图并决定是否调用工具"""

    async def _get_available_tools(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """从数据库加载可用工具信息并格式化为 OpenAI tools 参数"""
        # 直接使用传入的 db (AsyncSession)
        result = await db.execute(select(Tool))
        tools = result.scalars().all()

        formatted_tools = []
        for tool in tools:
            try:
                # request_schema 已经是 Python dict 了，直接使用
                parameters = tool.request_schema
                # 确保 parameters 是 JSON Schema 对象格式 (使用 .get() 更安全)
                if (
                    not isinstance(parameters, dict)
                    or parameters.get("type") != "object"
                ):
                    logger.warning(
                        f"工具 {tool.tool_id} 的 request_schema 格式无效 (非 object 类型)，已跳过：{parameters}"
                    )
                    continue

                formatted_tools.append(
                    {
                        "type": "function",
                        "function": {
                            "name": tool.tool_id,  # 使用 tool_id 作为 function name
                            "description": tool.description,
                            "parameters": parameters,
                        },
                    }
                )
            except Exception as e:
                logger.warning(f"处理工具 {tool.tool_id} 时出错: {e}")

        logger.debug(f"加载了 {len(formatted_tools)} 个可用工具。")
        return formatted_tools

    async def process_intent(
        self, query: str, db: AsyncSession, session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        处理用户意图，使用 LLM 判断是否需要调用工具。

        Args:
            query: 用户查询文本。
            db: 异步数据库会话。
            session_id: 可选的会话 ID，用于日志跟踪。

        Returns:
            一个字典，包含处理结果。结构可能为：
            - {'type': 'tool_call', 'tool_calls': [{'tool_id': '...', 'params': {...}}]} : 需要调用工具
            - {'type': 'direct_response', 'content': '...'} : LLM 直接回复，无需工具
            - {'type': 'error', 'message': '...'} : 处理出错
        """
        log_prefix = f"[Session: {session_id}] " if session_id else ""
        logger.info(f"{log_prefix}开始处理意图: {query}")

        try:
            available_tools = await self._get_available_tools(db)

            if not available_tools:
                logger.warning(f"{log_prefix}数据库中没有可用的工具。")
                # 如果没有工具，可以直接让 LLM 回复，或者返回特定错误
                # 这里我们选择让 LLM 尝试直接回复

            # 优化 Prompt: 添加对时间和地点的提醒
            prompt_prefix = (
                "你需要仔细分析用户的查询，理解其意图。"
                "如果用户的查询涉及到特定的操作或信息获取（例如查询天气、获取账户信息、控制设备等），请判断是否需要调用合适的工具来完成。"
                "在判断工具调用时，请务必识别并提取用户查询中的关键实体信息，特别是 **地点 (city/location)** 和 **时间 (date/time，包括相对时间如'今天','明天','后天')**，并将它们准确填充到工具所需的参数中。"
                "如果用户没有明确指定所有必需的参数（比如只说了城市没说日期），也请将其提取出来。\n\n"
                "用户查询如下：\n"
            )
            messages = [{"role": "user", "content": prompt_prefix + query}]

            logger.debug(f"{log_prefix}调用 LLM 进行意图分析和工具决策...")
            response = await openai_client.client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=messages,
                tools=(
                    available_tools if available_tools else None
                ),  # 如果列表为空，不传 tools 参数或传 None
                tool_choice="auto",  # 让模型自己决定是否调用工具
                temperature=settings.LLM_TEMPERATURE,  # 从配置加载
                max_tokens=settings.LLM_MAX_TOKENS,  # 从配置加载
            )

            response_message = response.choices[0].message
            tool_calls = getattr(response_message, "tool_calls", None)

            if tool_calls:
                # 尝试从 LLM 的主要回复内容获取 confirmText
                confirm_text_candidate = (
                    response_message.content
                    or f"好的，我需要调用 {', '.join([call.function.name for call in tool_calls])} 来处理您的请求。"
                )
                logger.info(
                    f"{log_prefix}LLM 决定调用工具: {[call.function.name for call in tool_calls]}"
                )
                logger.info(f"{log_prefix}初步确认文本: {confirm_text_candidate}")
                parsed_tool_calls = []
                for call in tool_calls:
                    try:
                        params = json.loads(call.function.arguments)
                        parsed_tool_calls.append(
                            {"tool_id": call.function.name, "parameters": params}
                        )
                    except json.JSONDecodeError:
                        logger.error(
                            f"{log_prefix}无法解析工具 {call.function.name} 的参数: {call.function.arguments}"
                        )
                        return {
                            "type": "error",
                            "message": f"无法解析工具 {call.function.name} 的参数",
                            "session_id": session_id,
                        }

                return {
                    "type": "tool_call",
                    "tool_calls": parsed_tool_calls,
                    "confirmText": confirm_text_candidate,
                    "session_id": session_id,
                }
            else:
                content = response_message.content or ""
                logger.info(f"{log_prefix}LLM 直接回复，无需调用工具。")
                return {
                    "type": "direct_response",
                    "content": content,
                    "session_id": session_id,
                }

        except Exception as e:
            logger.exception(f"{log_prefix}处理意图时发生意外错误: {e}")
            return {
                "type": "error",
                "message": f"处理意图时发生意外错误: {str(e)}",
                "session_id": session_id,
            }

    # 移除或注释掉不再需要的 get_tool_executions 方法
    # async def get_tool_executions(self, intent_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    #     ...


# 创建全局意图服务实例
intent_service = IntentService()
