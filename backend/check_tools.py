#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
from sqlalchemy import select
from app.models.tool import Tool
from app.utils.db import get_async_db_session

async def check_tools():
    """检查数据库中的工具记录"""
    async_session_gen = get_async_db_session()
    session = await async_session_gen.__anext__()
    
    try:
        # 查询所有工具
        result = await session.execute(select(Tool))
        tools = result.scalars().all()
        print(f"数据库中共有 {len(tools)} 个工具记录:")
        print("=" * 50)
        
        for tool in tools:
            print(f"ID: {tool.id}, tool_id: '{tool.tool_id}', name: '{tool.name}', type: '{tool.type}'")
        
        print("\n" + "=" * 50)
        
        # 查询tool_id为空的工具
        empty_result = await session.execute(
            select(Tool).where(
                (Tool.tool_id == None) | (Tool.tool_id == '')
            )
        )
        empty_tool_id = empty_result.scalars().all()
        
        print(f"\ntool_id为空的工具 ({len(empty_tool_id)} 个):")
        print("-" * 30)
        for tool in empty_tool_id:
            print(f"ID: {tool.id}, tool_id: '{tool.tool_id}', name: '{tool.name}', type: '{tool.type}'")
        
        # 查询coze和dify相关工具
        coze_dify_result = await session.execute(
            select(Tool).where(
                (Tool.name.ilike('%coze%')) | 
                (Tool.name.ilike('%dify%')) | 
                (Tool.tool_id.ilike('%coze%')) | 
                (Tool.tool_id.ilike('%dify%'))
            )
        )
        coze_dify = coze_dify_result.scalars().all()
        
        print(f"\ncoze和dify相关工具 ({len(coze_dify)} 个):")
        print("-" * 30)
        for tool in coze_dify:
            print(f"ID: {tool.id}, tool_id: '{tool.tool_id}', name: '{tool.name}', type: '{tool.type}'")
            
    except Exception as e:
        print(f"查询出错: {e}")
    finally:
        try:
            await async_session_gen.aclose()
        except:
            pass

if __name__ == "__main__":
    asyncio.run(check_tools())