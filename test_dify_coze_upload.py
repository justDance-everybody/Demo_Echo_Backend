#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
专门测试Dify/Coze工具上传Bug修复的脚本
验证开发者工具上传功能是否正常工作
"""

import sys
import io
import requests
import json
import time
from datetime import datetime

# 修复 Windows 控制台编码问题
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:8000"

def log_test(message, status="INFO"):
    symbols = {"INFO": "[INFO]", "SUCCESS": "[OK]", "ERROR": "[ERR]", "TEST": "[TEST]"}
    print(f"{symbols.get(status, '[INFO]')} {message}")

def get_developer_token():
    """获取开发者权限的JWT token"""
    log_test("创建开发者测试用户...", "TEST")
    
    # 创建开发者用户
    register_data = {
        "username": "devtest_v2",
        "password": "dev123456",
        "email": "dev@test.com",
        "role": "developer"  # 添加开发者角色
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=register_data)
        if response.status_code in [200, 201]:
            log_test("开发者用户创建成功", "SUCCESS")
        elif response.status_code == 409:
            log_test("开发者用户已存在，继续登录", "INFO")
        
        # 登录获取token
        login_data = {"username": "devtest_v2", "password": "dev123456"}
        response = requests.post(f"{BASE_URL}/api/v1/auth/token", data=login_data)
        
        if response.status_code == 200:
            token_data = response.json()
            token = token_data.get("access_token")
            role = token_data.get("role", "unknown")
            log_test(f"登录成功，角色: {role}", "SUCCESS")
            return token
        else:
            log_test(f"登录失败: {response.status_code}", "ERROR")
            return None
            
    except Exception as e:
        log_test(f"认证过程出错: {e}", "ERROR")
        return None

def test_dify_tool_creation(token):
    """测试创建Dify平台工具"""
    log_test("测试1: 创建Dify平台工具", "TEST")
    
    # 使用时间戳创建唯一ID
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dify_tool = {
        "tool_id": f"dify_test_chat_{timestamp}",
        "name": "Dify测试助手",
        "type": "http",
        "description": "测试Dify平台集成功能",
        "endpoint": {
            "platform": "dify",
            "api_key": "app-test123456",
            "base_url": "https://api.dify.ai/v1",
            "app_config": {
                "response_mode": "blocking",
                "timeout": 30
            }
        },
        "request_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "用户的问题或请求"
                }
            },
            "required": ["query"]
        },
        "version": "1.0.0",
        "tags": ["dify", "test", "ai"],
        "is_public": True
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/dev/tools", 
            json=dify_tool, 
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            log_test(f"Dify工具创建成功: {result.get('tool_id')}", "SUCCESS")
            return True
        else:
            error_info = response.text
            log_test(f"Dify工具创建失败: {response.status_code} - {error_info}", "ERROR")
            return False
            
    except Exception as e:
        log_test(f"Dify工具创建出错: {e}", "ERROR")
        return False

def test_coze_tool_creation(token):
    """测试创建Coze平台工具"""
    log_test("测试2: 创建Coze平台工具", "TEST")
    
    # 使用时间戳创建唯一ID
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    coze_tool = {
        "tool_id": f"coze_test_bot_{timestamp}",
        "name": "Coze测试机器人",
        "type": "http", 
        "description": "测试Coze平台集成功能",
        "endpoint": {
            "platform": "coze",
            "api_key": "coze-test-key-123456",
            "base_url": "https://api.coze.com/open_api/v2",
            "app_config": {
                "bot_id": "test_bot_12345",
                "timeout": 30
            }
        },
        "request_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "用户的问题"
                }
            },
            "required": ["query"]
        },
        "version": "1.0.0",
        "tags": ["coze", "test", "bot"],
        "is_public": True
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/dev/tools",
            json=coze_tool,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            log_test(f"Coze工具创建成功: {result.get('tool_id')}", "SUCCESS") 
            return True
        else:
            error_info = response.text
            log_test(f"Coze工具创建失败: {response.status_code} - {error_info}", "ERROR")
            return False
            
    except Exception as e:
        log_test(f"Coze工具创建出错: {e}", "ERROR")
        return False

def test_invalid_tool_rejection(token):
    """测试无效工具配置被正确拒绝"""
    log_test("测试3: 验证无效配置被拒绝", "TEST")
    
    # 使用时间戳创建唯一ID
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # 测试缺少platform字段的HTTP工具
    invalid_tool = {
        "tool_id": f"invalid_http_tool_{timestamp}",
        "name": "无效HTTP工具",
        "type": "http",
        "endpoint": {
            # 故意缺少platform字段
            "api_key": "test123"
        },
        "request_schema": {"type": "object"}
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/dev/tools",
            json=invalid_tool,
            headers=headers
        )
        
        if response.status_code == 422:  # 应该返回验证错误
            log_test("无效配置正确被拒绝", "SUCCESS")
            return True
        elif response.status_code == 200:
            log_test("错误：无效配置被错误接受", "ERROR")
            return False
        else:
            log_test(f"意外响应: {response.status_code}", "ERROR") 
            return False
            
    except Exception as e:
        log_test(f"测试无效配置时出错: {e}", "ERROR")
        return False

def test_tools_list(token):
    """测试工具列表查询"""
    log_test("测试4: 查询工具列表", "TEST")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/dev/tools", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            tools_count = result.get("total", 0) if isinstance(result, dict) else len(result)
            log_test(f"开发者工具列表查询成功，发现 {tools_count} 个工具", "SUCCESS")
            
            # 显示工具详情
            tools = result.get("tools", []) if isinstance(result, dict) else result
            for tool in tools[:3]:  # 显示前3个
                if isinstance(tool, dict):
                    name = tool.get("name", "Unknown")
                    tool_type = tool.get("type", "Unknown")
                    platform = tool.get("endpoint", {}).get("platform", "N/A") if tool.get("type") == "http" else "N/A"
                    log_test(f"  🔧 {name} ({tool_type}) - 平台: {platform}")
            
            return True
        else:
            log_test(f"工具列表查询失败: {response.status_code}", "ERROR")
            return False
            
    except Exception as e:
        log_test(f"工具列表查询出错: {e}", "ERROR")
        return False

def run_dify_coze_test():
    """运行Dify/Coze工具上传功能完整测试"""
    log_test("="*60)
    log_test("🎯 开始测试Dify/Coze工具上传Bug修复")
    log_test("="*60)
    
    # 获取开发者token
    token = get_developer_token()
    if not token:
        log_test("❌ 无法获取开发者token，测试终止", "ERROR")
        return False
    
    # 运行各项测试
    tests = [
        ("创建Dify平台工具", lambda: test_dify_tool_creation(token)),
        ("创建Coze平台工具", lambda: test_coze_tool_creation(token)),
        ("验证无效配置拒绝", lambda: test_invalid_tool_rejection(token)),
        ("查询开发者工具列表", lambda: test_tools_list(token))
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
            time.sleep(1)  # 避免请求过快
        except Exception as e:
            log_test(f"执行测试 '{test_name}' 时出错: {e}", "ERROR")
            results.append((test_name, False))
    
    # 测试总结
    log_test("="*60)
    log_test("🏆 Dify/Coze工具上传功能测试结果:")
    log_test("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        log_test(f"{status} - {test_name}")
    
    success_rate = (passed / total) * 100
    log_test("")
    log_test(f"📊 成功率: {success_rate:.1f}% ({passed}/{total})")
    
    if success_rate == 100:
        log_test("🎉 Dify/Coze工具上传Bug修复完全成功！", "SUCCESS")
    elif success_rate >= 75:
        log_test("⚠️ 大部分功能正常，部分细节需要调试", "INFO")
    else:
        log_test("❌ 需要进一步修复问题", "ERROR")
    
    return success_rate >= 75

if __name__ == "__main__":
    success = run_dify_coze_test()
    exit(0 if success else 1)
