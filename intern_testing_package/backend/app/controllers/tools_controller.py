from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.tool_service import tool_service
from app.schemas.tools import ToolsListResponse


async def get_tools_controller(db: AsyncSession) -> ToolsListResponse:
    """
    获取工具列表的控制器
    
    Args:
        db: 数据库会话
        
    Returns:
        工具列表响应
    """
    logger.info("控制器：请求获取工具列表")
    
    # 调用服务获取工具列表
    tools = await tool_service.get_tools_list(db)
    
    # 返回响应
    return ToolsListResponse(tools=tools) 