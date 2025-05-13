#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import json
import sys
import os
import time
from typing import Dict, Any, Optional, Tuple

# 设置API基础URL
BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"

# 测试用户信息
TEST_USERNAME = "testuser3"
TEST_PASSWORD = "testpassword123"

# 控制台颜色
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

# 打印彩色消息
def print_colored(message: str, color: str):
    print(f"{color}{message}{Colors.RESET}")

def print_step(step: str):
    print_colored(f"\n=== {step} ===", Colors.BLUE)

def print_info(message: str):
    print_colored(f"INFO: {message}", Colors.YELLOW)

def print_success(message: str):
    print_colored(f"✓ SUCCESS: {message}", Colors.GREEN)

def print_error(message: str):
    print_colored(f"✗ ERROR: {message}", Colors.RED)

def print_json(data: Dict[str, Any]):
    print(json.dumps(data, indent=2, ensure_ascii=False))

# 发送API请求的辅助函数
def api_request(
    method: str, 
    endpoint: str, 
    data: Optional[Dict[str, Any]] = None, 
    token: Optional[str] = None,
    expect_success: bool = True
) -> requests.Response:
    url = f"{BASE_URL}{API_PREFIX}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    print_info(f"发送 {method} 请求到 {url}")
    if data:
        print_info("请求数据:")
        print_json(data)
    
    if method.lower() == "get":
        response = requests.get(url, headers=headers)
    elif method.lower() == "post":
        response = requests.post(url, json=data, headers=headers)
    elif method.lower() == "put":
        response = requests.put(url, json=data, headers=headers)
    elif method.lower() == "delete":
        response = requests.delete(url, headers=headers)
    else:
        raise ValueError(f"不支持的HTTP方法: {method}")
    
    print_info(f"响应状态码: {response.status_code}")
    try:
        response_json = response.json()
        print_info("响应数据:")
        print_json(response_json)
    except:
        print_info(f"响应内容: {response.text}")
    
    if expect_success and response.status_code >= 400:
        print_error(f"请求失败: {response.status_code} - {response.text}")
    elif not expect_success and response.status_code < 400:
        print_error(f"请求成功，但期望失败: {response.status_code}")
    
    return response

