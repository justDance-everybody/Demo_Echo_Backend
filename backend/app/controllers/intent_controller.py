from loguru import logger
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.intent_service import intent_service

# 导入新的请求和响应模型
from app.schemas.intent import (
    IntentRequest,
    ToolCall,
    InterpretSuccessResponse,
)


class IntentController:
    """意图控制器"""

    async def process_intent(
        self, request: IntentRequest, db: AsyncSession
    ) -> InterpretSuccessResponse:
        """
        处理用户意图

        Args:
            request: 意图请求
            db: 数据库会话

        Returns:
            成功时返回 InterpretSuccessResponse 
            失败时抛出 HTTPException
        """
        try:
            # 强制使用一个固定的session_id进行测试
            test_session_id = "fixed-session-id-for-testing-7777"
            session_id = test_session_id  # 使用固定的测试ID而非 request.session_id
            logger.info(f"[Session: {session_id}] 收到意图处理请求: {request.query}")

            # 调用服务层处理意图，传入 session_id 和 db
            service_result = await intent_service.process_intent(
                request.query, db=db, session_id=session_id
            )

            result_type = service_result.get("type")
            # 使用固定的测试ID
            returned_session_id = test_session_id

            if result_type == "tool_call":
                logger.info(f"[Session: {session_id}] 意图处理结果: 需要调用工具")
                # 确保 tool_calls 存在且是列表
                tool_calls_data = service_result.get("tool_calls", [])
                confirm_text = service_result.get("confirmText")
                
                if not isinstance(tool_calls_data, list):
                    raise ValueError("服务返回的 tool_calls 格式不正确")

                # 验证并构造 ToolCall 列表 (Pydantic 会自动验证)
                validated_tool_calls = [ToolCall(**call) for call in tool_calls_data]

                # --- [修改] --- 使用新的 InterpretSuccessResponse 模型 ---
                response = InterpretSuccessResponse(
                    type="tool_call",
                    tool_calls=validated_tool_calls,
                    confirmText=confirm_text,
                    session_id=returned_session_id, # 使用固定的测试ID
                )
                # --- [增加日志] ---
                logger.debug(f"控制器：即将返回 InterpretSuccessResponse，session_id 的值: {response.session_id}")
                # --- [增加日志结束] ---
                return response # 直接返回 Pydantic 对象
                # --- [修改结束] ---

            elif result_type == "direct_response":
                content = service_result.get("content", "")
                logger.info(f"[Session: {session_id}] 意图处理结果: 直接回复")
                
                # --- [修改] --- 使用新的 InterpretSuccessResponse 模型 ---
                response = InterpretSuccessResponse(
                    type="direct_response",
                    content=content,
                    session_id=returned_session_id # 使用固定的测试ID
                )
                # --- [增加日志] ---
                logger.debug(f"控制器：即将返回 InterpretSuccessResponse，session_id 的值: {response.session_id}")
                # --- [增加日志结束] ---
                return response # 直接返回 Pydantic 对象
                # --- [修改结束] ---

            elif result_type == "error":
                error_message = service_result.get(
                    "message", "意图服务处理失败，未提供具体信息"
                )
                # returned_session_id = service_result.get("session_id", session_id) # 这行移到上面了
                logger.error(
                    f"[Session: {returned_session_id}] 意图服务处理失败: {error_message}"
                )
                # 确保抛出 HTTPException 时，能传递 session_id
                # 但标准 HTTPException 的 detail 是字符串，可能需要自定义异常处理器或调整返回结构
                # 简单起见，可以在日志中记录，但标准错误响应可能不含它
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"意图处理失败: {error_message}", # 标准 detail 是字符串
                )
            else:
                # 未知的结果类型
                # returned_session_id = service_result.get("session_id", session_id) # 这行移到上面了
                logger.error(
                    f"[Session: {returned_session_id}] 意图服务返回未知类型: {result_type}"
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
