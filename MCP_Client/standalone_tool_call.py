#!/usr/bin/env python3
"""
独立进程MCP工具调用脚本

这个脚本被设计为从后端通过subprocess调用，避免uvicorn异步环境冲突
解决MCP会话初始化和状态管理问题
"""

import asyncio
import json
import sys
import os
import time
from typing import Dict, Any

# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp_client import MCPClient

async def call_tool_standalone(server_name: str, tool_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    在独立进程中调用MCP工具
    
    Args:
        server_name: MCP服务器名称
        tool_id: 工具ID
        params: 工具参数
        
    Returns:
        dict: 执行结果
    """
    client = None
    try:
        print(f"🚀 独立进程调用MCP工具: server={server_name}, tool={tool_id}")
        start_time = time.time()
        
        # 1. 创建客户端并连接
        client = MCPClient()
        print(f"🔧 开始连接MCP服务器: {server_name}")
        await client.connect(server_name)
        
        connect_time = time.time() - start_time
        print(f"✅ MCP服务器连接成功，耗时: {connect_time:.2f}秒")
        
        # 2. 验证会话状态
        if not hasattr(client, 'session') or client.session is None:
            raise RuntimeError("MCP客户端会话未正确初始化")
            
        # 3. 检查会话是否已初始化
        if hasattr(client.session, 'initialized') and not client.session.initialized:
            raise RuntimeError("MCP会话尚未完成初始化")
            
        print(f"🔧 开始调用工具: {tool_id}")
        tool_start_time = time.time()
        
        # 4. 调用工具
        tool_result = await client.session.call_tool(tool_id, params)
        
        tool_time = time.time() - tool_start_time
        print(f"✅ 工具调用完成，耗时: {tool_time:.2f}秒")
        
        # 5. 处理结果
        response_content = ""
        if hasattr(tool_result, 'content'):
            if hasattr(tool_result.content, 'text'):
                response_content = tool_result.content.text
            elif isinstance(tool_result.content, list) and len(tool_result.content) > 0:
                # 处理内容列表
                content_parts = []
                for item in tool_result.content:
                    if hasattr(item, 'text'):
                        content_parts.append(item.text)
                    else:
                        content_parts.append(str(item))
                response_content = '\n'.join(content_parts)
            else:
                response_content = str(tool_result.content)
        else:
            response_content = str(tool_result)
            
        total_time = time.time() - start_time
        print(f"🎉 独立进程工具调用成功，总耗时: {total_time:.2f}秒")
        
        return {
            "success": True,
            "tool_id": tool_id,
            "result": {
                "message": response_content
            },
            "timing": {
                "connect_time": connect_time,
                "tool_time": tool_time,
                "total_time": total_time
            }
        }
        
    except Exception as e:
        error_msg = f"独立进程工具调用失败: {str(e)}"
        print(f"❌ {error_msg}")
        
        return {
            "success": False,
            "tool_id": tool_id,
            "error": {
                "code": type(e).__name__.upper(),
                "message": str(e),
                "error_type": type(e).__name__
            }
        }
        
    finally:
        # 6. 清理资源
        if client:
            try:
                await client.close()
                print("✅ MCP客户端连接已关闭")
            except Exception as e:
                print(f"⚠️ 关闭MCP客户端时出错: {e}")

async def main():
    """主入口函数"""
    if len(sys.argv) != 4:
        print("使用方法: python standalone_tool_call.py <server_name> <tool_id> <params_json>")
        print("示例: python standalone_tool_call.py amap-maps maps_weather '{\"city\": \"深圳\"}'")
        sys.exit(1)
    
    server_name = sys.argv[1]
    tool_id = sys.argv[2]
    
    try:
        params = json.loads(sys.argv[3])
    except json.JSONDecodeError as e:
        print(f"❌ 参数JSON解析失败: {e}")
        sys.exit(1)
    
    # 执行工具调用
    result = await call_tool_standalone(server_name, tool_id, params)
    
    # 输出结果为JSON格式，供后端解析
    print("\n--- RESULT_JSON_START ---")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print("--- RESULT_JSON_END ---")
    
    # 根据结果设置退出码
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    asyncio.run(main())