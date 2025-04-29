from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.db import get_async_db_session
from app.schemas.execute import ExecuteRequest, ExecuteResponse
from app.controllers.execute_controller import execute_controller

# 创建路由实例
router = APIRouter()

@router.post(
    "/execute", 
    response_model=ExecuteResponse, 
    response_model_exclude_none=False,
    summary="Execute a specific tool",
    description="Executes the specified tool with the given parameters and returns the result."
)
async def execute_tool(
    request: ExecuteRequest = Body(...),
    db: AsyncSession = Depends(get_async_db_session)
) -> ExecuteResponse:
    """
    Endpoint to execute a tool.
    """
    # 直接调用控制器处理请求
    return await execute_controller(request=request, db=db)