from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any, Optional

from app.utils.db import get_async_db_session
from app.schemas.execute import ExecuteRequest, ExecuteResponse
from app.controllers.execute_controller import execute_controller
from app.models.tool import Tool
from app.models.user import User
from app.utils.security import get_optional_user
from app.config import settings

# 创建路由实例
router = APIRouter()

@router.post(
    "/execute", 
    response_model=ExecuteResponse, 
    response_model_exclude_none=False,
    summary="Execute a specific tool",
    description="Executes the specified tool with the given parameters and returns the result."
)
# @stable(tested=2025-04-30, test_script=backend/test_api.py)
async def execute_tool(
    request: ExecuteRequest = Body(...),
    db: AsyncSession = Depends(get_async_db_session),
    current_user: Optional[User] = Depends(get_optional_user)
) -> ExecuteResponse:
    """
    Endpoint to execute a tool.
    
    Args:
        request: 执行工具请求
        db: 数据库会话
        current_user: 当前认证用户 (可选)
    """
    # 在测试环境中，如果没有current_user，使用请求中提供的user_id
    if current_user is None and settings.ENV == 'development':
        # 确保请求中包含user_id
        if not request.user_id:
            request.user_id = 1  # 测试环境中使用ID为1的默认用户
    else:
        # 将用户ID从认证用户中获取，确保安全
        if current_user:
            request.user_id = current_user.id
    
    # 直接调用控制器处理请求
    return await execute_controller(request=request, db=db)


@router.get(
    "/tools",
    summary="Get available tools",
    description="Returns a list of all available tools that can be used in the system."
)
async def get_tools(
    db: AsyncSession = Depends(get_async_db_session),
    current_user: Optional[User] = Depends(get_optional_user)
) -> Dict[str, List[Dict[str, Any]]]:
    """
    获取所有可用工具列表
    
    Args:
        db: 数据库会话
        current_user: 当前认证用户 (可选)
    """
    # 在严格生产环境中，我们可能需要验证用户是否登录
    if settings.ENV != 'development' and current_user is None:
        # 在生产环境中，如果希望强制用户认证，可以在这里抛出异常
        # raise HTTPException(status_code=401, detail="需要认证才能访问此资源")
        pass
    
    # 从数据库获取所有工具
    result = await db.execute(select(Tool))
    tools = result.scalars().all()
    
    # 格式化工具信息为前端所需格式
    formatted_tools = []
    for tool in tools:
        try:
            tool_info = {
                "tool_id": tool.tool_id,
                "name": tool.name,
                "type": tool.type,
                "description": tool.description,
                "source": "MCP" if tool.type == "mcp" else "开发者"
            }
            formatted_tools.append(tool_info)
        except Exception as e:
            # 简单记录错误并跳过
            pass
    
    # 返回工具列表
    return {"tools": formatted_tools}