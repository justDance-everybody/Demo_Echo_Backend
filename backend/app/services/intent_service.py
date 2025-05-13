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

    # @stable(tested=2025-04-30, test_script=backend/test_api.py)
    async def process_intent(
        self, query: str, db: AsyncSession, session_id: Optional[str] = None, user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        处理用户意图，使用 LLM 判断是否需要调用工具。

        Args:
            query: 用户查询文本。
            db: 异步数据库会话。
            session_id: 可选的会话 ID，用于日志跟踪。
            user_id: 用户ID，用于关联会话。

        Returns:
            一个字典，包含处理结果。结构可能为：
            - {'type': 'tool_call', 'tool_calls': [{'tool_id': '...', 'params': {...}}]} : 需要调用工具
            - {'type': 'direct_response', 'content': '...'} : LLM 直接回复，无需工具
            - {'type': 'error', 'message': '...'} : 处理出错
        """
        log_prefix = f"[Session: {session_id}] " if session_id else ""
        logger.info(f"{log_prefix}开始处理意图: {query}")

        # 如果提供了用户ID和会话ID，确保数据库中存在对应的会话记录
        if user_id is not None and session_id is not None:
            try:
                from app.models.session import Session
                # 获取或创建会话
                await Session.get_or_create(db=db, session_id=session_id, user_id=user_id)
                logger.debug(f"{log_prefix}已确保数据库中存在会话记录 (user_id: {user_id})")
            except Exception as e:
                logger.error(f"{log_prefix}创建/获取会话记录时出错: {e}")
                # 继续处理，不因数据库操作失败而中断主流程

        try:
            available_tools = await self._get_available_tools(db)

            if not available_tools:
                logger.warning(f"{log_prefix}数据库中没有可用的工具。")
                # 如果没有工具，可以直接让 LLM 回复，或者返回特定错误
                # 这里我们选择让 LLM 尝试直接回复

            # 简化Prompt
            prompt_prefix = (
                "你是一个助手。请判断用户的请求是闲聊还是需要调用工具。"
                "如果需要用工具，直接调用合适的工具；如果是闲聊，直接回复。"
                "\n\n当你决定调用工具时，请同时生成一个简短的确认文本，以问句形式询问用户你的理解是否正确。"
                "确认文本应该简洁地复述用户的请求，包含关键信息（如地点、时间等），并以'您想要...'的方式表述，以问号结尾。"
                "\n用户请求："
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
                # 改进确认文本生成：让LLM生成更自然的确认文本，不限制格式
                # 如果LLM提供了内容，优先使用
                confirm_text_candidate = response_message.content
                
                # 从工具调用中提取名称和参数
                tool_names = []
                parsed_tool_calls = []
                all_params = []
                
                for call in tool_calls:
                    try:
                        tool_names.append(call.function.name)
                        params = json.loads(call.function.arguments)
                        all_params.append(params)
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
                
                # 如果LLM没有提供确认文本或文本为空，则生成确认文本
                if not confirm_text_candidate or confirm_text_candidate.strip() == "":
                    logger.info(f"{log_prefix}LLM未提供确认文本，生成确认文本...")
                    confirm_text_candidate = await self.generate_confirmation_text(
                        query, tool_names, all_params
                    )
                
                logger.info(
                    f"{log_prefix}LLM 决定调用工具: {tool_names}"
                )
                logger.info(f"{log_prefix}确认文本: {confirm_text_candidate}")

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

    async def generate_confirmation_text(
        self, query: str, tool_names: List[str], parameters: List[Dict[str, Any]]
    ) -> str:
        """
        为工具调用生成用户视角的确认文本，复述用户请求
        
        Args:
            query: 用户原始查询
            tool_names: 工具名称列表 (仅用于内部记录)
            parameters: 工具参数列表
            
        Returns:
            用于确认的文本，以用户视角复述原始请求
        """
        try:
            # 提取关键参数，用于帮助LLM更好地理解用户意图
            key_params = {}
            if parameters and len(parameters) > 0:
                for key, value in parameters[0].items():
                    if key in ["city", "location", "date", "time", "query", "content", "event", "keyword"]:
                        key_params[key] = value
            
            # 构建更简化的提示词，专注于用户请求本身
            prompt = (
                f"用户请求: {query}\n"
                f"提取的关键参数: {json.dumps(key_params, ensure_ascii=False)}\n\n"
                f"根据用户的原始请求生成一个简洁的确认问句，复述用户想要完成的事项。不要提及任何工具名称或技术实现细节。"
            )
            
            # 调用LLM生成确认文本
            messages = [
                {"role": "system", "content": openai_client.tool_confirmation_prompt},
                {"role": "user", "content": prompt}
            ]
            
            response = await openai_client.client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=messages,
                temperature=0.3,  # 低温度，保持回复的一致性
                max_tokens=50,    # 限制输出长度，保持简洁
            )
            
            confirmation_text = response.choices[0].message.content.strip()
            logger.info(f"生成的确认文本: {confirmation_text}")
            
            # 确保确认文本是一个问句
            if not confirmation_text.endswith("?") and not confirmation_text.endswith("？"):
                confirmation_text += "？"
            
            return confirmation_text
        except Exception as e:
            logger.error(f"生成确认文本失败: {e}")
            # 返回简单的通用确认文本，也使用问句形式
            return "您确认要执行这个操作吗？"

    # 移除或注释掉不再需要的 get_tool_executions 方法
    # async def get_tool_executions(self, intent_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    #     ...


# 创建全局意图服务实例
intent_service = IntentService()
