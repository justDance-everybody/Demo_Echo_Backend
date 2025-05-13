from fastapi import HTTPException
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.schemas.execute import ExecuteRequest, ExecuteResponse
from app.services.execute_service import execute_service

# @stable(tested=2025-04-30, test_script=backend/test_api.py)
async def execute_controller(request: ExecuteRequest, db: AsyncSession) -> ExecuteResponse:
    """
    处理工具执行请求的控制器

    Args:
        request: 执行请求的数据模型
        db: 数据库会话

    Returns:
        执行结果的响应模型
    
    Raises:
        HTTPException: 如果处理过程中发生不可恢复的错误
    """
    # 如果没有session_id，生成一个新的
    session_id = request.session_id
    if not session_id:
        session_id = str(uuid.uuid4())
        logger.info(f"[Session: {session_id}] 生成新的会话ID (执行控制器)")
    
    # 获取user_id，如果没有就使用默认值
    user_id = request.user_id
    if user_id is None:
        logger.warning(f"[Session: {session_id}] 请求中未提供user_id，使用默认值1")
        user_id = 1  # 使用默认用户ID
    
    logger.info(f"控制器：收到工具执行请求: tool_id={request.tool_id}, session_id={session_id}, user_id={user_id}")
    
    try:
        # 调用服务层执行工具，传入 db
        response = await execute_service.execute_tool(
            tool_id=request.tool_id,
            params=request.params,
            db=db, # 传递 db 会话
            session_id=session_id,  # 使用可能新生成的session_id
            user_id=user_id  # 使用整数类型的user_id
        )
        
        logger.info(f"控制器：工具执行服务调用完成: tool_id={request.tool_id}, success={response.success}")
        
        # 如果服务层未能返回session_id，则使用我们的session_id
        if response.session_id is None:
            logger.warning(f"服务层未能在 ExecuteResponse 中返回 session_id，使用控制器中的值: {session_id}")
            response.session_id = session_id

        # --- [增加日志] ---
        logger.debug(f"控制器：即将返回 ExecuteResponse，session_id 的值: {response.session_id}")
        # --- [增加日志结束] ---
        return response # 直接返回 Pydantic 对象
        
    except Exception as e:
        # 捕获服务层未处理的意外错误 (理论上服务层应该都处理了)
        logger.error(f"控制器：处理工具执行请求时发生意外错误: tool_id={request.tool_id}, error={e}", exc_info=True)
        # 在异常响应中也确保 session_id 存在
        error_detail = {
            "tool_id": request.tool_id,
            "success": False,
            "error": {
                "code": "CONTROLLER_EXCEPTION",
                "message": f"处理执行请求时发生内部服务器错误: {str(e)}"
            },
            "sessionId": session_id # 确保异常响应中包含 sessionId (使用别名)
        }
        # 注意：当抛出 HTTPException 时，其 detail 会被 FastAPI 直接序列化，
        # 这里我们返回字典，FastAPI 会处理。
        raise HTTPException(
            status_code=500,
            detail=error_detail # 直接传递包含 sessionId 的字典
        ) 