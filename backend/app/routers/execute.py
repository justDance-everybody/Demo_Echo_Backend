from fastapi import APIRouter, Depends, Body
from app.schemas.execute import ExecuteRequest, ExecuteResponse
from app.controllers.execute_controller import execute_controller

# 创建路由实例
router = APIRouter()

@router.post(
    "/execute", 
    response_model=ExecuteResponse, 
    summary="执行指定的工具",
    description="接收工具ID和参数，调用相应的MCP工具执行操作，并返回结果。"
)
async def execute_tool(
    request: ExecuteRequest = Body(...)
) -> ExecuteResponse:
    """
    API端点：执行工具
    "
    # 直接调用控制器处理请求
    return await execute_controller(request) 