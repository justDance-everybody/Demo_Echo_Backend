"""统一执行服务 - 重构execute和confirm接口的核心逻辑

这个服务将统一处理工具执行和确认执行的逻辑，解决以下问题：
1. session_id为null的问题
2. 执行路径不一致
3. 数据库会话冲突
4. 响应超时处理
"""

import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from contextlib import asynccontextmanager

from app.models.session import Session
from app.models.log import Log
from app.services.execute_service import ExecuteService
from app.services.intent_service import IntentService
from app.schemas.execute import ExecuteRequest, ExecuteResponse
from app.schemas.intent import ConfirmRequest, ConfirmResponse
from loguru import logger

class ExecutionTimeout(Exception):
    """执行超时异常"""
    pass

class SessionManager:
    """会话管理器 - 统一管理会话状态"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_session(self, session_id: Optional[str], user_id: int) -> Tuple[str, Session]:
        """获取或创建会话

        Args:
            session_id: 会话ID，如果为None则创建新会话
            user_id: 用户ID

        Returns:
            Tuple[会话ID, 会话对象]
        """
        if not session_id:
            session_id = str(uuid.uuid4())
            logger.info(f"创建新会话ID: {session_id} for user {user_id}")

        # 尝试获取现有会话
        result = await self.db.execute(
            select(Session).where(Session.session_id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            # 创建新会话
            session = Session(
                session_id=session_id,
                user_id=user_id,
                status="parsing",
                created_at=datetime.utcnow()
            )
            self.db.add(session)
            await self.db.commit()
            await self.db.refresh(session)
            logger.info(f"创建新会话: {session_id}")
        else:
            logger.info(f"使用现有会话: {session_id}, 当前状态: {session.status}")

        return session_id, session

    async def update_session_status(self, session_id: str, status: str, error_message: Optional[str] = None) -> None:
        """更新会话状态

        Args:
            session_id: 会话ID
            status: 新状态
            error_message: 错误信息（可选，仅用于日志记录）
        """
        try:
            update_data = {
                "status": status,
                "updated_at": datetime.utcnow()
            }

            await self.db.execute(
                update(Session)
                .where(Session.session_id == session_id)
                .values(**update_data)
            )
            await self.db.commit()
            logger.info(f"更新会话状态: {session_id} -> {status}")

            # 如果有错误信息，记录到日志中
            if error_message:
                await self.log_operation(session_id, "error", "error", error_message)

        except Exception as e:
            logger.error(f"更新会话状态失败: {session_id}, 错误: {str(e)}")
            await self.db.rollback()
            raise

    async def log_operation(self, session_id: str, step: str, status: str, message: str) -> None:
        """记录操作日志

        Args:
            session_id: 会话ID
            step: 操作步骤
            status: 操作状态
            message: 日志消息
        """
        try:
            log_entry = Log(
                session_id=session_id,
                step=step,
                status=status,
                message=message
            )
            self.db.add(log_entry)
            await self.db.commit()
            logger.debug(f"记录操作日志: {session_id} - {step} - {status}")

        except Exception as e:
            logger.error(f"记录操作日志失败: {session_id}, 错误: {str(e)}")
            # 日志记录失败不应该影响主流程
            await self.db.rollback()

class UnifiedExecutionService:
    """统一执行服务

    整合execute和confirm接口的核心逻辑，提供统一的执行入口
    """

    def __init__(self):
        self.execute_service = ExecuteService()
        self.intent_service = IntentService()
        self.execution_timeout = 120  # 120秒超时

    @asynccontextmanager
    async def get_session_manager(self, db: AsyncSession):
        """获取会话管理器的上下文管理器"""
        session_manager = SessionManager(db)
        try:
            yield session_manager
        except Exception as e:
            logger.error(f"会话管理器操作失败: {str(e)}")
            await db.rollback()
            raise

    async def execute_tool_unified(self, request: ExecuteRequest, db: AsyncSession, user_id: int) -> ExecuteResponse:
        """统一的工具执行接口

        这是execute接口的新实现，解决了原有的session_id和超时问题

        Args:
            request: 执行请求
            db: 数据库会话
            user_id: 用户ID

        Returns:
            执行响应
        """
        async with self.get_session_manager(db) as session_manager:
            try:
                # 1. 获取或创建会话
                session_id, session = await session_manager.get_or_create_session(
                    request.session_id, user_id
                )

                # 2. 记录开始执行
                await session_manager.log_operation(
                    session_id, "execute", "start", f"开始执行工具: {request.tool_id}"
                )

                # 3. 更新会话状态为执行中
                await session_manager.update_session_status(session_id, "executing")

                # 4. 执行工具（带超时控制）
                try:
                    result = await asyncio.wait_for(
                        self.execute_service.execute_tool(
                            tool_id=request.tool_id,
                            params=request.params,
                            session_id=session_id,
                            user_id=user_id,
                            db=db
                        ),
                        timeout=self.execution_timeout
                    )

                    # 5. 检查execute_service的执行结果
                    if hasattr(result, 'success') and result.success:
                        # 执行成功
                        await session_manager.update_session_status(session_id, "completed")
                        await session_manager.log_operation(
                            session_id, "execute", "success", "工具执行成功"
                        )

                        # 构造成功响应
                        response_data = {
                            "tool_id": request.tool_id,
                            "success": True,
                            "data": result.data if hasattr(result, 'data') else {},
                            "error": None,
                            "session_id": session_id
                        }

                        logger.info(f"工具执行成功: {session_id}, 工具: {request.tool_id}")
                        return ExecuteResponse(**response_data)
                    else:
                        # 执行失败
                        error_info = result.error if hasattr(result, 'error') else {"code": "UNKNOWN_ERROR", "message": "工具执行失败"}
                        await session_manager.update_session_status(session_id, "error", str(error_info))
                        await session_manager.log_operation(
                            session_id, "execute", "error", f"工具执行失败: {error_info}"
                        )

                        # 构造失败响应
                        response_data = {
                            "tool_id": request.tool_id,
                            "success": False,
                            "data": None,
                            "error": error_info,
                            "session_id": session_id
                        }

                        logger.error(f"工具执行失败: {session_id}, 工具: {request.tool_id}, 错误: {error_info}")
                        return ExecuteResponse(**response_data)

                except asyncio.TimeoutError:
                    error_msg = f"工具执行超时 ({self.execution_timeout}秒)"
                    await session_manager.update_session_status(session_id, "error", error_msg)
                    await session_manager.log_operation(
                        session_id, "execute", "error", error_msg
                    )
                    raise ExecutionTimeout(error_msg)

                except Exception as e:
                    error_msg = f"工具执行失败: {str(e)}"
                    await session_manager.update_session_status(session_id, "error", error_msg)
                    await session_manager.log_operation(
                        session_id, "execute", "error", error_msg
                    )
                    raise

            except Exception as e:
                logger.error(f"统一执行服务失败: {str(e)}")
                # 确保即使出错也返回sessionId
                if 'session_id' in locals():
                    raise Exception(f"执行失败: {str(e)} (sessionId: {session_id})")
                else:
                    raise Exception(f"执行失败: {str(e)}")

    async def _analyze_user_confirmation_intent(self, user_input: str) -> bool:
        """分析用户输入是否表达确认意图

        Args:
            user_input: 用户的自然语言输入

        Returns:
            bool: True表示确认，False表示拒绝或其他意图
        """
        try:
            # 先进行简单的关键词匹配，提高效率和准确性
            user_input_lower = user_input.lower().strip()

            # 明确的确认词
            confirm_keywords = ['y', 'yes', '是', '好', '确认', '同意', '可以', '行', 'ok', '执行', '继续']
            # 明确的拒绝词
            reject_keywords = ['n', 'no', '否', '不', '取消', '拒绝', '不要', '停止']

            # 检查是否为明确的确认或拒绝
            if user_input_lower in confirm_keywords:
                logger.info(f"用户输入意图分析结果(关键词匹配): {user_input} -> 确认")
                return True
            elif user_input_lower in reject_keywords:
                logger.info(f"用户输入意图分析结果(关键词匹配): {user_input} -> 拒绝")
                return False

            # 如果不是简单关键词，使用大模型分析
            from app.utils.openai_client import openai_client
            from app.config import settings

            # 构建提示词，让大模型判断用户意图
            prompt = f"""请分析用户的输入是否表达了确认/同意的意图。