# 检查API健康状态
def check_health():
    print_step("检查API健康状态")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print_success(f"API健康检查通过 - 状态: {data.get('status')}")
            return True
        else:
            print_error(f"API健康检查失败: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"API健康检查异常: {str(e)}")
        return False

# 用户登录函数 (使用表单数据)
def login(username: str, password: str, expect_success: bool = True) -> Optional[str]:
    print_step(f"登录用户: {username}")
    
    # OAuth2要求使用表单数据而非JSON
    url = f"{BASE_URL}{API_PREFIX}/auth/token"
    form_data = {
        "username": username,
        "password": password
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    print_info(f"发送 POST 请求到 {url}")
    print_info(f"表单数据: username={username}, password={'*' * len(password)}")
    
    response = requests.post(url, data=form_data, headers=headers)
    
    print_info(f"响应状态码: {response.status_code}")
    try:
        response_json = response.json()
        print_info("响应数据:")
        print_json(response_json)
    except:
        print_info(f"响应内容: {response.text}")
    
    if expect_success:
        if response.status_code == 200:
            print_success("登录成功")
            return response.json().get("access_token")
        else:
            print_error(f"登录失败: {response.status_code} - {response.text}")
            return None
    else:
        if response.status_code >= 400:
            print_success("预期的登录失败")
            return None
        else:
            print_error("登录成功，但期望失败")
            return response.json().get("access_token")

# 注册新用户
def register_user(username: str, password: str, expect_success: bool = True) -> Optional[Dict[str, Any]]:
    print_step(f"注册新用户: {username}")
    response = api_request(
        "post", 
        "/auth/register", 
        data={"username": username, "password": password},
        expect_success=expect_success
    )
    
    if expect_success and response.status_code == 201:
        print_success("用户注册成功")
        return response.json()
    elif not expect_success and response.status_code >= 400:
        print_success("预期的注册失败")
        return None
    
    return None

# 获取当前用户信息
def get_current_user(token: str):
    print_step("获取当前用户信息")
    response = api_request("get", "/auth/me", token=token)
    
    if response.status_code == 200:
        print_success("获取用户信息成功")
        return response.json()
    else:
        print_error(f"获取用户信息失败: {response.status_code} - {response.text}")
        return None

# 测试未授权访问
def test_unauthorized_access():
    print_step("测试未授权访问")
    response = api_request("get", "/auth/me", expect_success=False)
    
    if response.status_code == 401:
        print_success("未授权访问被正确拒绝")
    else:
        print_error(f"未授权访问返回非预期状态码: {response.status_code}")

# 测试使用无效Token
def test_invalid_token():
    print_step("测试无效Token")
    response = api_request("get", "/auth/me", token="invalid_token", expect_success=False)
    
    if response.status_code == 401:
        print_success("无效Token被正确拒绝")
    else:
        print_error(f"无效Token访问返回非预期状态码: {response.status_code}")

# 测试意图API (需要认证)
def test_intent_api(token: str):
    print_step("测试意图处理API")
    response = api_request(
        "post", 
        "/interpret", 
        data={
            "query": "你好，测试消息",
            "userId": 1,
            "sessionId": "test-session-id"
        },
        token=token
    )
    
    if response.status_code == 200:
        print_success("意图处理请求成功")
        return response.json()
    else:
        print_error(f"意图处理请求失败: {response.status_code} - {response.text}")
        return None

def run_server(env: str = "development"):
    """启动后端服务器"""
    print_step(f"启动后端服务 (环境: {env})")
    
    # 获取项目根目录
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    mcp_client_dir = os.path.abspath(os.path.join(backend_dir, "..", "MCP_Client", "src"))
    
    # 打印环境变量设置
    print_info(f"PYTHONPATH 将包含: {mcp_client_dir}")
    print_info(f"ENV 设置为: {env}")
    
    # 构建启动命令
    cmd = f"""cd {backend_dir} && \\
    export PYTHONPATH=$PYTHONPATH:{mcp_client_dir} && \\
    export ENV={env} && \\
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 & echo $! > server_pid.txt"""
    
    # 执行命令并捕获输出
    print_info("执行命令: " + cmd)
    os.system(cmd)
    
    # 等待服务启动
    print_info("等待服务启动...")
    time.sleep(5)
    
    # 检查服务是否正常运行
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print_success("服务已成功启动!")
            return True
        else:
            print_error(f"服务启动失败: 状态码 {response.status_code}")
            return False
    except Exception as e:
        print_error(f"服务启动失败: {str(e)}")
        return False

def stop_server():
    """停止后端服务器"""
    print_step("停止后端服务")
    
    # 获取项目根目录
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pid_file = os.path.join(backend_dir, "server_pid.txt")
    
    # 检查PID文件是否存在
    if os.path.exists(pid_file):
        try:
            with open(pid_file, 'r') as f:
                pid = f.read().strip()
                print_info(f"停止服务 (PID: {pid})...")
                os.system(f"kill {pid}")
                print_success("服务已停止")
        except Exception as e:
            print_error(f"停止服务时发生错误: {str(e)}")
        finally:
            # 删除PID文件
            os.remove(pid_file)
    else:
        print_info("找不到服务PID文件，尝试通过端口停止...")
        os.system("pkill -f 'uvicorn app.main:app'")
        print_success("服务已停止")

def test_intent_api_with_auth(token: str) -> bool:
    """测试带认证的intent API访问"""
    print_step("测试带认证的intent API")
    try:
        # 准备请求数据
        session_id = "test-session-" + str(int(time.time()))
        data = {
            "query": "你好，我需要帮助",
            "userId": None,  # 当使用token认证时，这个值可以为空，会从token中获取
            "sessionId": session_id
        }
        
        # 发送带认证的请求
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/interpret",
            json=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            print_success("带认证的请求成功!")
            print_info(f"响应数据: {json.dumps(result, indent=2, ensure_ascii=False)}")
            return True
        else:
            print_error(f"请求失败 ({response.status_code}): {response.text}")
            return False
    except Exception as e:
        print_error(f"API调用异常: {str(e)}")
        return False

def test_intent_api_without_auth(env: str) -> bool:
    """测试不带认证的intent API访问"""
    print_step(f"测试不带认证的intent API (环境: {env})")
    try:
        # 准备请求数据
        session_id = "test-session-" + str(int(time.time()))
        data = {
            "query": "你好，我需要帮助",
            "userId": 1,
            "sessionId": session_id
        }
        
        # 发送不带认证的请求
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/interpret",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        if env == "development":
            # 在开发环境中，应该允许无认证访问
            if response.status_code == 200:
                print_success("开发环境中不带认证的请求成功!")
                print_info(f"响应数据: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
                return True
            else:
                print_error(f"请求失败 ({response.status_code}): {response.text}")
                return False
        else:
            # 在生产环境中，应该拒绝无认证访问
            if response.status_code == 401:
                print_success("生产环境中正确拒绝了不带认证的请求!")
                print_info(f"响应数据: {response.text}")
                return True
            else:
                print_error(f"生产环境中错误地接受了不带认证的请求 ({response.status_code})")
                print_info(f"响应数据: {response.text}")
                return False
    except Exception as e:
        print_error(f"API调用异常: {str(e)}")
        return False

def run_tests():
    """运行所有测试"""
    print_colored("\n========== 开始测试JWT认证流程 ==========\n", Colors.GREEN)
    
    # 测试健康状态
    if not check_health():
        print_info("服务未运行，尝试启动开发环境服务...")
        server_started = run_server("development")
        if not server_started:
            print_error("无法启动服务器，终止测试")
            return False
    
    # 注册测试用户
    if not register_user(TEST_USERNAME, TEST_PASSWORD):
        print_error("用户注册失败，终止测试")
        return False
    
    # 登录获取token
    token = login(TEST_USERNAME, TEST_PASSWORD)
    
    if token:
        # 测试获取当前用户信息
        current_user = get_current_user(token)
        
        if current_user:
            print_success(f"认证用户: {current_user.get('username')}, ID: {current_user.get('id')}")
            
            # 测试使用有效令牌访问需要认证的API
            intent_result = test_intent_api(token)
            
            if intent_result:
                print_success("JWT认证和API访问测试全部通过")
        
    # 测试开发环境下不带认证的API访问
    dev_no_auth_success = test_intent_api_without_auth("development")
    
    # 关闭开发环境服务
    stop_server()
    
    # 启动生产环境服务
    print_info("切换到生产环境进行测试...")
    prod_server_started = run_server("production")
    if not prod_server_started:
        print_error("无法启动生产环境服务，跳过生产环境测试")
        print_colored("\n========== 测试结果摘要 ==========", Colors.GREEN)
        if dev_no_auth_success:
            print_success("开发环境测试全部通过!")
        else:
            print_error("开发环境测试未通过!")
        return dev_no_auth_success
    
    # 测试生产环境下不带认证的API访问（应该被拒绝）
    prod_no_auth_success = test_intent_api_without_auth("production")
    
    # 测试生产环境下带认证的API访问（应该成功）
    prod_auth_success = test_intent_api_with_auth(token)
    
    # 关闭生产环境服务
    stop_server()
    
    # 打印测试结果摘要
    print_colored("\n========== 测试结果摘要 ==========", Colors.GREEN)
    
    dev_success = dev_no_auth_success
    prod_success = prod_no_auth_success and prod_auth_success
    
    if dev_success:
        print_success("✅ 开发环境测试通过: JWT认证正常工作，且允许未认证访问")
    else:
        print_error("❌ 开发环境测试失败")
        
    if prod_success:
        print_success("✅ 生产环境测试通过: JWT认证正常工作，拒绝未认证访问")
    else:
        print_error("❌ 生产环境测试失败")
        
    if dev_success and prod_success:
        print_success("🎉 认证系统测试全部通过!")
        return True
    else:
        print_error("⚠️ 认证系统测试未完全通过")
        return False

if __name__ == "__main__":
    run_tests() 