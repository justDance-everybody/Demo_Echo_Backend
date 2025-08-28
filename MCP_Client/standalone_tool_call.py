#!/usr/bin/env python3
"""
独立的MCP工具调用脚本
专门用于从后端通过subprocess调用，完全绕过异步上下文冲突
"""

import asyncio
import json
import sys
import os
from typing import Dict, Any

# 设置环境变量
os.environ.setdefault('LLM_API_KEY', 'sk-mtvddwzjnklfzoogcumhujpanjrkrgjxtvafskgcbmvkvqqg')
os.environ.setdefault('LLM_MODEL', 'Qwen/Qwen3-30B-A3B-Instruct-2507')
os.environ.setdefault('LLM_API_BASE', 'https://api.siliconflow.cn/v1')

from mcp_client import MCPClient

async def call_mcp_tool(server_name: str, tool_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    独立调用MCP工具
    
    Args:
        server_name: MCP服务器名称
        tool_id: 工具ID
        params: 工具参数
    
    Returns:
        工具调用结果
    """
    client = MCPClient()
    
    try:
        print(f"🔧 独立进程调用MCP工具: {server_name}.{tool_id}")
        
        # 连接到MCP服务器
        await client.connect(server_name)
        print(f"✅ 连接成功，工具数量: {len(client.tools)}")
        
        # 调用工具（带会话初始化检查绕过）
        try:
            result = await client.session.call_tool(tool_id, params)
            print(f"✅ 工具调用成功")
        except Exception as call_error:
            if "会话尚未初始化" in str(call_error):
                print(f"⚠️ 工具调用遇到会话初始化问题，尝试强制绕过...")
                
                # 强制设置会话状态
                try:
                    if hasattr(client.session, '_initialized'):
                        client.session._initialized = True
                        print("🔧 已强制设置会话为已初始化状态")
                    
                    # 重试工具调用
                    result = await client.session.call_tool(tool_id, params)
                    print(f"✅ 强制绕过后工具调用成功")
                except Exception as retry_error:
                    print(f"❌ 强制绕过后仍然失败: {retry_error}")
                    raise call_error
            else:
                raise call_error
        
        await client.close()
        
        # 提取结果内容
        if hasattr(result, 'content') and result.content:
            content = result.content[0].text if result.content else str(result)
        else:
            content = str(result)
        
        return {
            "success": True,
            "content": content,
            "isError": getattr(result, 'isError', False)
        }
        
    except Exception as e:
        print(f"❌ 工具调用失败: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def main():
    """主函数，从命令行参数获取调用信息"""
    if len(sys.argv) != 4:
        print("用法: python standalone_tool_call.py <server_name> <tool_id> <params_json>")
        sys.exit(1)
    
    server_name = sys.argv[1]
    tool_id = sys.argv[2]
    params_json = sys.argv[3]
    
    try:
        params = json.loads(params_json)
    except json.JSONDecodeError as e:
        result = {"success": False, "error": f"参数JSON解析失败: {e}"}
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)
    
    # 运行异步调用
    result = asyncio.run(call_mcp_tool(server_name, tool_id, params))
    
    # 输出JSON结果
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