用户输入："{user_input}"

判断规则：
1. 如果用户表达了确认、同意、继续、执行等意图，包括但不限于：
   - 简单确认：y, yes, 是, 好, 确认, 同意, 可以, 行, ok, OK
   - 完整表达：我确认, 我同意, 继续执行, 开始执行等
   返回"确认"
2. 如果用户表达了拒绝、取消、不要等意图，包括：
   - 简单拒绝：n, no, 否, 不, 取消, 拒绝
   - 完整表达：我不同意, 取消执行, 不要执行等
   返回"拒绝"
3. 如果用户提出了新的问题或要求，返回"重新开始"
4. 如果意图不明确，返回"不明确"

请只返回以下四个选项之一：确认、拒绝、重新开始、不明确"""

            messages = [
                {"role": "user", "content": prompt}
            ]

            response = await openai_client.client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=messages,
                temperature=0.1,  # 低温度确保一致性
                max_tokens=10     # 限制输出长度
            )

            result = response.choices[0].message.content.strip()
            logger.info(f"用户输入意图分析结果(大模型): {user_input} -> {result}")

            # 根据分析结果返回布尔值
            if "确认" in result:
                return True
            else:
                return False

        except Exception as e:
            logger.error(f"分析用户确认意图失败: {e}")
            # 出错时默认返回False，要求用户重新输入
            return False

    async def confirm_and_execute_unified(self, request: ConfirmRequest, db: AsyncSession, user_id: int) -> ConfirmResponse:
        """统一的确认执行接口

        这是confirm接口的新实现，通过统一执行路径处理确认逻辑

        Args:
            request: 确认请求
            db: 数据库会话
            user_id: 用户ID

        Returns:
            确认响应
        """
        async with self.get_session_manager(db) as session_manager:
            try:
                session_id = request.session_id
                if not session_id:
                    raise ValueError("确认请求必须包含有效的session_id")

                # 1. 使用大模型分析用户输入意图
                is_confirmed = await self._analyze_user_confirmation_intent(request.user_input)

                # 2. 记录确认操作
                await session_manager.log_operation(
                    session_id, "confirm", "start",
                    f"用户输入: {request.user_input}, 分析结果: {'确认' if is_confirmed else '拒绝/其他'}"
                )

                if not is_confirmed:
                    # 用户取消操作或提出新需求，回到用户指令获取环节
                    await session_manager.update_session_status(session_id, "cancelled")
                    await session_manager.log_operation(
                        session_id, "confirm", "cancelled", "用户取消操作或提出新需求"
                    )

                    return ConfirmResponse(
                        session_id=session_id,
                        success=True,
                        content="请重新告诉我您需要什么帮助",
                        error=None
                    )

                # 3. 用户确认执行，更新会话状态
                await session_manager.update_session_status(session_id, "confirmed")

                # 4. 调用intent_service执行确认的工具
                try:
                    result = await asyncio.wait_for(
                        self.intent_service.execute_confirmed_tools(
                            session_id=session_id,
                            user_id=user_id,
                            db=db
                        ),
                        timeout=self.execution_timeout
                    )

                    # 5. 更新会话状态为完成
                    await session_manager.update_session_status(session_id, "completed")

                    # 6. 记录执行成功
                    await session_manager.log_operation(
                        session_id, "confirm", "success", "确认执行成功"
                    )

                    # 7. 构造响应
                    # 检查工具执行是否真正成功
                    execution_success = result.get("success", False)

                    if execution_success:
                        # 执行成功，提取内容
                        content = result.get("content", "执行完成")

                        # 添加调试日志
                        logger.info(f"[Session: {session_id}] 执行结果: success={execution_success}, content长度={len(str(content))}")
                        logger.debug(f"[Session: {session_id}] 完整执行结果: {result}")

                        # 如果 content 为空或者是默认值，尝试从 detailed_results 中提取
                        if not content or content == "执行完成":
                            detailed_results = result.get("detailed_results", [])
                            if detailed_results:
                                content_parts = []
                                for detail in detailed_results:
                                    if detail.get("data") and detail["data"].get("tts_message"):
                                        content_parts.append(detail["data"]["tts_message"])
                                if content_parts:
                                    content = "\n\n".join(content_parts)
                                    logger.info(f"[Session: {session_id}] 从 detailed_results 中提取到内容: {content}")

                        response_data = {
                            "session_id": session_id,
                            "success": True,
                            "content": content,
                            "error": None
                        }

                        logger.info(f"确认执行成功: {session_id}")
                        return ConfirmResponse(**response_data)
                    else:
                        # 执行失败，返回错误信息
                        error_msg = result.get("error", "工具执行失败")
                        logger.error(f"[Session: {session_id}] 工具执行失败: {error_msg}")

                        await session_manager.update_session_status(session_id, "error", error_msg)
                        await session_manager.log_operation(
                            session_id, "confirm", "error", error_msg
                        )

                        return ConfirmResponse(
                            session_id=session_id,
                            success=False,
                            content=None,
                            error=error_msg
                        )

                except asyncio.TimeoutError:
                    error_msg = f"确认执行超时 ({self.execution_timeout}秒)"
                    await session_manager.update_session_status(session_id, "error", error_msg)
                    await session_manager.log_operation(
                        session_id, "confirm", "error", error_msg
                    )

                    return ConfirmResponse(
                        session_id=session_id,
                        success=False,
                        content=None,
                        error=error_msg
                    )

                except Exception as e:
                    error_msg = f"确认执行失败: {str(e)}"
                    await session_manager.update_session_status(session_id, "error", error_msg)
                    await session_manager.log_operation(
                        session_id, "confirm", "error", error_msg
                    )

                    return ConfirmResponse(
                        session_id=session_id,
                        success=False,
                        content=None,
                        error=error_msg
                    )

            except Exception as e:
                logger.error(f"统一确认服务失败: {str(e)}")
                return ConfirmResponse(
                    session_id=request.session_id,
                    success=False,
                    content=None,
                    error=f"确认执行失败: {str(e)}"
                )

    async def cleanup_expired_sessions(self, db: AsyncSession, hours: int = 24) -> int:
        """清理过期会话

        Args:
            db: 数据库会话
            hours: 过期时间（小时）

        Returns:
            清理的会话数量
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)

            # 查找过期会话
            result = await db.execute(
                select(Session).where(
                    Session.updated_at < cutoff_time,
                    Session.status.in_(["completed", "error", "cancelled"])
                )
            )
            expired_sessions = result.scalars().all()

            # 删除过期会话
            for session in expired_sessions:
                await db.delete(session)

            await db.commit()

            count = len(expired_sessions)
            logger.info(f"清理了 {count} 个过期会话")
            return count

        except Exception as e:
            logger.error(f"清理过期会话失败: {str(e)}")
            await db.rollback()
            return 0

# 全局实例
unified_execution_service = UnifiedExecutionService()
