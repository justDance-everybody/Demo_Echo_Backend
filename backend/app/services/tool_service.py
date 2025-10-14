from typing import List, Dict, Any, Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
import json
import os
from pathlib import Path

from app.models.tool import Tool
from app.schemas.tools import ToolItem


class ToolService:
    """工具服务，负责管理工具相关操作"""

    def __init__(self):
        """初始化工具服务，加载MCP服务器配置"""
        self._mcp_servers_config = None
        self._load_mcp_servers_config()

    def _load_mcp_servers_config(self):
        """加载MCP服务器配置"""
        try:
            # 查找MCP服务器配置文件
            config_paths = [
                "/home/devbox/project/Backend/MCP_Client/config/mcp_servers.json",
                "/home/devbox/project/Backend/backend/app/mcp_servers.json",
                "/home/devbox/project/Backend/config/mcp_servers.json"
            ]
            
            for config_path in config_paths:
                if os.path.exists(config_path):
                    with open(config_path, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                        self._mcp_servers_config = config.get('mcpServers', {})
                        logger.info(f"成功加载MCP服务器配置: {config_path}")
                        return
            
            logger.warning("未找到MCP服务器配置文件")
            self._mcp_servers_config = {}
            
        except Exception as e:
            logger.error(f"加载MCP服务器配置失败: {e}")
            self._mcp_servers_config = {}

    def _get_mcp_server_info(self, server_name: str) -> Dict[str, str]:
        """获取MCP服务器信息"""
        if not self._mcp_servers_config or not server_name:
            return {"name": server_name or "", "description": ""}
        
        server_config = self._mcp_servers_config.get(server_name, {})
        return {
            "name": server_config.get("name", server_name),
            "description": server_config.get("description", "")
        }

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
                
                # 获取MCP服务器信息
                server_info = {"name": "", "description": ""}
                if tool.type == "mcp" and tool.server_name:
                    server_info = self._get_mcp_server_info(tool.server_name)
                
                # 创建工具项
                tool_item = ToolItem(
                    tool_id=tool.tool_id,
                    name=tool.name,
                    type=tool.type,
                    description=tool.description,
                    source=source,
                    server_name=tool.server_name if tool.type == "mcp" else None,
                    server_description=server_info["description"] if tool.type == "mcp" else None
                )
                formatted_tools.append(tool_item)
            except Exception as e:
                logger.warning(f"处理工具 {tool.tool_id} 时出错: {e}")
        
        logger.info(f"成功获取 {len(formatted_tools)} 个工具")
        return formatted_tools


# 创建工具服务实例
tool_service = ToolService()