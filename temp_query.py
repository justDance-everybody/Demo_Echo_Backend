#!/usr/bin/env python3
import json
import asyncio
from sqlalchemy import select, text
from app.models.tool import Tool
from app.utils.db import get_db

async def query_http_tools():
    """查询数据库中的HTTP工具"""
    async for db in get_db():
        # 查询type为'http'的工具
        result = await db.execute(select(Tool).where(Tool.type == 'http'))
        tools = result.scalars().all()
        
        print(f"找到 {len(tools)} 个HTTP工具:")
        for tool in tools:
            platform = tool.endpoint.get('platform', '未知') if tool.endpoint else '未知'
            print(f"ID: {tool.tool_id}")
            print(f"名称: {tool.name}")
            print(f"平台: {platform}")
            print(f"端点配置: {json.dumps(tool.endpoint, ensure_ascii=False, indent=2)}")
            print("-" * 50)

if __name__ == "__main__":
    asyncio.run(query_http_tools()) 