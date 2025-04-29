from fastapi import HTTPException
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.execute import ExecuteRequest, ExecuteResponse
from app.services.execute_service import execute_service

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
    logger.info(f"控制器：收到工具执行请求: tool_id={request.tool_id}, session_id={request.session_id}")
    
    try:
        # 调用服务层执行工具，传入 db
        response = await execute_service.execute_tool(
            tool_id=request.tool_id,
            params=request.params,
            db=db, # 传递 db 会话
            session_id=request.session_id,
            user_id=request.user_id
        )
        
        logger.info(f"控制器：工具执行服务调用完成: tool_id={request.tool_id}, success={response.success}")
        # 手动转字典返回，并强制使用请求中的 session_id
        response_dict = response.dict(exclude_none=False) # 确保 None 值包含
        response_dict["session_id"] = request.session_id # 强制赋值
        return response_dict
        
    except Exception as e:
        # 捕获服务层未处理的意外错误 (理论上服务层应该都处理了)
        logger.error(f"控制器：处理工具执行请求时发生意外错误: tool_id={request.tool_id}, error={e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "tool_id": request.tool_id,
                "success": False,
                "error": {
                    "code": "CONTROLLER_EXCEPTION",
                    "message": f"处理执行请求时发生内部服务器错误: {str(e)}"
                },
                "session_id": request.session_id
            }
        ) 