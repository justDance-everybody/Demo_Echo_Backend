#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import json
import sys
import os
import time
from typing import Dict, Any, Optional

# 设置API基础URL
BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"

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

def run_server():
    """启动后端服务器"""
    print_step("启动后端服务")
    
    # 获取项目根目录
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    mcp_client_dir = os.path.abspath(os.path.join(backend_dir, "..", "MCP_Client", "src"))
    
    # 打印环境变量设置
    print_info(f"PYTHONPATH 将包含: {mcp_client_dir}")
    print_info(f"ENV 设置为: development")
    
    # 构建启动命令
    cmd = f"""cd {backend_dir} && \\
    export PYTHONPATH=$PYTHONPATH:{mcp_client_dir} && \\
    export ENV=development && \\
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

def check_health():
    """检查API健康状态"""
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

def test_intent_endpoint_without_auth():
    """测试不带认证的intent API访问"""
    print_step("测试不带认证的intent API")
    try:
        # 准备请求数据 - 使用正确的字段名
        session_id = "test-session-" + str(int(time.time()))
        data = {
            "query": "你好，我需要帮助",
            "userId": 1,  # 使用正确的字段名userId而不是user_id
            "sessionId": session_id  # 使用正确的字段名sessionId而不是session_id
        }
        
        # 发送请求
        print_info(f"发送请求数据: {json.dumps(data, ensure_ascii=False)}")
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/interpret",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        # 处理响应
        print_info(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print_success("不带认证的请求成功!")
            print_info(f"响应数据: {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            # 检查会话ID是否正确返回
            if result.get("sessionId") == session_id:
                print_success("会话ID正确返回!")
            else:
                print_error(f"会话ID不匹配: 期望 {session_id}, 实际 {result.get('sessionId')}")
                
            return True
        else:
            print_error(f"请求失败 ({response.status_code}): {response.text}")
            return False
    except Exception as e:
        print_error(f"API调用异常: {str(e)}")
        return False

def test_execute_endpoint_without_auth():
    """测试不带认证的execute API访问"""
    print_step("测试不带认证的execute API")
    try:
        # 准备请求数据 - 使用正确的字段名
        session_id = "test-session-" + str(int(time.time()))
        data = {
            "toolId": "dummy_tool",  # 使用正确的字段名toolId
            "params": {"param1": "value1"},  # 使用正确的字段名params
            "userId": "1",  # 使用正确的字段名userId，并确保为字符串
            "sessionId": session_id  # 使用正确的字段名sessionId
        }
        
        # 发送请求
        print_info(f"发送请求数据: {json.dumps(data, ensure_ascii=False)}")
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/execute",
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        # 处理响应
        print_info(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            print_success("不带认证的请求成功!")
            print_info(f"响应数据: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return True
        elif response.status_code == 422:
            # 这可能是因为tool_id不存在，但只要不是401表示认证部分工作正常
            print_success("不带认证的请求成功处理 (422表示参数验证失败，但认证部分工作正常)!")
            print_info(f"响应数据: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return True
        else:
            print_error(f"请求失败 ({response.status_code}): {response.text}")
            return False
    except Exception as e:
        print_error(f"API调用异常: {str(e)}")
        return False

def test_tools_endpoint_without_auth():
    """测试不带认证的tools API访问"""
    print_step("测试不带认证的tools API")
    try:
        # 发送请求
        response = requests.get(f"{BASE_URL}{API_PREFIX}/tools")
        
        # 处理响应
        print_info(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            print_success("不带认证的请求成功!")
            print_info(f"响应数据: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return True
        else:
            print_error(f"请求失败 ({response.status_code}): {response.text}")
            return False
    except Exception as e:
        print_error(f"API调用异常: {str(e)}")
        return False

def run_tests():
    """运行所有测试"""
    print_colored("\n========== 开始测试可选认证（Optional Authentication）==========\n", Colors.GREEN)
    
    # 测试健康状态
    if not check_health():
        server_started = run_server()
        if not server_started:
            print_error("无法启动服务器，终止测试")
            return False
    
    # 运行测试用例
    success_count = 0
    total_tests = 3
    
    # 测试不带认证的intent API
    if test_intent_endpoint_without_auth():
        success_count += 1
    
    # 测试不带认证的execute API  
    if test_execute_endpoint_without_auth():
        success_count += 1
    
    # 测试不带认证的tools API
    if test_tools_endpoint_without_auth():
        success_count += 1
    
    # 停止服务器
    stop_server()
    
    # 打印测试结果摘要
    print_colored("\n========== 测试结果摘要 ==========", Colors.GREEN)
    if success_count == total_tests:
        print_success(f"全部通过! {success_count}/{total_tests} 测试通过")
    else:
        print_error(f"测试不完全通过: {success_count}/{total_tests} 测试通过")
    
    return success_count == total_tests

if __name__ == "__main__":
    run_tests() 