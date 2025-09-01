#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MCPRouter 快速状态检查脚本
快速检查所有服务的运行状态
"""

import asyncio
import httpx
import subprocess
import sys
import time

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

async def test_endpoint(url: str, name: str) -> bool:
    """测试API端点"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                print_status(f"✓ {name} is responding (HTTP {response.status_code})", "SUCCESS")
                return True
            else:
                print_status(f"✗ {name} failed (HTTP {response.status_code})", "ERROR")
                return False
    except Exception as e:
        print_status(f"✗ {name} is not responding: {e}", "ERROR")
        return False

async def main():
    """主函数"""
    print("=" * 50)
    print("MCPRouter 服务状态检查")
    print("=" * 50)
    
    # 检查端口状态
    print_status("Checking port status...", "INFO")
    
    ports = {
        8027: "MCPRouter API Server",
        8025: "MCPRouter Proxy Server", 
        8000: "Python Backend Server"
    }
    
    port_status = {}
    for port, name in ports.items():
        if check_port(port):
            print_status(f"✓ {name} (port {port}) is running", "SUCCESS")
            port_status[port] = True
        else:
            print_status(f"✗ {name} (port {port}) is not running", "ERROR")
            port_status[port] = False
    
    print()
    
    # 测试API端点
    print_status("Testing API endpoints...", "INFO")
    
    endpoints = [
        ("http://localhost:8027/v1/list-servers", "MCPRouter API - List Servers"),
        ("http://localhost:8025", "MCPRouter Proxy"),
        ("http://localhost:8000/health", "Backend Health Check"),
        ("http://localhost:8000/tools", "Backend Tools API")
    ]
    
    endpoint_results = []
    for url, name in endpoints:
        result = await test_endpoint(url, name)
        endpoint_results.append(result)
    
    print()
    print("=" * 50)
    print("状态汇总")
    print("=" * 50)
    
    # 端口状态汇总
    running_ports = sum(port_status.values())
    total_ports = len(port_status)
    print(f"端口状态: {running_ports}/{total_ports} 服务运行中")
    
    # API端点状态汇总
    working_endpoints = sum(endpoint_results)
    total_endpoints = len(endpoint_results)
    print(f"API状态: {working_endpoints}/{total_endpoints} 端点正常")
    
    # 总体状态
    if running_ports == total_ports and working_endpoints == total_endpoints:
        print_status("🎉 所有服务运行正常！", "SUCCESS")
        return True
    elif running_ports == total_ports:
        print_status("⚠️ 服务已启动但部分API不可用", "WARNING")
        return False
    else:
        print_status("❌ 部分服务未启动", "ERROR")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        if not success:
            print("\n启动服务命令:")
            print("1. MCPRouter: cd Demo_Echo_Backend && .\\start-mcprouter.bat")
            print("2. Backend: cd Demo_Echo_Backend\\backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000")
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n检查被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n检查过程中发生错误: {e}")
        sys.exit(1)
