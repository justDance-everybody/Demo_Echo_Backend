#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MCP集成测试脚本
用于验证测试包中MCP客户端的功能完整性
"""

import os
import sys
import asyncio
import json
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.append(str(project_root / "backend"))
sys.path.append(str(project_root / "MCP_Client"))

def test_mcp_client_availability():
    """测试MCP客户端是否可用"""
    print("🔍 测试MCP客户端可用性...")
    
    # 检查MCP_Client目录
    mcp_client_dir = project_root / "MCP_Client"
    if not mcp_client_dir.exists():
        print("❌ MCP_Client目录不存在")
        return False
    
    # 检查mcp_client.py文件
    mcp_client_file = mcp_client_dir / "mcp_client.py"
    if not mcp_client_file.exists():
        print("❌ mcp_client.py文件不存在")
        return False
    
    # 检查配置文件
    config_file = mcp_client_dir / "config" / "mcp_servers.json"
    if not config_file.exists():
        print("❌ MCP服务器配置文件不存在")
        return False
    
    print("✅ MCP客户端文件结构完整")
    return True

def test_mcp_config_validity():
    """测试MCP配置文件的有效性"""
    print("🔍 测试MCP配置文件有效性...")
    
    try:
        config_file = project_root / "MCP_Client" / "config" / "mcp_servers.json"
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        if "mcpServers" not in config:
            print("❌ 配置文件格式错误：缺少mcpServers字段")
            return False
        
        servers = config["mcpServers"]
        print(f"✅ 发现 {len(servers)} 个MCP服务器配置:")
        
        for server_name, server_config in servers.items():
            enabled = server_config.get("enabled", False)
            description = server_config.get("description", "无描述")
            status = "启用" if enabled else "禁用"
            print(f"   - {server_name}: {description} ({status})")
        
        return True
        
    except Exception as e:
        print(f"❌ 配置文件解析失败: {e}")
        return False

def test_backend_mcp_integration():
    """测试后端MCP集成"""
    print("🔍 测试后端MCP集成...")
    
    try:
        # 导入后端MCP相关模块
        from app.utils.mcp_client import MCPClientWrapper
        from app.services.mcp_manager import mcp_manager
        
        print("✅ 成功导入后端MCP模块")
        
        # 检查MCP管理器配置
        if hasattr(mcp_manager, 'server_configs'):
            server_count = len(mcp_manager.server_configs)
            print(f"✅ MCP管理器已加载 {server_count} 个服务器配置")
        else:
            print("⚠️  MCP管理器配置未正确加载")
        
        return True
        
    except ImportError as e:
        print(f"❌ 导入后端MCP模块失败: {e}")
        return False
    except Exception as e:
        print(f"❌ 后端MCP集成测试失败: {e}")
        return False

async def test_mcp_client_instantiation():
    """测试MCP客户端实例化"""
    print("🔍 测试MCP客户端实例化...")
    
    try:
        # 设置测试环境变量
        os.environ["LLM_API_KEY"] = "test_api_key_for_testing"
        os.environ["LLM_MODEL"] = "gpt-4o"
        os.environ["LLM_API_BASE"] = "https://api.openai.com/v1"
        os.environ["MCP_SERVERS_PATH"] = str(project_root / "MCP_Client" / "config" / "mcp_servers.json")
        
        # 导入并实例化MCP客户端
        from mcp_client import MCPClient
        
        client = MCPClient()
        print("✅ MCP客户端实例化成功")
        
        # 检查配置加载
        if hasattr(client, 'server_configs') and client.server_configs:
            print(f"✅ 客户端已加载 {len(client.server_configs)} 个服务器配置")
        else:
            print("⚠️  客户端配置加载可能有问题")
        
        return True
        
    except Exception as e:
        print(f"❌ MCP客户端实例化失败: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 开始MCP集成测试...\n")
    
    tests = [
        ("MCP客户端可用性", test_mcp_client_availability),
        ("MCP配置文件有效性", test_mcp_config_validity),
        ("后端MCP集成", test_backend_mcp_integration),
    ]
    
    async_tests = [
        ("MCP客户端实例化", test_mcp_client_instantiation),
    ]
    
    passed = 0
    total = len(tests) + len(async_tests)
    
    # 运行同步测试
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        if test_func():
            passed += 1
        print()
    
    # 运行异步测试
    async def run_async_tests():
        nonlocal passed
        for test_name, test_func in async_tests:
            print(f"\n📋 {test_name}")
            if await test_func():
                passed += 1
            print()
    
    asyncio.run(run_async_tests())
    
    # 输出测试结果
    print("\n" + "="*50)
    print(f"📊 测试结果: {passed}/{total} 通过")
    
    if passed == total:
        print("🎉 所有MCP集成测试通过！")
        print("✅ 实习生可以成功使用MCP服务调用功能")
    else:
        print("⚠️  部分测试失败，请检查MCP配置")
        print("💡 建议运行 ./start_testing.sh 确保环境正确配置")
    
    print("="*50)
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)