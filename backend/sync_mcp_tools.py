#!/usr/bin/env python3
"""
从MCPRouter同步工具信息到Backend数据库
"""

import sys
import os
import asyncio
import httpx
from typing import Dict, List, Any, Optional

# 添加项目根目录到路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.tool import Tool
from app.config import settings
from loguru import logger

class MCPToolsSync:
    """MCP工具同步器"""
    
    def __init__(self):
        self.mcprouter_api_url = settings.MCPROUTER_API_URL
        self.db_engine = create_engine(settings.DATABASE_URL)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.db_engine)
        
    async def get_mcprouter_tools(self) -> Dict[str, List[Dict[str, Any]]]:
        """从MCPRouter获取所有服务器的工具列表"""
        tools_by_server = {}
        
        # MCPRouter中配置的服务器列表
        servers = ["fetch", "playwright", "minimax-mcp-js", "amap-maps", "web3-rpc", "time"]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for server in servers:
                try:
                    logger.info(f"正在获取服务器 '{server}' 的工具列表...")
                    
                    # 参考test_mcprouter_simple.py的测试方法
                    headers = {
                        "Authorization": f"Bearer {server}",
                        "Content-Type": "application/json"
                    }
                    
                    # 调用MCPRouter的list-tools接口
                    response = await client.post(
                        f"{self.mcprouter_api_url}/v1/list-tools",
                        headers=headers,
                        json={"server": server}
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        logger.info(f"服务器 '{server}' 响应: {data}")
                        
                        # 检查响应格式
                        if "data" in data and "tools" in data["data"]:
                            tools = data["data"]["tools"]
                            tools_by_server[server] = tools
                            logger.info(f"服务器 '{server}' 获取到 {len(tools)} 个工具")
                            
                            # 打印工具详情
                            for i, tool in enumerate(tools, 1):
                                logger.info(f"  {i}. {tool.get('name', 'Unknown')}: {tool.get('description', 'No description')}")
                        else:
                            logger.warning(f"服务器 '{server}' 响应格式异常: {data}")
                    else:
                        logger.warning(f"服务器 '{server}' 请求失败: HTTP {response.status_code}")
                        logger.warning(f"响应内容: {response.text}")
                        
                except Exception as e:
                    logger.error(f"获取服务器 '{server}' 工具时出错: {e}")
                    continue
        
        return tools_by_server
    
    def create_tool_records(self, tools_by_server: Dict[str, List[Dict[str, Any]]]) -> List[Tool]:
        """创建工具记录"""
        tool_records = []
        
        for server_name, tools in tools_by_server.items():
            for tool in tools:
                try:
                    # 提取工具信息
                    tool_id = tool.get("name", "")
                    description = tool.get("description", "")
                    
                    # 构建请求参数Schema
                    parameters = tool.get("inputSchema", {})
                    if not parameters:
                        # 如果没有inputSchema，创建一个基本的
                        parameters = {
                            "type": "object",
                            "properties": {},
                            "required": []
                        }
                    
                    # 创建工具记录
                    tool_record = Tool(
                        tool_id=tool_id,
                        name=tool_id,  # 使用tool_id作为name
                        type="mcp",
                        description=description or f"{server_name} 服务器提供的 {tool_id} 工具",
                        endpoint={
                            "server_name": server_name,
                            "tool_name": tool_id
                        },
                        request_schema=parameters,
                        response_schema={
                            "type": "object",
                            "properties": {
                                "result": {"type": "string", "description": "工具执行结果"}
                            }
                        },
                        server_name=server_name,
                        is_public=True,
                        status="active",
                        version="1.0.0"
                    )
                    
                    tool_records.append(tool_record)
                    logger.info(f"创建工具记录: {tool_id} (服务器: {server_name})")
                    
                except Exception as e:
                    logger.error(f"处理工具 {tool.get('name', 'unknown')} 时出错: {e}")
                    continue
        
        return tool_records
    
    def sync_tools_to_database(self, tool_records: List[Tool]):
        """将工具记录同步到数据库"""
        db = self.SessionLocal()
        try:
            # 清空现有工具记录（可选，根据需要决定）
            # db.query(Tool).filter(Tool.type == "mcp").delete()
            
            # 添加新工具记录
            for tool_record in tool_records:
                # 检查工具是否已存在
                existing_tool = db.query(Tool).filter(
                    Tool.tool_id == tool_record.tool_id,
                    Tool.server_name == tool_record.server_name
                ).first()
                
                if existing_tool:
                    # 更新现有工具
                    existing_tool.description = tool_record.description
                    existing_tool.request_schema = tool_record.request_schema
                    existing_tool.response_schema = tool_record.response_schema
                    existing_tool.status = "active"
                    logger.info(f"更新工具: {tool_record.tool_id}")
                else:
                    # 添加新工具
                    db.add(tool_record)
                    logger.info(f"添加新工具: {tool_record.tool_id}")
            
            db.commit()
            logger.info(f"成功同步 {len(tool_records)} 个工具到数据库")
            
        except Exception as e:
            logger.error(f"同步工具到数据库时出错: {e}")
            db.rollback()
            raise
        finally:
            db.close()
    
    async def sync_all_tools(self):
        """同步所有工具"""
        try:
            logger.info("开始同步MCPRouter工具到Backend数据库...")
            
            # 1. 从MCPRouter获取工具列表
            tools_by_server = await self.get_mcprouter_tools()
            
            if not tools_by_server:
                logger.warning("未从MCPRouter获取到任何工具")
                return
            
            # 2. 创建工具记录
            tool_records = self.create_tool_records(tools_by_server)
            
            if not tool_records:
                logger.warning("未创建任何工具记录")
                return
            
            # 3. 同步到数据库
            self.sync_tools_to_database(tool_records)
            
            logger.info("工具同步完成！")
            
        except Exception as e:
            logger.error(f"工具同步失败: {e}")
            raise

async def main():
    """主函数"""
    try:
        sync = MCPToolsSync()
        await sync.sync_all_tools()
        print("✅ 工具同步完成！")
    except Exception as e:
        print(f"❌ 工具同步失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
