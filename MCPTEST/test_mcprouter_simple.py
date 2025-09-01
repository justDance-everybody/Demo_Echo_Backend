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
            # 测试 list-servers 端点
            response = await client.get("http://localhost:8027/v1/list-servers")
            if response.status_code == 200:
                servers = response.json()
                print_status(f"✓ List servers successful (HTTP {response.status_code})", "SUCCESS")
                print(f"Available servers: {json.dumps(servers, indent=2, ensure_ascii=False)}")
                
                # 测试 list-tools 端点
                if isinstance(servers, dict) and servers:
                    first_server = list(servers.keys())[0]
                    response = await client.get(f"http://localhost:8027/v1/list-tools?server={first_server}")
                    if response.status_code == 200:
                        tools = response.json()
                        print_status(f"✓ List tools successful for {first_server}", "SUCCESS")
                        print(f"Available tools: {json.dumps(tools, indent=2, ensure_ascii=False)}")
                    else:
                        print_status(f"✗ List tools failed for {first_server} (HTTP {response.status_code})", "WARNING")
                
                return True
            else:
                print_status(f"✗ List servers failed (HTTP {response.status_code})", "ERROR")
                return False
                
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

async def main():
    """主函数"""
    print("=" * 60)
    print("MCPRouter 简化测试")
    print("=" * 60)
    
    # 检查端口状态
    print_status("Checking MCPRouter services...", "INFO")
    
    api_running = check_port(8027)
    proxy_running = check_port(8025)
    
    if api_running:
        print_status("✓ MCPRouter API Server (port 8027) is running", "SUCCESS")
    else:
        print_status("✗ MCPRouter API Server (port 8027) is not running", "ERROR")
    
    if proxy_running:
        print_status("✓ MCPRouter Proxy Server (port 8025) is running", "SUCCESS")
    else:
        print_status("✗ MCPRouter Proxy Server (port 8025) is not running", "ERROR")
    
    if not api_running and not proxy_running:
        print_status("✗ No MCPRouter services are running", "ERROR")
        print("\n请先启动 MCPRouter 服务:")
        print("cd Demo_Echo_Backend && .\\start-mcprouter.bat")
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
    
    if api_success:
        print_status("🎉 MCPRouter 核心功能正常！", "SUCCESS")
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
