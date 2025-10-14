#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dify/Coze Tool Upload Bug Fix Test
Test the core functionality without Unicode issues
"""

import sys
import io
import requests
import json
from datetime import datetime

# 修复 Windows 控制台编码问题
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:8000"

def print_test(message, status="INFO"):
    status_prefix = {"INFO": "[INFO]", "SUCCESS": "[OK]", "ERROR": "[ERROR]", "TEST": "[TEST]"}
    print(f"{status_prefix.get(status, '[INFO]')} {message}")

def get_token():
    """Get developer JWT token"""
    print_test("Creating developer user...", "TEST")
    
    # Register developer user with developer role
    register_data = {
        "username": "devtest123",
        "password": "devpass123", 
        "email": "dev123@test.com",
        "role": "developer"  # 添加开发者角色
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=register_data)
        if response.status_code == 409:
            print_test("User exists, logging in...", "INFO")
        
        # Login
        login_data = {"username": "devtest123", "password": "devpass123"}
        response = requests.post(f"{BASE_URL}/api/v1/auth/token", data=login_data)
        
        if response.status_code == 200:
            token_data = response.json()
            print_test(f"Login successful, role: {token_data.get('role')}", "SUCCESS")
            return token_data.get("access_token")
        else:
            print_test(f"Login failed: {response.status_code}", "ERROR")
            return None
            
    except Exception as e:
        print_test(f"Auth error: {e}", "ERROR")
        return None

def test_dify_creation(token):
    """Test Dify tool creation"""
    print_test("Test 1: Creating Dify platform tool", "TEST")
    
    # 使用时间戳创建唯一ID
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dify_tool = {
        "tool_id": f"dify_test_tool_{timestamp}",
        "name": "Dify Test Assistant",
        "type": "http",
        "description": "Test Dify platform integration",
        "endpoint": {
            "platform": "dify",
            "api_key": "app-test-key-123",
            "base_url": "https://api.dify.ai/v1"
        },
        "request_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "User query"}
            },
            "required": ["query"]
        },
        "version": "1.0.0",
        "is_public": True
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/dev/tools", json=dify_tool, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            print_test(f"Dify tool created: {result.get('tool_id')}", "SUCCESS")
            return True
        else:
            print_test(f"Dify creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    except Exception as e:
        print_test(f"Dify test error: {e}", "ERROR")
        return False

def test_coze_creation(token):
    """Test Coze tool creation"""
    print_test("Test 2: Creating Coze platform tool", "TEST")
    
    # 使用时间戳创建唯一ID
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    coze_tool = {
        "tool_id": f"coze_test_tool_{timestamp}",
        "name": "Coze Test Bot", 
        "type": "http",
        "description": "Test Coze platform integration",
        "endpoint": {
            "platform": "coze",
            "api_key": "coze-test-key-456",
            "base_url": "https://api.coze.com/open_api/v2",
            "app_config": {
                "bot_id": "test_bot_789"
            }
        },
        "request_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "User query"}
            },
            "required": ["query"]
        },
        "version": "1.0.0",
        "is_public": True
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/dev/tools", json=coze_tool, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            print_test(f"Coze tool created: {result.get('tool_id')}", "SUCCESS")
            return True
        else:
            print_test(f"Coze creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    except Exception as e:
        print_test(f"Coze test error: {e}", "ERROR")
        return False

def test_validation(token):
    """Test validation logic - verify invalid config is rejected"""
    print_test("Test 3: Testing validation logic", "TEST")
    
    # 使用时间戳创建唯一ID
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # 测试缺少platform字段的HTTP工具（应该被拒绝）
    invalid_tool = {
        "tool_id": f"invalid_tool_{timestamp}",
        "name": "Invalid HTTP Tool",
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
            print_test("Invalid config correctly rejected (422)", "SUCCESS")
            return True
        elif response.status_code == 200:
            print_test("ERROR: Invalid config was incorrectly accepted", "ERROR")
            return False
        else:
            print_test(f"Unexpected response: {response.status_code}", "ERROR")
            return False
            
    except Exception as e:
        print_test(f"Validation test error: {e}", "ERROR")
        return False

def main():
    """Main test function"""
    print("=" * 60)
    print("DIFY/COZE TOOL UPLOAD BUG FIX TEST")  
    print("=" * 60)
    
    # Get token
    token = get_token()
    if not token:
        print_test("Cannot get token, test aborted", "ERROR")
        return False
    
    # Run tests
    tests = [
        test_dify_creation,
        test_coze_creation,
        test_validation
    ]
    
    results = []
    for i, test_func in enumerate(tests, 1):
        try:
            result = test_func(token)
            results.append(result)
        except Exception as e:
            print_test(f"Test {i} error: {e}", "ERROR")
            results.append(False)
    
    # Summary
    print("=" * 60)
    print("TEST RESULTS:")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Passed: {passed}/{total}")
    print(f"Success Rate: {(passed/total*100):.1f}%")
    
    if passed == total:
        print_test("ALL TESTS PASSED - Bug fix successful!", "SUCCESS")
    else:
        print_test("Some tests failed - needs investigation", "ERROR")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
