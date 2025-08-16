#!/usr/bin/env python3
"""
实习生后端API测试运行器

这个脚本提供了完整的后端API测试套件，包括：
- 用户认证和注册
- 意图解析和确认
- 工具管理和执行
- 开发者功能
- MCP服务器管理
- 系统健康检查

使用方法：
    python test_runner.py                    # 运行所有测试
    python test_runner.py --module auth      # 只运行认证模块测试
    python test_runner.py --verbose          # 详细输出
    python test_runner.py --report           # 生成测试报告
"""

import asyncio
import argparse
import json
import time
import sys
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from pathlib import Path

import httpx
import pytest
from loguru import logger

# 配置日志
logger.remove()
logger.add(sys.stdout, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>")
logger.add("logs/test_runner.log", rotation="10 MB")

@dataclass
class TestResult:
    """测试结果数据类"""
    module: str
    test_name: str
    status: str  # 'PASS', 'FAIL', 'SKIP'
    duration: float
    error_message: Optional[str] = None
    response_data: Optional[Dict] = None

class APITester:
    """API测试器主类"""
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)
        self.auth_token: Optional[str] = None
        self.test_results: List[TestResult] = []
        self.test_users = {
            "user": {"username": "testuser", "password": "testpass123", "email": "test@example.com"},
            "developer": {"username": "developer", "password": "devpass123", "email": "dev@example.com"},
            "admin": {"username": "admin", "password": "adminpass123", "email": "admin@example.com"}
        }
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    def log_test_result(self, module: str, test_name: str, status: str, duration: float, 
                       error_message: str = None, response_data: Dict = None):
        """记录测试结果"""
        result = TestResult(
            module=module,
            test_name=test_name,
            status=status,
            duration=duration,
            error_message=error_message,
            response_data=response_data
        )
        self.test_results.append(result)
        
        status_color = "green" if status == "PASS" else "red" if status == "FAIL" else "yellow"
        logger.info(f"<{status_color}>{status}</{status_color}> {module}.{test_name} ({duration:.2f}s)")
        if error_message:
            logger.error(f"Error: {error_message}")
    
    async def test_health_check(self) -> bool:
        """测试系统健康检查"""
        start_time = time.time()
        try:
            response = await self.client.get(f"{self.base_url}/health")
            duration = time.time() - start_time
            
            if response.status_code == 200:
                self.log_test_result("system", "health_check", "PASS", duration, response_data=response.json())
                return True
            else:
                self.log_test_result("system", "health_check", "FAIL", duration, 
                                   f"Status code: {response.status_code}")
                return False
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("system", "health_check", "FAIL", duration, str(e))
            return False
    
    async def test_api_docs(self) -> bool:
        """测试API文档访问"""
        start_time = time.time()
        try:
            response = await self.client.get(f"{self.base_url}/docs")
            duration = time.time() - start_time
            
            if response.status_code == 200:
                self.log_test_result("system", "api_docs", "PASS", duration)
                return True
            else:
                self.log_test_result("system", "api_docs", "FAIL", duration, 
                                   f"Status code: {response.status_code}")
                return False
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("system", "api_docs", "FAIL", duration, str(e))
            return False
    
    async def test_user_registration(self, role: str = "user") -> bool:
        """测试用户注册"""
        start_time = time.time()
        user_data = self.test_users[role].copy()
        user_data["username"] = f"{user_data['username']}_{int(time.time())}"
        user_data["email"] = f"{int(time.time())}_{user_data['email']}"
        
        try:
            response = await self.client.post(
                f"{self.base_url}/api/v1/auth/register",
                json=user_data
            )
            duration = time.time() - start_time
            
            if response.status_code in [200, 201]:
                self.log_test_result("auth", f"register_{role}", "PASS", duration, response_data=response.json())
                return True
            else:
                self.log_test_result("auth", f"register_{role}", "FAIL", duration, 
                                   f"Status code: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("auth", f"register_{role}", "FAIL", duration, str(e))
            return False
    
    async def test_user_login(self, role: str = "user") -> bool:
        """测试用户登录"""
        start_time = time.time()
        user_data = self.test_users[role]
        
        try:
            response = await self.client.post(
                f"{self.base_url}/api/v1/auth/token",
                data={
                    "username": user_data["username"],
                    "password": user_data["password"]
                }
            )
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.auth_token = data["access_token"]
                    self.log_test_result("auth", f"login_{role}", "PASS", duration, response_data=data)
                    return True
                else:
                    self.log_test_result("auth", f"login_{role}", "FAIL", duration, "No access_token in response")
                    return False
            else:
                self.log_test_result("auth", f"login_{role}", "FAIL", duration, 
                                   f"Status code: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("auth", f"login_{role}", "FAIL", duration, str(e))
            return False
    
    async def test_get_current_user(self) -> bool:
        """测试获取当前用户信息"""
        if not self.auth_token:
            self.log_test_result("auth", "get_current_user", "SKIP", 0, "No auth token available")
            return False
        
        start_time = time.time()
        try:
            response = await self.client.get(
                f"{self.base_url}/api/v1/auth/me",
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            duration = time.time() - start_time
            
            if response.status_code == 200:
                self.log_test_result("auth", "get_current_user", "PASS", duration, response_data=response.json())
                return True
            else:
                self.log_test_result("auth", "get_current_user", "FAIL", duration, 
                                   f"Status code: {response.status_code}")
                return False
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("auth", "get_current_user", "FAIL", duration, str(e))
            return False
    
    async def test_intent_interpretation(self) -> bool:
        """测试意图解析"""
        if not self.auth_token:
            self.log_test_result("intent", "interpret", "SKIP", 0, "No auth token available")
            return False
        
        start_time = time.time()
        test_inputs = [
            "查询北京的天气",
            "计算 2 + 3 * 4",
            "帮我处理这段文本：Hello World",
            "今天是几号？"
        ]
        
        success_count = 0
        for i, text_input in enumerate(test_inputs):
            try:
                response = await self.client.post(
                    f"{self.base_url}/api/v1/intent/interpret",
                    json={"input": text_input},
                    headers={"Authorization": f"Bearer {self.auth_token}"}
                )
                
                if response.status_code == 200:
                    success_count += 1
                    logger.info(f"Intent test {i+1}/4 passed: {text_input[:30]}...")
                else:
                    logger.warning(f"Intent test {i+1}/4 failed: {response.status_code}")
            except Exception as e:
                logger.error(f"Intent test {i+1}/4 error: {str(e)}")
        
        duration = time.time() - start_time
        if success_count >= len(test_inputs) // 2:  # 至少一半成功
            self.log_test_result("intent", "interpret", "PASS", duration, 
                               response_data={"success_rate": f"{success_count}/{len(test_inputs)}"})
            return True
        else:
            self.log_test_result("intent", "interpret", "FAIL", duration, 
                               f"Only {success_count}/{len(test_inputs)} tests passed")
            return False
    
    async def test_tools_list(self) -> bool:
        """测试获取工具列表"""
        if not self.auth_token:
            self.log_test_result("tools", "list", "SKIP", 0, "No auth token available")
            return False
        
        start_time = time.time()
        try:
            response = await self.client.get(
                f"{self.base_url}/api/v1/tools",
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.log_test_result("tools", "list", "PASS", duration, response_data=data)
                return True
            else:
                self.log_test_result("tools", "list", "FAIL", duration, 
                                   f"Status code: {response.status_code}")
                return False
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("tools", "list", "FAIL", duration, str(e))
            return False
    
    async def test_tool_execution(self) -> bool:
        """测试工具执行"""
        if not self.auth_token:
            self.log_test_result("tools", "execute", "SKIP", 0, "No auth token available")
            return False
        
        start_time = time.time()
        try:
            # 测试计算器工具
            response = await self.client.post(
                f"{self.base_url}/api/v1/execute",
                json={
                    "tool_id": "calculator_tool",
                    "parameters": {"expression": "2 + 3"}
                },
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            duration = time.time() - start_time
            
            if response.status_code == 200:
                self.log_test_result("tools", "execute", "PASS", duration, response_data=response.json())
                return True
            else:
                self.log_test_result("tools", "execute", "FAIL", duration, 
                                   f"Status code: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("tools", "execute", "FAIL", duration, str(e))
            return False
    
    async def test_dev_tools_management(self) -> bool:
        """测试开发者工具管理"""
        if not self.auth_token:
            self.log_test_result("dev", "tools_management", "SKIP", 0, "No auth token available")
            return False
        
        start_time = time.time()
        try:
            # 获取开发者工具列表
            response = await self.client.get(
                f"{self.base_url}/api/v1/dev/tools",
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code in [200, 403]:  # 403表示权限不足，但API正常工作
                duration = time.time() - start_time
                self.log_test_result("dev", "tools_management", "PASS", duration, response_data=response.json())
                return True
            else:
                duration = time.time() - start_time
                self.log_test_result("dev", "tools_management", "FAIL", duration, 
                                   f"Status code: {response.status_code}")
                return False
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("dev", "tools_management", "FAIL", duration, str(e))
            return False
    
    async def test_mcp_status(self) -> bool:
        """测试MCP服务器状态"""
        if not self.auth_token:
            self.log_test_result("mcp", "status", "SKIP", 0, "No auth token available")
            return False
        
        start_time = time.time()
        try:
            response = await self.client.get(
                f"{self.base_url}/api/v1/mcp/status",
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            duration = time.time() - start_time
            
            if response.status_code == 200:
                self.log_test_result("mcp", "status", "PASS", duration, response_data=response.json())
                return True
            else:
                self.log_test_result("mcp", "status", "FAIL", duration, 
                                   f"Status code: {response.status_code}")
                return False
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("mcp", "status", "FAIL", duration, str(e))
            return False
    
    async def run_auth_tests(self) -> Dict[str, bool]:
        """运行认证模块测试"""
        logger.info("🔐 开始认证模块测试...")
        results = {}
        
        # 测试用户注册
        results["register_user"] = await self.test_user_registration("user")
        results["register_developer"] = await self.test_user_registration("developer")
        
        # 测试用户登录
        results["login_user"] = await self.test_user_login("user")
        if results["login_user"]:
            results["get_current_user"] = await self.test_get_current_user()
        
        return results
    
    async def run_intent_tests(self) -> Dict[str, bool]:
        """运行意图解析模块测试"""
        logger.info("🧠 开始意图解析模块测试...")
        results = {}
        
        # 确保有认证令牌
        if not self.auth_token:
            await self.test_user_login("user")
        
        results["interpret"] = await self.test_intent_interpretation()
        
        return results
    
    async def run_tools_tests(self) -> Dict[str, bool]:
        """运行工具模块测试"""
        logger.info("🔧 开始工具模块测试...")
        results = {}
        
        # 确保有认证令牌
        if not self.auth_token:
            await self.test_user_login("user")
        
        results["list"] = await self.test_tools_list()
        results["execute"] = await self.test_tool_execution()
        
        return results
    
    async def run_dev_tests(self) -> Dict[str, bool]:
        """运行开发者模块测试"""
        logger.info("👨‍💻 开始开发者模块测试...")
        results = {}
        
        # 使用开发者账号登录
        await self.test_user_login("developer")
        
        results["tools_management"] = await self.test_dev_tools_management()
        
        return results
    
    async def run_mcp_tests(self) -> Dict[str, bool]:
        """运行MCP模块测试"""
        logger.info("🔌 开始MCP模块测试...")
        results = {}
        
        # 确保有认证令牌
        if not self.auth_token:
            await self.test_user_login("user")
        
        results["status"] = await self.test_mcp_status()
        
        return results
    
    async def run_system_tests(self) -> Dict[str, bool]:
        """运行系统模块测试"""
        logger.info("⚙️ 开始系统模块测试...")
        results = {}
        
        results["health_check"] = await self.test_health_check()
        results["api_docs"] = await self.test_api_docs()
        
        return results
    
    async def run_all_tests(self, modules: List[str] = None) -> Dict[str, Dict[str, bool]]:
        """运行所有测试或指定模块的测试"""
        all_results = {}
        
        if modules is None:
            modules = ["system", "auth", "intent", "tools", "dev", "mcp"]
        
        for module in modules:
            if module == "system":
                all_results["system"] = await self.run_system_tests()
            elif module == "auth":
                all_results["auth"] = await self.run_auth_tests()
            elif module == "intent":
                all_results["intent"] = await self.run_intent_tests()
            elif module == "tools":
                all_results["tools"] = await self.run_tools_tests()
            elif module == "dev":
                all_results["dev"] = await self.run_dev_tests()
            elif module == "mcp":
                all_results["mcp"] = await self.run_mcp_tests()
            else:
                logger.warning(f"Unknown module: {module}")
        
        return all_results
    
    def generate_report(self, output_file: str = "test_report.html"):
        """生成测试报告"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r.status == "PASS"])
        failed_tests = len([r for r in self.test_results if r.status == "FAIL"])
        skipped_tests = len([r for r in self.test_results if r.status == "SKIP"])
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>API测试报告</title>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
        .summary {{ margin: 20px 0; }}
        .test-result {{ margin: 10px 0; padding: 10px; border-radius: 5px; }}
        .pass {{ background-color: #d4edda; border-left: 5px solid #28a745; }}
        .fail {{ background-color: #f8d7da; border-left: 5px solid #dc3545; }}
        .skip {{ background-color: #fff3cd; border-left: 5px solid #ffc107; }}
        .details {{ margin-top: 10px; font-size: 0.9em; color: #666; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>API测试报告</h1>
        <p>生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    </div>
    
    <div class="summary">
        <h2>测试概要</h2>
        <table>
            <tr><th>总测试数</th><td>{total_tests}</td></tr>
            <tr><th>通过</th><td style="color: green;">{passed_tests}</td></tr>
            <tr><th>失败</th><td style="color: red;">{failed_tests}</td></tr>
            <tr><th>跳过</th><td style="color: orange;">{skipped_tests}</td></tr>
            <tr><th>成功率</th><td>{success_rate:.1f}%</td></tr>
        </table>
    </div>
    
    <div class="results">
        <h2>详细结果</h2>
"""
        
        for result in self.test_results:
            css_class = result.status.lower()
            html_content += f"""
        <div class="test-result {css_class}">
            <strong>{result.module}.{result.test_name}</strong> - {result.status} ({result.duration:.2f}s)
            <div class="details">
"""
            if result.error_message:
                html_content += f"<p>错误: {result.error_message}</p>"
            if result.response_data:
                html_content += f"<p>响应数据: {json.dumps(result.response_data, indent=2, ensure_ascii=False)}</p>"
            html_content += "</div></div>"
        
        html_content += """
    </div>
</body>
</html>
"""
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        logger.info(f"测试报告已生成: {output_file}")
        logger.info(f"测试概要: {passed_tests}/{total_tests} 通过 ({success_rate:.1f}%)")

async def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="实习生后端API测试运行器")
    parser.add_argument("--module", choices=["system", "auth", "intent", "tools", "dev", "mcp"], 
                       help="只运行指定模块的测试")
    parser.add_argument("--verbose", action="store_true", help="详细输出")
    parser.add_argument("--report", action="store_true", help="生成HTML测试报告")
    parser.add_argument("--base-url", default="http://localhost:3000", help="API基础URL")
    
    args = parser.parse_args()
    
    # 设置日志级别
    if args.verbose:
        logger.remove()
        logger.add(sys.stdout, level="DEBUG")
    
    logger.info("🚀 开始API测试...")
    
    async with APITester(args.base_url) as tester:
        modules = [args.module] if args.module else None
        results = await tester.run_all_tests(modules)
        
        # 打印结果摘要
        logger.info("\n📊 测试结果摘要:")
        for module, module_results in results.items():
            passed = sum(1 for success in module_results.values() if success)
            total = len(module_results)
            logger.info(f"  {module}: {passed}/{total} 通过")
        
        # 生成报告
        if args.report:
            tester.generate_report()
        
        # 返回适当的退出码
        total_passed = sum(sum(1 for success in module_results.values() if success) 
                          for module_results in results.values())
        total_tests = sum(len(module_results) for module_results in results.values())
        
        if total_passed == total_tests:
            logger.info("✅ 所有测试通过!")
            return 0
        else:
            logger.warning(f"⚠️ {total_tests - total_passed} 个测试失败")
            return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)