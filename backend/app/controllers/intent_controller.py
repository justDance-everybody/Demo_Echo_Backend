from loguru import logger
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.services.intent_service import intent_service

# 导入新的请求和响应模型
from app.schemas.intent import (
    IntentRequest,
    ToolCall,
    InterpretToolCallResponse,
    InterpretDirectResponse,
    InterpretSuccessResponse,
)

# 定义统一的成功响应类型 (已移动到 schema 文件)
# InterpretSuccessResponse = Union[InterpretToolCallResponse, InterpretDirectResponse]


class IntentController:
    """意图控制器"""

    # @stable(tested=2025-04-30, test_script=backend/test_api.py)
    async def process_intent(
        self, request: IntentRequest, db: AsyncSession
    ) -> InterpretSuccessResponse:
        """
        处理用户意图

        Args:
            request: 意图请求
            db: 数据库会话

        Returns:
            成功时返回 InterpretToolCallResponse 或 InterpretDirectResponse
            失败时抛出 HTTPException
        """
        try:
            # 如果没有session_id，生成一个新的
            session_id = request.session_id
            if not session_id:
                session_id = str(uuid.uuid4())
                logger.info(f"[Session: {session_id}] 生成新的会话ID")
            
            # 获取并验证user_id，确保不为None
            user_id = request.user_id
            if user_id is None:
                logger.warning(f"[Session: {session_id}] 请求中未提供user_id，使用默认值1")
                user_id = 1  # 使用默认用户ID
            
            logger.info(f"[Session: {session_id}] 收到意图处理请求: {request.query}, 用户ID: {user_id}")

            # 调用服务层处理意图，传入 session_id、user_id 和 db
            service_result = await intent_service.process_intent(
                request.query, db=db, session_id=session_id, user_id=user_id
            )

            result_type = service_result.get("type")

            if result_type == "tool_call":
                logger.info(f"[Session: {session_id}] 意图处理结果: 需要调用工具")
                # 确保 tool_calls 存在且是列表
                tool_calls_data = service_result.get("tool_calls", [])
                confirm_text = service_result.get("confirmText")
                # 始终优先使用我们生成或从请求获取的session_id
                returned_session_id = session_id
                if not isinstance(tool_calls_data, list):
                    raise ValueError("服务返回的 tool_calls 格式不正确")

                # 验证并构造 ToolCall 列表 (Pydantic 会自动验证)
                validated_tool_calls = [ToolCall(**call) for call in tool_calls_data]

                # 创建响应对象
                response = InterpretToolCallResponse(
                    tool_calls=validated_tool_calls,
                    confirmText=confirm_text,
                    sessionId=returned_session_id,  # 使用sessionId作为字段名
                )
                return response

            elif result_type == "direct_response":
                content = service_result.get("content", "")
                # 始终优先使用我们生成或从请求获取的session_id
                returned_session_id = session_id
                logger.info(f"[Session: {session_id}] 意图处理结果: 直接回复")
                
                # 增加调试日志，确认session_id值
                logger.debug(f"[Session: {session_id}] 准备返回的session_id: {returned_session_id}")
                
                # 创建响应对象，使用sessionId作为字段名
                response = InterpretDirectResponse(
                    content=content, 
                    sessionId=returned_session_id  # 使用sessionId作为字段名
                )
                return response

            elif result_type == "error":
                error_message = service_result.get(
                    "message", "意图服务处理失败，未提供具体信息"
                )
                logger.error(
                    f"[Session: {session_id}] 意图服务处理失败: {error_message}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"意图处理失败: {error_message}",
                )
            else:
                # 未知的结果类型
                logger.error(
                    f"[Session: {session_id}] 意图服务返回未知类型: {result_type}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="意图处理返回未知结果类型",
                )

        except HTTPException as http_exc:
            # 直接重新抛出已知的 HTTP 异常
            raise http_exc
        except Exception as e:
            session_id = request.session_id if hasattr(request, "session_id") else "N/A"
            logger.exception(f"[Session: {session_id}] 处理意图请求时发生意外错误: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"处理意图请求时发生意外错误: {str(e)}",
            )


# 创建全局意图控制器实例
intent_controller = IntentController()
