#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MCPRouter 完整系统测试脚本
测试 MCPRouter API、Python 后端和工具调用功能
"""

import asyncio
import json
import time
import httpx
from typing import Dict, Any, Optional
import sys
import os

# 添加项目根目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

class MCPRouterTester:
    """MCPRouter 系统测试类"""
    
    def __init__(self):
        self.mcprouter_api_url = "http://localhost:8027"
        self.backend_api_url = "http://localhost:8000"
        self.timeout = 30.0
        
    def print_status(self, message: str, status: str = "INFO"):
        """打印状态信息"""
        colors = {
            "INFO": "\033[94m",    # 蓝色
            "SUCCESS": "\033[92m", # 绿色
            "WARNING": "\033[93m", # 黄色
            "ERROR": "\033[91m",   # 红色
            "RESET": "\033[0m"     # 重置
        }
        print(f"{colors.get(status, colors['INFO'])}[{status}]{colors['RESET']} {message}")
    
    async def test_mcprouter_api(self) -> bool:
        """测试 MCPRouter API 服务"""
        self.print_status("Testing MCPRouter API Server...", "INFO")
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # 测试 list-servers 端点
                response = await client.get(f"{self.mcprouter_api_url}/v1/list-servers")
                if response.status_code == 200:
                    self.print_status(f"✓ List servers endpoint working (HTTP {response.status_code})", "SUCCESS")
                    servers = response.json()
                    self.print_status(f"Available servers: {list(servers.keys()) if isinstance(servers, dict) else servers}")
                else:
                    self.print_status(f"✗ List servers failed (HTTP {response.status_code})", "ERROR")
                    return False
                
                # 测试 list-tools 端点
                if isinstance(servers, dict) and servers:
                    first_server = list(servers.keys())[0]
                    response = await client.get(f"{self.mcprouter_api_url}/v1/list-tools?server={first_server}")
                    if response.status_code == 200:
                        self.print_status(f"✓ List tools endpoint working for {first_server}", "SUCCESS")
                        tools = response.json()
                        self.print_status(f"Available tools: {len(tools) if isinstance(tools, list) else 'N/A'}")
                    else:
                        self.print_status(f"✗ List tools failed for {first_server} (HTTP {response.status_code})", "WARNING")
                
                return True
                
        except Exception as e:
            self.print_status(f"✗ MCPRouter API test failed: {e}", "ERROR")
            return False
    
    async def test_backend_api(self) -> bool:
        """测试 Python 后端 API 服务"""
        self.print_status("Testing Python Backend API Server...", "INFO")
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # 测试健康检查端点
                response = await client.get(f"{self.backend_api_url}/health")
                if response.status_code == 200:
                    self.print_status(f"✓ Backend health check working (HTTP {response.status_code})", "SUCCESS")
                else:
                    self.print_status(f"✗ Backend health check failed (HTTP {response.status_code})", "ERROR")
                    return False
                
                # 测试工具列表端点
                response = await client.get(f"{self.backend_api_url}/api/v1/tools/public")
                if response.status_code == 200:
                    self.print_status(f"✓ Backend tools endpoint working (HTTP {response.status_code})", "SUCCESS")
                    tools = response.json()
                    self.print_status(f"Backend tools count: {len(tools.get('tools', [])) if isinstance(tools, dict) else 'N/A'}")
                else:
                    self.print_status(f"✗ Backend tools endpoint failed (HTTP {response.status_code})", "WARNING")
                
                return True
                
        except Exception as e:
            self.print_status(f"✗ Backend API test failed: {e}", "ERROR")
            return False
    
    async def test_tool_execution(self) -> bool:
        """测试工具执行功能"""
        self.print_status("Testing Tool Execution...", "INFO")
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # 获取可用工具
                response = await client.get(f"{self.backend_api_url}/api/v1/tools/public")
                if response.status_code != 200:
                    self.print_status("✗ Cannot get tools list for execution test", "ERROR")
                    return False
                
                tools_data = response.json()
                tools = tools_data.get('tools', []) if isinstance(tools_data, dict) else []
                if not tools or not isinstance(tools, list):
                    self.print_status("✗ No tools available for execution test", "WARNING")
                    return False
                
                # 选择第一个MCP工具进行测试
                mcp_tools = [tool for tool in tools if tool.get('type') == 'mcp']
                if not mcp_tools:
                    self.print_status("✗ No MCP tools available for execution test", "WARNING")
                    return False
                
                test_tool = mcp_tools[0]
                self.print_status(f"Testing tool: {test_tool.get('name', 'Unknown')}", "INFO")
                
                # 测试工具执行
                execution_data = {
                    "tool_id": test_tool.get('id'),
                    "params": {
                        "query": "Hello, this is a test execution"
                    }
                }
                
                response = await client.post(
                    f"{self.backend_api_url}/execute",
                    json=execution_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    self.print_status(f"✓ Tool execution successful", "SUCCESS")
                    self.print_status(f"Execution result: {result.get('result', 'N/A')[:100]}...")
                    return True
                else:
                    self.print_status(f"✗ Tool execution failed (HTTP {response.status_code})", "ERROR")
                    self.print_status(f"Error: {response.text}")
                    return False
                
        except Exception as e:
            self.print_status(f"✗ Tool execution test failed: {e}", "ERROR")
            return False
    
    async def test_mcprouter_integration(self) -> bool:
        """测试 MCPRouter 与后端的集成"""
        self.print_status("Testing MCPRouter Integration...", "INFO")
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # 测试通过后端调用 MCPRouter
                response = await client.get(f"{self.backend_api_url}/api/v1/tools/public")
                if response.status_code != 200:
                    return False
                
                tools_data = response.json()
                tools = tools_data.get('tools', []) if isinstance(tools_data, dict) else []
                mcp_tools = [tool for tool in tools if tool.get('type') == 'mcp']
                
                if mcp_tools:
                    self.print_status(f"✓ Found {len(mcp_tools)} MCP tools in backend", "SUCCESS")
                    return True
                else:
                    self.print_status("✗ No MCP tools found in backend", "WARNING")
                    return False
                
        except Exception as e:
            self.print_status(f"✗ Integration test failed: {e}", "ERROR")
            return False
    
    def check_services_status(self) -> Dict[str, bool]:
        """检查服务状态"""
        self.print_status("Checking Services Status...", "INFO")
        
        status = {}
        
        # 检查端口占用
        import subprocess
        try:
            # 检查 MCPRouter API 端口
            result = subprocess.run(['netstat', '-an'], capture_output=True, text=True)
            status['mcprouter_api'] = ':8027' in result.stdout and 'LISTENING' in result.stdout
            status['mcprouter_proxy'] = ':8025' in result.stdout and 'LISTENING' in result.stdout
            status['backend'] = ':8000' in result.stdout and 'LISTENING' in result.stdout
            
            if status['mcprouter_api']:
                self.print_status("✓ MCPRouter API Server (port 8027) is running", "SUCCESS")
            else:
                self.print_status("✗ MCPRouter API Server (port 8027) is not running", "ERROR")
                
            if status['mcprouter_proxy']:
                self.print_status("✓ MCPRouter Proxy Server (port 8025) is running", "SUCCESS")
            else:
                self.print_status("✗ MCPRouter Proxy Server (port 8025) is not running", "ERROR")
                
            if status['backend']:
                self.print_status("✓ Python Backend Server (port 8000) is running", "SUCCESS")
            else:
                self.print_status("✗ Python Backend Server (port 8000) is not running", "ERROR")
                
        except Exception as e:
            self.print_status(f"✗ Service status check failed: {e}", "ERROR")
            status = {'mcprouter_api': False, 'mcprouter_proxy': False, 'backend': False}
        
        return status
    
    async def run_full_test(self):
        """运行完整测试"""
        print("=" * 60)
        print("MCPRouter 完整系统测试")
        print("=" * 60)
        
        # 检查服务状态
        service_status = self.check_services_status()
        
        if not any(service_status.values()):
            self.print_status("✗ No services are running. Please start services first.", "ERROR")
            return False
        
        # 等待服务完全启动
        self.print_status("Waiting for services to be ready...", "INFO")
        await asyncio.sleep(3)
        
        # 运行测试
        test_results = {}
        
        # 测试 MCPRouter API
        if service_status.get('mcprouter_api'):
            test_results['mcprouter_api'] = await self.test_mcprouter_api()
        else:
            test_results['mcprouter_api'] = False
        
        # 测试后端 API
        if service_status.get('backend'):
            test_results['backend_api'] = await self.test_backend_api()
        else:
            test_results['backend_api'] = False
        
        # 测试集成
        if service_status.get('mcprouter_api') and service_status.get('backend'):
            test_results['integration'] = await self.test_mcprouter_integration()
        else:
            test_results['integration'] = False
        
        # 测试工具执行
        if all([service_status.get('mcprouter_api'), service_status.get('backend'), test_results.get('integration')]):
            test_results['tool_execution'] = await self.test_tool_execution()
        else:
            test_results['tool_execution'] = False
        
        # 输出测试结果
        print("\n" + "=" * 60)
        print("测试结果汇总")
        print("=" * 60)
        
        for test_name, result in test_results.items():
            status = "✓ PASS" if result else "✗ FAIL"
            color = "\033[92m" if result else "\033[91m"
            print(f"{color}{status}\033[0m {test_name}")
        
        passed_tests = sum(test_results.values())
        total_tests = len(test_results)
        
        print(f"\n总体结果: {passed_tests}/{total_tests} 测试通过")
        
        if passed_tests == total_tests:
            self.print_status("🎉 所有测试通过！系统运行正常", "SUCCESS")
            return True
        else:
            self.print_status("⚠️ 部分测试失败，请检查服务配置", "WARNING")
            return False

async def main():
    """主函数"""
    tester = MCPRouterTester()
    success = await tester.run_full_test()
    
    if not success:
        print("\n故障排除建议:")
        print("1. 确保 MCPRouter 服务已启动 (运行 start-mcprouter.bat)")
        print("2. 确保 Python 后端服务已启动 (运行 python -m uvicorn app.main:app --host 0.0.0.0 --port 8000)")
        print("3. 检查端口 8025, 8027, 8000 是否被占用")
        print("4. 检查配置文件是否正确")
    
    return success

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
