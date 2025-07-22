from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.db import get_async_db_session
from app.controllers.tools_controller import get_tools_controller
from app.schemas.tools import ToolsListResponse
from app.models.user import User
from app.utils.security import get_current_user

# 创建路由实例
router = APIRouter()


@router.get(
    "/tools",
    response_model=ToolsListResponse,
    response_model_exclude_none=False,
    summary="获取可用工具列表",
    description="检索系统中所有可用工具的列表。"
)
async def get_tools(
    db: AsyncSession = Depends(get_async_db_session),
    current_user: User = Depends(get_current_user)
) -> ToolsListResponse:
    """
    获取所有可用工具列表
    
    Args:
        db: 数据库会话
        current_user: 当前认证用户
    """
    return await get_tools_controller(db=db)