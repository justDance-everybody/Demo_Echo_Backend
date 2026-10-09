#!/usr/bin/env python3
"""
获取MCP服务器工具列表的独立脚本
"""

import asyncio
import json
import sys
import os
import time

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp_client import MCPClient

async def get_tools(server_name: str):
    """获取指定服务器的工具列表"""
    client = None
    try:
        print(f"🚀 连接MCP服务器: {server_name}")
        start_time = time.time()
        
        # 创建客户端并连接
        client = MCPClient()
        await client.connect(server_name)
        
        connect_time = time.time() - start_time
        print(f"✅ 连接成功，耗时: {connect_time:.2f}秒")
        
        # 获取工具列表
        if hasattr(client, 'tools') and client.tools:
            tools_list = []
            for tool in client.tools:
                tool_info = {
                    "name": tool.name,
                    "description": tool.description or "",
                    "inputSchema": tool.inputSchema or {}
                }
                tools_list.append(tool_info)
            
            result = {
                "success": True,
                "tools": tools_list,
                "server_name": server_name,
                "tool_count": len(tools_list)
            }
            print(f"📋 找到 {len(tools_list)} 个工具")
            
        else:
            result = {
                "success": False,
                "error": "未找到任何工具",
                "tools": [],
                "server_name": server_name
            }
            print("⚠️ 未找到任何工具")
        
        return result
        
    except Exception as e:
        print(f"❌ 获取工具失败: {e}")
        return {
            "success": False,
            "error": str(e),
            "tools": [],
            "server_name": server_name
        }
        
    finally:
        if client:
            try:
                await client.close()
                print("✅ 连接已关闭")
            except Exception as e:
                print(f"⚠️ 关闭连接时出错: {e}")

async def main():
    """主入口函数"""
    if len(sys.argv) != 2:
        print("使用方法: python get_tools.py <server_name>")
        sys.exit(1)
    
    server_name = sys.argv[1]
    
    # 获取工具列表
    result = await get_tools(server_name)
    
    # 输出结果为JSON格式
    print("\n--- TOOLS_JSON_START ---")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print("--- TOOLS_JSON_END ---")
    
    # 根据结果设置退出码
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    asyncio.run(main())
