#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MCPRouter 简化测试脚本
只测试 MCPRouter 功能，不依赖后端服务
"""

import asyncio
import httpx
import subprocess
import sys
import json

def print_status(message: str, status: str = "INFO"):
    """打印状态信息"""
    colors = {
        "INFO": "\033[94m",    # 蓝色
        "SUCCESS": "\033[92m", # 绿色
        "WARNING": "\033[93m", # 黄色
        "ERROR": "\033[91m",   # 红色
        "RESET": "\033[0m"     # 重置
    }
    print(f"{colors.get(status, colors['INFO'])}[{status}]{colors['RESET']} {message}")

def check_port(port: int) -> bool:
    """检查端口是否被占用"""
    try:
        result = subprocess.run(['netstat', '-an'], capture_output=True, text=True)
        return f':{port}' in result.stdout and 'LISTENING' in result.stdout
    except:
        return False

async def test_mcprouter_api():
    """测试 MCPRouter API"""
    print_status("Testing MCPRouter API...", "INFO")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 测试 list-servers 端点 - 使用 POST 方法和授权头
            headers = {
                "Authorization": "Bearer fetch",
                "Content-Type": "application/json"
            }
            # 测试所有配置的MCP服务器
            servers_to_test = ["fetch", "time", "playwright", "minimax-mcp-js", "amap-maps", "web3-rpc"]
            successful_servers = 0
            
            for server in servers_to_test:
                print_status(f"Testing {server} server...", "INFO")
                try:
                    response = await client.post(
                        "http://localhost:8028/v1/list-tools", 
                        headers=headers,
                        json={"server": server}
                    )
                    if response.status_code == 200:
                        tools = response.json()
                        print_status(f"✓ {server} server successful (HTTP {response.status_code})", "SUCCESS")
                        if "data" in tools and "tools" in tools["data"]:
                            tool_count = len(tools["data"]["tools"])
                            print(f"  - Found {tool_count} tools:")
                            for i, tool in enumerate(tools["data"]["tools"], 1):
                                print(f"    {i}. {tool['name']}: {tool.get('description', 'No description')}")
                        successful_servers += 1
                    else:
                        print_status(f"✗ {server} server failed (HTTP {response.status_code})", "WARNING")
                        print(f"  - Response: {response.text}")
                except Exception as e:
                    print_status(f"✗ {server} server error: {e}", "ERROR")
            
            print_status(f"Total servers tested: {len(servers_to_test)}, Successful: {successful_servers}", "INFO")
            return successful_servers > 0
                
    except Exception as e:
        print_status(f"✗ MCPRouter API test failed: {e}", "ERROR")
        return False

async def test_mcprouter_proxy():
    """测试 MCPRouter Proxy"""
    print_status("Testing MCPRouter Proxy...", "INFO")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("http://localhost:8025")
            if response.status_code == 200:
                print_status(f"✓ Proxy server responding (HTTP {response.status_code})", "SUCCESS")
                return True
            else:
                print_status(f"✗ Proxy server failed (HTTP {response.status_code})", "WARNING")
                return False
                
    except Exception as e:
        print_status(f"✗ Proxy test failed: {e}", "ERROR")
        return False

async def test_solana_account():
    """测试Solana账户信息查询"""
    print_status("Testing Solana Account Information...", "INFO")
    
    solana_address = "7Ts3yn7mUbaR1YFDkLgPAXQVXB7NSMV1fNFbrnZskayf"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": "Bearer web3-rpc",
                "Content-Type": "application/json"
            }
            
            # 测试获取账户信息
            print_status(f"Querying account info for: {solana_address}", "INFO")
            response = await client.post(
                "http://localhost:8028/v1/call-tool",
                headers=headers,
                json={
                    "server": "web3-rpc",
                    "Name": "getAccountInfo",
                    "arguments": {
                        "address": solana_address
                    }
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                print_status(f"✓ Solana account info query successful (HTTP {response.status_code})", "SUCCESS")
                print(f"Account Info Result: {json.dumps(result, indent=2, ensure_ascii=False)}")
                return True
            else:
                print_status(f"✗ Solana account info query failed (HTTP {response.status_code})", "ERROR")
                print(f"Response: {response.text}")
                return False
                
    except Exception as e:
        print_status(f"✗ Solana account test failed: {e}", "ERROR")
        return False

async def main():
    """主函数"""
    print("=" * 60)
    print("MCPRouter 简化测试")
    print("=" * 60)
    
    # 检查端口状态
    print_status("Checking MCPRouter services...", "INFO")
    
    api_running = check_port(8028)
    proxy_running = check_port(8025)
    
    if api_running:
        print_status("✓ MCPRouter API Server (port 8028) is running", "SUCCESS")
    else:
        print_status("✗ MCPRouter API Server (port 8028) is not running", "ERROR")
    
    if proxy_running:
        print_status("✓ MCPRouter Proxy Server (port 8025) is running", "SUCCESS")
    else:
        print_status("✗ MCPRouter Proxy Server (port 8025) is not running", "ERROR")
    
    if not api_running and not proxy_running:
        print_status("✗ No MCPRouter services are running", "ERROR")
        print("\n请先启动 MCPRouter 服务:")
        print("API Server: cd Demo_Echo_Backend/mcprouter && go run main.go api")
        print("Proxy Server: cd Demo_Echo_Backend/mcprouter && go run main.go proxy")
        print("注意: API服务器默认运行在8028端口")
        return False
    
    print()
    
    # 测试 API
    api_success = False
    if api_running:
        api_success = await test_mcprouter_api()
    
    # 测试 Proxy
    proxy_success = False
    if proxy_running:
        proxy_success = await test_mcprouter_proxy()
    
    # 测试 Solana 账户信息
    print()
    print_status("Testing Solana Blockchain Integration...", "INFO")
    solana_success = await test_solana_account()
    
    print()
    print("=" * 60)
    print("测试结果")
    print("=" * 60)
    
    if api_success:
        print_status("✓ MCPRouter API 测试通过", "SUCCESS")
    else:
        print_status("✗ MCPRouter API 测试失败", "ERROR")
    
    if proxy_success:
        print_status("✓ MCPRouter Proxy 测试通过", "SUCCESS")
    else:
        print_status("✗ MCPRouter Proxy 测试失败", "WARNING")
    
    if solana_success:
        print_status("✓ Solana 账户信息查询测试通过", "SUCCESS")
    else:
        print_status("✗ Solana 账户信息查询测试失败", "ERROR")
    
    if api_success and solana_success:
        print_status("🎉 MCPRouter 核心功能和区块链集成正常！", "SUCCESS")
        return True
    else:
        print_status("❌ MCPRouter 功能异常", "ERROR")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n测试过程中发生错误: {e}")
        sys.exit(1)
