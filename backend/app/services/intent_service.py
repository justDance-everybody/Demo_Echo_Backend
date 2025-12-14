import json
import re
import uuid
from typing import Dict, List, Any, Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from loguru import logger
from app.utils.openai_client import get_openai_client
from app.models.tool import Tool
from app.config import settings
import copy


class IntentService:
    """意图服务，负责解析用户意图并决定是否调用工具"""

    PROMPT_PREFIX = (
        "你是一个智能助手。根据用户请求，判断是否需要调用工具。\n\n"
        "**工作模式**：\n"
        "这是一个多步骤的执行环境。你不需要一次性规划所有步骤。\n"
        "如果任务需要多个工具配合（例如：先查坐标，再搜周边），请先调用**第一个**需要执行的工具。\n"
        "系统会执行你调用的工具，并将结果返回给你，然后你再决定下一步操作。\n\n"
        "**工具选择原则**：\n"
        "1. 仔细阅读每个工具的description，理解其功能\n"
        "2. 检查工具的required参数，判断用户输入是否满足\n"
        "3. **严禁猜测参数**：如果某个参数（如坐标、ID）用户未提供，且无法从上下文中获取，**必须**先调用能获取该参数的前置工具，而不是编造数据。\n\n"
        "**示例（地理搜索）**：\n"
        "用户：'在深圳湾万象天地附近500米找好吃的川菜'\n"
        "思考：周边搜索(maps_around_search)需要location坐标，但我只有地名。\n"
        "行动：先调用 maps_geo({\"address\": \"深圳湾万象天地\"}) 获取坐标。\n"
        "（等待系统返回坐标后，下一轮再调用 maps_around_search）\n\n"
        "**关键规则**：\n"
        "1. **一步一步来**：如果缺参数，先调前置工具。不要试图一次性把所有工具都塞进去，除非它们是独立的。\n"
        "2. **禁止猜测**：绝不编造经纬度、ID等参数，必须通过工具获取\n"
        "3. **闲聊直接回复**：对于问候、常识问答，不调用工具\n"
        "4. **忠实总结**：生成最终回复时，必须完整、准确地呈现工具返回的所有结果，不要编造、减少或省略任何信息。\n\n"
        "用户请求："
    )

    async def _get_available_tools(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """从数据库加载可用工具信息并格式化为 OpenAI tools 参数"""
        # 直接使用传入的 db (AsyncSession)
        result = await db.execute(select(Tool))
        tools = result.scalars().all()

        formatted_tools = []
        for tool in tools:
            try:
                # request_schema 已经是 Python dict 了，直接使用
                raw_params = tool.request_schema
                # 确保 parameters 是 JSON Schema 对象格式 (使用 .get() 更安全)
                if (
                    not isinstance(raw_params, dict)
                    or raw_params.get("type") != "object"
                ):
                    logger.warning(
                        f"工具 {tool.tool_id} 的 request_schema 格式无效 (非 object 类型)，已跳过：{raw_params}"
                    )
                    continue

                # 使用数据库原始 Schema，保持语义可见性与字段原样
                def _trim_examples(obj: Any) -> Any:
                    if isinstance(obj, dict):
                        out = {}
                        for k, v in obj.items():
                            if k == "examples" and isinstance(v, list):
                                out[k] = v[:2]
                            else:
                                out[k] = _trim_examples(v)
                        return out
                    elif isinstance(obj, list):
                        return [_trim_examples(x) for x in obj]
                    else:
                        return obj

                parameters = _trim_examples(copy.deepcopy(raw_params))

                desc = tool.description or ""
                if isinstance(desc, str) and len(desc) > 300:
                    desc = desc[:300]
                
                # 添加response_schema到description，让LLM了解工具的输出格式
                if tool.response_schema:
                    try:
                        # 处理response_schema可能是字符串"null"的情况
                        response_data = tool.response_schema
                        if isinstance(response_data, str):
                            response_data = json.loads(response_data)
                        
                        # 只有当response_data是有效对象(不是None)时才添加
                        if response_data is not None and response_data != "null":
                            output_info = json.dumps(response_data, ensure_ascii=False)
                            desc += f"\n【输出格式】{output_info}"
                    except Exception as e:
                        logger.debug(f"工具 {tool.tool_id} 的 response_schema 处理跳过: {e}")

                formatted_tools.append(
                    {
                        "type": "function",
                        "function": {
                            "name": tool.tool_id,
                            "description": desc,
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

            # 使用类定义的 Prompt 前缀
            messages = [{"role": "user", "content": self.PROMPT_PREFIX + query}]

            logger.debug(f"{log_prefix}调用 LLM 进行意图分析和工具决策...")
            
            # 判断是否使用工具选择专用LLM配置
            use_intent_llm = bool(settings.INTENT_LLM_MODEL and settings.INTENT_LLM_API_BASE)
            
            if use_intent_llm:
                # 使用工具选择专用LLM配置
                llm_model = settings.INTENT_LLM_MODEL
                llm_temperature = settings.INTENT_LLM_TEMPERATURE
                llm_max_tokens = settings.INTENT_LLM_MAX_TOKENS
                logger.info(f"{log_prefix}使用工具选择专用LLM: {llm_model}")
                
                # 创建专用的OpenAI客户端
                from openai import AsyncOpenAI
                intent_api_key = settings.INTENT_LLM_API_KEY or settings.LLM_API_KEY
                client_config = {
                    "api_key": intent_api_key,
                    "base_url": settings.INTENT_LLM_API_BASE,
                    "timeout": float(settings.LLM_TIMEOUT),
                }
                llm_client = AsyncOpenAI(**client_config)
            else:
                # 使用默认LLM配置
                llm_model = settings.LLM_MODEL
                llm_temperature = settings.LLM_TEMPERATURE
                llm_max_tokens = settings.LLM_MAX_TOKENS
                logger.debug(f"{log_prefix}使用默认LLM: {llm_model}")
                
                client = get_openai_client()
                if not client:
                    # LLM不可用时，直接返回无工具回复
                    return {
                        "type": "direct_response",
                        "content": "我可以处理您的请求，当前未连接到LLM服务，您可以直接告诉我需要调用的工具或继续输入问题。",
                        "session_id": session_id,
                    }
                llm_client = client.client
            
            # 构建API调用参数
            api_params = {
                "model": llm_model,
                "messages": messages,
                "temperature": llm_temperature,
                "max_tokens": llm_max_tokens,
            }
            
            # 只有在有可用工具时才添加 tools 和 tool_choice 参数
            if available_tools:
                api_params["tools"] = available_tools
                api_params["tool_choice"] = "auto"  # 让模型自己决定是否调用工具
            
            # ========== 详细调试日志：捕获LLM输入输出 ==========
            logger.info(f"{log_prefix}========== LLM调用详情 ==========")
            logger.info(f"{log_prefix}使用模型: {llm_model}")
            logger.info(f"{log_prefix}Temperature: {llm_temperature}, Max Tokens: {llm_max_tokens}")
            logger.info(f"{log_prefix}提示词内容:\n{messages[0]['content'][:500]}...")
            logger.info(f"{log_prefix}可用工具数量: {len(available_tools) if available_tools else 0}")
            logger.info(f"{log_prefix}========================================")
            
            response = await llm_client.chat.completions.create(**api_params)
            
            # ========== 记录LLM响应 ==========
            logger.info(f"{log_prefix}========== LLM响应详情 ==========")
            logger.info(f"{log_prefix}响应模型: {response.model if hasattr(response, 'model') else 'unknown'}")
            logger.info(f"{log_prefix}响应ID: {response.id if hasattr(response, 'id') else 'unknown'}")

            response_message = response.choices[0].message
            tool_calls = getattr(response_message, "tool_calls", None)
            
            # 记录响应的基本信息
            logger.info(f"{log_prefix}响应类型: {'tool_call' if tool_calls else 'direct_response'}")
            if response_message.content:
                logger.info(f"{log_prefix}响应内容: {response_message.content[:200]}")
            if tool_calls:
                logger.info(f"{log_prefix}工具调用数量: {len(tool_calls)}")
                for idx, call in enumerate(tool_calls):
                    logger.info(f"{log_prefix}  调用{idx+1}: {call.function.name}")
                    logger.info(f"{log_prefix}    参数: {call.function.arguments[:200]}...")
            logger.info(f"{log_prefix}========================================")

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
                    except json.JSONDecodeError as e:
                        logger.warning(
                            f"{log_prefix}JSON解析失败，尝试修复: {call.function.arguments}"
                        )
                        # 尝试修复常见的JSON格式错误
                        fixed_args = self._fix_json_format(call.function.arguments)
                        try:
                            params = json.loads(fixed_args)
                            all_params.append(params)
                            parsed_tool_calls.append(
                                {"tool_id": call.function.name, "parameters": params}
                            )
                            tool_names.append(call.function.name)
                            logger.info(
                                f"{log_prefix}JSON修复成功: {fixed_args}"
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

                # 将工具调用信息存储到会话中，等待用户确认
                if session_id and user_id is not None:
                    await self._store_pending_tools(db, session_id, user_id, parsed_tool_calls, query)

                return {
                    "type": "tool_call",
                    "tool_calls": parsed_tool_calls,
                    "confirm_text": confirm_text_candidate,
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

    def _fix_json_format(self, json_str: str) -> str:
        """
        尝试修复常见的JSON格式错误
        
        Args:
            json_str: 可能有格式错误的JSON字符串
            
        Returns:
            修复后的JSON字符串
        """
        try:
            # 移除首尾空白字符
            json_str = json_str.strip()
            
            # 如果字符串以 { 开头但没有以 } 结尾，尝试添加结束括号
            if json_str.startswith('{') and not json_str.endswith('}'):
                # 检查是否缺少结束的双引号
                if json_str.count('"') % 2 == 1:
                    json_str += '"'
                # 添加结束括号
                json_str += '}'
            
            # 如果字符串以 [ 开头但没有以 ] 结尾，尝试添加结束括号
            elif json_str.startswith('[') and not json_str.endswith(']'):
                # 检查是否缺少结束的双引号
                if json_str.count('"') % 2 == 1:
                    json_str += '"'
                # 添加结束括号
                json_str += ']'
            
            # 修复常见的引号问题
            # 如果有未闭合的引号，尝试修复
            if json_str.count('"') % 2 == 1:
                # 简单情况：在末尾添加引号
                if not json_str.endswith('"') and not json_str.endswith('}') and not json_str.endswith(']'):
                    json_str += '"'
            
            return json_str
            
        except Exception as e:
            logger.warning(f"JSON修复过程中出现异常: {e}")
            return json_str

    def _resolve_dependency(self, params: Any, execution_history: List[Any]) -> Any:
        """
        递归解析参数中的依赖引用 {{$outputs[i].field}}
        
        Args:
            params: 原始参数（可能是 dict, list, str 等）
            execution_history: 之前工具执行结果的列表（只包含 data 部分）
            
        Returns:
            解析后的参数
        """
        if isinstance(params, dict):
            return {k: self._resolve_dependency(v, execution_history) for k, v in params.items()}
        elif isinstance(params, list):
            return [self._resolve_dependency(item, execution_history) for item in params]
        elif isinstance(params, str):
            # 匹配模式: {{$outputs[0].location}}
            # 允许字段名包含字母、数字、下划线和点号（用于嵌套访问）
            pattern = r"\{\{\$outputs\[(\d+)\]\.([a-zA-Z0-9_.]+)\}\}"
            match = re.search(pattern, params)
            if match:
                try:
                    index = int(match.group(1))
                    field_path = match.group(2)
                    
                    if index < len(execution_history):
                        result_data = execution_history[index]
                        # 支持嵌套字段访问，如 location.lat
                        value = result_data
                        found = True
                        
                        for key in field_path.split('.'):
                            if isinstance(value, dict) and key in value:
                                value = value.get(key)
                            else:
                                found = False
                                break
                        
                        if found and value is not None:
                            logger.info(f"解析依赖参数成功: {params} -> {value}")
                            # 如果原始字符串完全就是个占位符，直接返回非字符串类型的值（如数字、对象）
                            if match.span() == (0, len(params)):
                                return value
                            # 否则只替换字符串中的占位符部分（转为字符串拼接）
                            return params.replace(match.group(0), str(value))
                        else:
                            logger.warning(f"依赖字段未找到: {field_path} in output[{index}]")
                    else:
                        logger.warning(f"依赖索引越界: {index}, 历史长度: {len(execution_history)}")
                except Exception as e:
                    logger.warning(f"参数依赖解析异常: {e}")
            return params
        else:
            return params

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
            client = get_openai_client()
            if not client:
                return "您确认要执行这个操作吗？"
            messages = [
                {"role": "system", "content": client.tool_confirmation_prompt},
                {"role": "user", "content": prompt}
            ]
            response = await client.client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=messages,
                temperature=0.3,  # 低温度，保持回复的一致性
                max_tokens=50,    # 限制输出长度，保持简洁
            )
            
            confirmation_text = response.choices[0].message.content.strip()
            
            # 清理可能的编码问题和特殊字符
            confirmation_text = confirmation_text.replace('\\n', ' ').replace('\\t', ' ')
            confirmation_text = ' '.join(confirmation_text.split())  # 规范化空白字符
            
            logger.info(f"生成的确认文本: {confirmation_text}")
            
            # 确保确认文本是一个问句
            if not confirmation_text.endswith("?") and not confirmation_text.endswith("？"):
                confirmation_text += "？"
            
            return confirmation_text
        except Exception as e:
            logger.error(f"生成确认文本失败: {e}")
            # 返回简单的通用确认文本，也使用问句形式
            return "您确认要执行这个操作吗？"

    async def _store_pending_tools(
        self, db: AsyncSession, session_id: str, user_id: int, tool_calls: List[Dict[str, Any]], original_query: str
    ) -> None:
        """
        将待执行的工具信息存储到会话中
        
        Args:
            db: 数据库会话
            session_id: 会话ID
            user_id: 用户ID
            tool_calls: 工具调用列表
            original_query: 用户原始查询
        """
        try:
            from app.models.session import Session
            from app.models.log import Log
            
            # 获取会话
            result = await db.execute(select(Session).where(Session.session_id == session_id))
            session = result.scalars().first()
            
            if session:
                # 更新会话状态为等待确认
                session.status = 'waiting_confirm'
                db.add(session)
                
                # 记录待执行的工具信息到日志中
                tool_info = {
                    "tool_calls": tool_calls,
                    "original_query": original_query
                }
                
                pending_log = Log(
                    session_id=session_id,
                    step='pending_tools',
                    status='waiting',
                    message=json.dumps(tool_info, ensure_ascii=False)
                )
                db.add(pending_log)
                
                await db.commit()
                logger.info(f"[Session: {session_id}] 已存储待执行工具信息")
            else:
                logger.warning(f"[Session: {session_id}] 会话不存在，无法存储工具信息")
                
        except Exception as e:
            logger.error(f"[Session: {session_id}] 存储待执行工具信息失败: {e}")
            await db.rollback()
    
    async def execute_confirmed_tools(
        self, session_id: str, user_id: int, db: AsyncSession
    ) -> Dict[str, Any]:
        """
        执行用户确认的工具，并进入多步骤执行循环 (Agent Loop)。
        """
        try:
            from app.models.session import Session
            from app.models.log import Log
            from app.services.execute_service import ExecuteService
            
            logger.info(f"[Session: {session_id}] 开始执行确认的工具 (进入多步执行模式)")
            
            # 1. 状态检查与日志加载
            result = await db.execute(select(Session).where(Session.session_id == session_id))
            session = result.scalars().first()
            if not session:
                return {"success": False, "error": "会话不存在"}
            
            log_result = await db.execute(
                select(Log).where(
                    Log.session_id == session_id,
                    Log.step == 'pending_tools',
                    Log.status == 'waiting'
                ).order_by(Log.timestamp.desc())
            )
            pending_log = log_result.scalars().first()
            
            if not pending_log:
                return {"success": False, "error": "未找到待执行的工具信息"}
            
            try:
                tool_info = json.loads(pending_log.message)
                tool_calls = tool_info.get("tool_calls", [])
                original_query = tool_info.get("original_query", "")
            except json.JSONDecodeError:
                return {"success": False, "error": "工具信息格式错误"}
            
            # 更新状态
            session.status = 'executing'
            pending_log.status = 'processing'
            db.add(session)
            db.add(pending_log)
            await db.commit()
            
            # 2. 初始化执行服务和历史记录
            execute_service = ExecuteService()
            all_detailed_results = []
            final_content_parts = []
            
            # 重建初始消息历史 (User Message)
            # 使用 PROMPT_PREFIX + query 作为第一条消息，保持上下文
            messages = [{"role": "user", "content": self.PROMPT_PREFIX + original_query}]
            
            # 3. 执行第一批确认的工具 (Phase 1)
            # 为了放入历史记录，我们需要为这批工具生成 synthetic call_ids
            # 因为数据库里没有存 OpenAI 原始的 call_id
            
            assistant_tool_calls = []
            phase1_results = []
            
            logger.info(f"[Session: {session_id}] Phase 1: 执行初始确认工具 ({len(tool_calls)}个)")
            
            for tool_call in tool_calls:
                tool_id = tool_call.get("tool_id")
                parameters = tool_call.get("parameters", {})
                synthetic_id = f"call_{uuid.uuid4().hex[:8]}"
                
                # 记录到 Assistant Message 中
                assistant_tool_calls.append({
                    "id": synthetic_id,
                    "type": "function",
                    "function": {
                        "name": tool_id,
                        "arguments": json.dumps(parameters, ensure_ascii=False)
                    }
                })
                
                # 执行
                result = await execute_service.execute_tool(
                    tool_id=tool_id,
                    params=parameters,
                    db=db,
                    session_id=session_id,
                    user_id=user_id,
                    original_query=original_query
                )
                
                phase1_results.append((synthetic_id, result))
                
                # 收集结果用于最终返回
                if result.success:
                    if result.data and result.data.get("tts_message"):
                        final_content_parts.append(result.data.get("tts_message"))
                    else:
                        # 尝试提取可读文本
                        speakable = execute_service._extract_speakable_text(result.data)
                        final_content_parts.append(speakable)
                
                all_detailed_results.append({
                    "tool_id": result.tool_id,
                    "success": result.success,
                    "data": result.data
                })

            # 将 Assistant 的调用和 Tool 的结果加入历史
            messages.append({
                "role": "assistant",
                "content": None,
                "tool_calls": assistant_tool_calls
            })
            
            for syn_id, res in phase1_results:
                if res.success:
                    content_str = json.dumps(res.data, ensure_ascii=False) if res.data else "Success"
                else:
                    content_str = f"Error: {json.dumps(res.error, ensure_ascii=False)}" if res.error else "Error: Unknown failure"
                
                messages.append({
                    "role": "tool",
                    "tool_call_id": syn_id,
                    "name": res.tool_id,
                    "content": content_str
                })

            # 4. 进入 Agent Loop (Phase 2)
            # 允许 LLM 根据第一步的结果继续调用工具
            loop_count = 0
            max_loops = 10
            
            client = get_openai_client()
            if not client:
                logger.error("LLM 客户端不可用，无法进入多步循环")
                return {"success": True, "content": "\n".join(final_content_parts), "detailed_results": all_detailed_results}

            available_tools = await self._get_available_tools(db)
            
            while loop_count < max_loops:
                loop_count += 1
                logger.info(f"[Session: {session_id}] Agent Loop: Round {loop_count}")
                
                try:
                    # 调用 LLM
                    api_params = {
                        "model": settings.LLM_MODEL,
                        "messages": messages,
                        "temperature": settings.LLM_TEMPERATURE,
                        "max_tokens": settings.LLM_MAX_TOKENS,
                    }
                    if available_tools:
                        api_params["tools"] = available_tools
                        api_params["tool_choice"] = "auto"
                    
                    response = await client.client.chat.completions.create(**api_params)
                    response_msg = response.choices[0].message
                    
                    # 检查是否需要调用新工具
                    if response_msg.tool_calls:
                        logger.info(f"[Session: {session_id}] Loop {loop_count}: LLM 请求调用 {len(response_msg.tool_calls)} 个新工具")
                        
                        # 将 LLM 的回复 (包含 tool_calls) 加入历史
                        messages.append(response_msg)
                        
                        # 执行新工具
                        for tool_call in response_msg.tool_calls:
                            tool_id = tool_call.function.name
                            try:
                                params = json.loads(tool_call.function.arguments)
                            except Exception:
                                params = {}
                                
                            logger.info(f"[Session: {session_id}] Loop {loop_count} Executing: {tool_id}")
                            
                            result = await execute_service.execute_tool(
                                tool_id=tool_id,
                                params=params,
                                db=db,
                                session_id=session_id,
                                user_id=user_id,
                                original_query=original_query
                            )
                            
                            # 记录结果
                            if result.success:
                                content_str = json.dumps(result.data, ensure_ascii=False) if result.data else "Success"
                            else:
                                content_str = f"Error: {json.dumps(result.error, ensure_ascii=False)}" if result.error else "Error: Unknown failure"

                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call.id,
                                "name": tool_id,
                                "content": content_str
                            })
                            
                            # 收集结果用于最终返回
                            if result.success:
                                # 在多步过程中，我们可能只需要最后一步的 TTS，或者累积？
                                # 策略：累积所有步骤的有意义输出
                                if result.data and result.data.get("tts_message"):
                                    final_content_parts.append(result.data.get("tts_message"))
                                else:
                                    speakable = execute_service._extract_speakable_text(result.data)
                                    final_content_parts.append(speakable)
                            
                            all_detailed_results.append({
                                "tool_id": result.tool_id,
                                "success": result.success,
                                "data": result.data
                            })
                        
                        # 继续循环，将工具结果反馈给 LLM
                        continue
                        
                    else:
                        # LLM 返回纯文本，说明任务结束或需要询问用户
                        final_text = response_msg.content
                        logger.info(f"[Session: {session_id}] Loop {loop_count}: LLM 返回最终文本")
                        
                        # 如果 LLM 给出了总结性回复，优先使用它作为 content
                        if final_text:
                            # 清理一下回复
                            final_content = final_text
                            # 如果我们之前累积了 TTS 消息，可能需要决定是覆盖还是追加
                            # 策略：如果 LLM 做了总结，就用 LLM 的。否则用工具的 TTS 拼接。
                            # 这里选择：返回 LLM 的最终回复。
                            return {
                                "success": True,
                                "content": final_content,
                                "detailed_results": all_detailed_results
                            }
                        else:
                            break
                            
                except Exception as e:
                    logger.error(f"[Session: {session_id}] Loop {loop_count} Error: {e}")
                    # 出错时中断循环，返回已有的结果
                    break
            
            # 循环结束（达到最大次数或出错 break），返回累积的工具输出
            final_summary = "\n\n".join(final_content_parts) if final_content_parts else "执行完成"
            
            # 更新会话状态
            session.status = 'done'
            db.add(session)
            
            success_log = Log(
                session_id=session_id,
                step='execute_confirmed',
                status='success',
                message=json.dumps({
                    "summary": final_summary,
                    "detailed_results": all_detailed_results
                }, ensure_ascii=False)
            )
            db.add(success_log)
            await db.commit()
            
            return {
                "success": True,
                "content": final_summary,
                "detailed_results": all_detailed_results
            }

        except Exception as e:
            logger.exception(f"[Session: {session_id}] 执行确认工具时发生错误: {e}")
            return {
                "success": False,
                "error": f"执行过程中发生意外错误: {str(e)}"
            }


# 创建全局意图服务实例
intent_service = IntentService()
