import json
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

            # 通用提示词，不包含任何具体工具名称，适配动态工具集
            prompt_prefix = (
                "你是一个智能助手。根据用户请求，判断是否需要调用工具。\n\n"
                "**工具选择原则**：\n"
                "1. 仔细阅读每个工具的description，理解其功能\n"
                "2. 检查工具的required参数，判断用户输入是否满足\n"
                "3. 查看工具的【输出格式】，了解它返回什么数据\n\n"
                "**链式调用逻辑**：\n"
                "- 如果目标工具的必需参数在用户输入中不存在\n"
                "- 查找能产生该参数的前置工具（通过对比输出格式和参数名）\n"
                "- 一次返回完整工具链，按依赖顺序排列\n"
                "- 确保链条末端是能直接满足用户需求的工具\n\n"
                "**对于闲聊、问候、常识问答，直接回复，不调用工具。**\n\n"
                "当决定调用工具时，请生成简洁的确认文本，以问句形式复述用户的核心需求。\n\n"
                "用户请求："
            )
            messages = [{"role": "user", "content": prompt_prefix + query}]

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
            if available_tools and len(available_tools) > 0:
                # 只记录前3个工具的详细信息
                for idx, tool in enumerate(available_tools[:3]):
                    tool_name = tool.get('function', {}).get('name', 'unknown')
                    tool_desc = tool.get('function', {}).get('description', '')[:100]
                    tool_params = tool.get('function', {}).get('parameters', {})
                    required_params = tool_params.get('required', [])
                    logger.info(f"{log_prefix}  工具{idx+1}: {tool_name}")
                    logger.info(f"{log_prefix}    描述: {tool_desc}...")
                    logger.info(f"{log_prefix}    必需参数: {required_params}")
                if len(available_tools) > 3:
                    logger.info(f"{log_prefix}  ... 还有 {len(available_tools) - 3} 个工具")
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
        执行用户确认的工具
        
        Args:
            session_id: 会话ID
            user_id: 用户ID
            db: 数据库会话
            
        Returns:
            执行结果字典
        """
        try:
            from app.models.session import Session
            from app.models.log import Log
            from app.services.execute_service import ExecuteService
            
            logger.info(f"[Session: {session_id}] 开始执行确认的工具")
            
            # 获取会话
            result = await db.execute(select(Session).where(Session.session_id == session_id))
            session = result.scalars().first()
            
            if not session:
                return {
                    "success": False,
                    "error": "会话不存在"
                }
            
            # 获取待执行的工具信息
            log_result = await db.execute(
                select(Log).where(
                    Log.session_id == session_id,
                    Log.step == 'pending_tools',
                    Log.status == 'waiting'
                ).order_by(Log.timestamp.desc())
            )
            pending_log = log_result.scalars().first()
            
            if not pending_log:
                return {
                    "success": False,
                    "error": "未找到待执行的工具信息"
                }
            
            # 解析工具信息
            try:
                tool_info = json.loads(pending_log.message)
                tool_calls = tool_info.get("tool_calls", [])
                original_query = tool_info.get("original_query", "")
            except json.JSONDecodeError:
                return {
                    "success": False,
                    "error": "工具信息格式错误"
                }
            
            if not tool_calls:
                return {
                    "success": False,
                    "error": "没有待执行的工具"
                }
            
            # 更新会话状态为执行中
            session.status = 'executing'
            db.add(session)
            
            # 更新待执行日志状态
            pending_log.status = 'processing'
            db.add(pending_log)
            
            await db.commit()
            
            # 执行工具
            execute_service = ExecuteService()
            results = []
            all_success = True
            
            for tool_call in tool_calls:
                tool_id = tool_call.get("tool_id")
                parameters = tool_call.get("parameters", {})
                
                logger.info(f"[Session: {session_id}] 执行工具: {tool_id}")
                
                result = await execute_service.execute_tool(
                    tool_id=tool_id,
                    params=parameters,
                    db=db,
                    session_id=session_id,
                    user_id=user_id,
                    original_query=original_query
                )
                
                results.append(result)
                if not result.success:
                    all_success = False
                    logger.error(f"[Session: {session_id}] 工具 {tool_id} 执行失败: {result.error}")
            
            # 汇总结果
            if all_success:
                # 提取所有成功结果的内容
                content_parts = []
                detailed_results = []
                
                for result in results:
                    logger.debug(f"[Session: {session_id}] 处理工具结果: tool_id={result.tool_id}, success={result.success}, data={result.data}")
                    if result.data:
                        tts = result.data.get("tts_message")
                        if tts:
                            content_parts.append(tts)
                            logger.debug(f"[Session: {session_id}] 使用 tts_message: {tts}")
                        else:
                            # 当缺失 tts_message 时，使用执行层的提取与改写方法生成
                            try:
                                from app.services.execute_service import ExecuteService
                                es = ExecuteService()
                                speakable = es._extract_speakable_text(result.data)
                                try:
                                    safe_tts = await es._faithful_tts({}, speakable)
                                    content_parts.append(safe_tts)
                                    logger.debug(f"[Session: {session_id}] 补齐 tts_message: {safe_tts}")
                                except Exception:
                                    # LLM 不可用或改写失败时，直接使用提取后的可播报文本
                                    content_parts.append(speakable)
                                    logger.debug(f"[Session: {session_id}] 使用提取后的文本作为播报: {speakable}")
                            except Exception as e:
                                # 仅在无法提取时，最后兜底为字符串化
                                data_str = str(result.data)
                                content_parts.append(data_str)
                                logger.warning(f"[Session: {session_id}] 兜底使用字符串化数据: {data_str}，原因: {e}")
                        detailed_results.append({
                            "tool_id": result.tool_id,
                            "success": result.success,
                            "data": result.data
                        })
                    else:
                        logger.warning(f"[Session: {session_id}] 工具 {result.tool_id} 返回的 data 为空")
                
                final_content = "\n\n".join(content_parts) if content_parts else "操作执行成功"
                logger.info(f"[Session: {session_id}] 汇总结果: content_parts={content_parts}, final_content={final_content}")
                
                # 更新会话状态为完成
                session.status = 'done'
                db.add(session)
                
                # 记录成功日志，包含详细结果
                success_log = Log(
                    session_id=session_id,
                    step='execute_confirmed',
                    status='success',
                    message=json.dumps({
                        "summary": final_content,
                        "detailed_results": detailed_results
                    }, ensure_ascii=False)
                )
                db.add(success_log)
                
                await db.commit()
                
                logger.info(f"[Session: {session_id}] 所有工具执行成功，返回详细结果")
                return {
                    "success": True,
                    "content": final_content,
                    "detailed_results": detailed_results
                }
            else:
                # 部分或全部失败
                error_messages = []
                for result in results:
                    if not result.success and result.error:
                        if isinstance(result.error, dict):
                            error_messages.append(result.error.get("message", "执行失败"))
                        else:
                            error_messages.append(str(result.error))
                
                error_content = "执行过程中出现错误: " + "; ".join(error_messages)
                
                # 更新会话状态为错误
                session.status = 'error'
                db.add(session)
                
                # 记录错误日志
                error_log = Log(
                    session_id=session_id,
                    step='execute_confirmed',
                    status='error',
                    message=error_content
                )
                db.add(error_log)
                
                await db.commit()
                
                logger.error(f"[Session: {session_id}] 工具执行失败")
                return {
                    "success": False,
                    "error": error_content
                }
                
        except Exception as e:
            logger.exception(f"[Session: {session_id}] 执行确认工具时发生错误: {e}")
            
            # 更新会话状态为错误
            try:
                result = await db.execute(select(Session).where(Session.session_id == session_id))
                session = result.scalars().first()
                if session:
                    session.status = 'error'
                    db.add(session)
                    await db.commit()
            except Exception:
                pass
            
            return {
                "success": False,
                "error": f"执行过程中发生意外错误: {str(e)}"
            }


# 创建全局意图服务实例
intent_service = IntentService()
