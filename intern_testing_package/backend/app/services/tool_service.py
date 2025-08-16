from typing import List, Dict, Any, Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.tool import Tool
from app.schemas.tools import ToolItem


class ToolService:
    """工具服务，负责管理工具相关操作"""

    async def get_tools_list(self, db: AsyncSession) -> List[ToolItem]:
        """
        获取所有可用工具列表
        
        Args:
            db: 数据库会话
            
        Returns:
            格式化的工具列表
        """
        logger.info("获取工具列表")
        
        # 从数据库查询所有活跃状态的工具
        result = await db.execute(select(Tool).where(Tool.status == "active"))
        tools = result.scalars().all()
        
        # 格式化工具列表
        formatted_tools = []
        for tool in tools:
            try:
                # 判断工具来源
                source = "MCP" if tool.type == "mcp" else "开发者"
                
                # 创建工具项
                tool_item = ToolItem(
                    tool_id=tool.tool_id,
                    name=tool.name,
                    type=tool.type,
                    description=tool.description,
                    source=source
                )
                formatted_tools.append(tool_item)
            except Exception as e:
                logger.warning(f"处理工具 {tool.tool_id} 时出错: {e}")
        
        logger.info(f"成功获取 {len(formatted_tools)} 个工具")
        return formatted_tools


# 创建工具服务实例
tool_service = ToolService()