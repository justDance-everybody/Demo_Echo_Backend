#!/usr/bin/env python3
import requests
import json
import time

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidXNlcm5hbWUiOiJhZG1pbl91c2VyIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzY1NTQ3NTQ4fQ.qEdXST_B-yMQsn155BNWHgQvrUb_MorvVOlYqJHdzQk"
BASE_URL = "http://localhost:3000/api/v1"

def print_section(title):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print('='*80)

def test_case_1():
    """测试用例1: 查询小红在BNB链上的账户资产"""
    print_section("测试用例1: 查询小红在BNB链上的账户资产 (CASE-V-BNB-001)")

    # 小红 = 环境变量私钥对应的钱包
    xiaohong_address = "0x41a569db3d657a5ac8c0cbb6a466c1346696ba42"
    print(f"小红的地址: {xiaohong_address}")

    # Step 1: Interpret
    print("\n[Step 1] 发送意图识别请求...")
    interpret_payload = {
        "query": f"帮我查一下小红（地址 {xiaohong_address}）在 BNB 链上的账户资产",
        "user_id": 1
    }

    response = requests.post(
        f"{BASE_URL}/intent/interpret",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        },
        json=interpret_payload
    )

    print(f"状态码: {response.status_code}")
    interpret_result = response.json()
    print(f"响应: {json.dumps(interpret_result, ensure_ascii=False, indent=2)}")

    if interpret_result.get("type") != "tool_call":
        print("\n❌ 失败: 未识别到需要调用工具")
        return

    session_id = interpret_result.get("session_id")
    print(f"\n✓ Session ID: {session_id}")
    print(f"✓ 工具调用: {[t['tool_id'] for t in interpret_result.get('tool_calls', [])]}")

    # Step 2: Confirm
    print("\n[Step 2] 发送确认执行请求...")
    time.sleep(2)

    confirm_payload = {
        "session_id": session_id,
        "user_input": "是的，确认执行"
    }

    response = requests.post(
        f"{BASE_URL}/intent/confirm",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        },
        json=confirm_payload
    )

    print(f"状态码: {response.status_code}")
    confirm_result = response.json()
    print(f"响应: {json.dumps(confirm_result, ensure_ascii=False, indent=2)}")

    if confirm_result.get("success"):
        print("\n✅ 测试用例1通过")
        print(f"播报内容: {confirm_result.get('content', '')}")
    else:
        print(f"\n❌ 测试用例1失败: {confirm_result.get('error', '')}")

def test_case_2():
    """测试用例2: 用BNB兑换0.01个USDT"""
    print_section("测试用例2: 用BNB兑换0.01个USDT (CASE-V-BNB-002)")

    # Step 1: Interpret
    print("\n[Step 1] 发送意图识别请求...")
    interpret_payload = {
        "query": "用我的BNB兑换0.01个USDT",
        "user_id": 1
    }

    response = requests.post(
        f"{BASE_URL}/intent/interpret",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        },
        json=interpret_payload
    )

    print(f"状态码: {response.status_code}")
    interpret_result = response.json()
    print(f"响应: {json.dumps(interpret_result, ensure_ascii=False, indent=2)}")

    if interpret_result.get("type") != "tool_call":
        print("\n❌ 失败: 未识别到需要调用工具")
        return

    session_id = interpret_result.get("session_id")
    print(f"\n✓ Session ID: {session_id}")
    print(f"✓ 工具调用: {[t['tool_id'] for t in interpret_result.get('tool_calls', [])]}")

    # Step 2: Confirm
    print("\n[Step 2] 发送确认执行请求...")
    time.sleep(2)

    confirm_payload = {
        "session_id": session_id,
        "user_input": "是的，确认执行"
    }

    response = requests.post(
        f"{BASE_URL}/intent/confirm",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        },
        json=confirm_payload
    )

    print(f"状态码: {response.status_code}")
    confirm_result = response.json()
    print(f"响应: {json.dumps(confirm_result, ensure_ascii=False, indent=2)}")

    if confirm_result.get("success"):
        print("\n✅ 测试用例2通过")
        print(f"播报内容: {confirm_result.get('content', '')}")
    else:
        print(f"\n❌ 测试用例2失败: {confirm_result.get('error', '')}")

def test_case_3():
    """测试用例3: 给小红转账0.01个USDT"""
    print_section("测试用例3: 给小红转账0.01个USDT (CASE-V-BNB-003)")

    recipient_address = "0x740B18D5920aa171919C67A9CfA9e202372237e1"
    print(f"接收方地址: {recipient_address}")

    # Step 1: Interpret
    print("\n[Step 1] 发送意图识别请求...")
    interpret_payload = {
        "query": f"给小红（地址 {recipient_address}）转账0.01个USDT",
        "user_id": 1
    }

    response = requests.post(
        f"{BASE_URL}/intent/interpret",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        },
        json=interpret_payload
    )

    print(f"状态码: {response.status_code}")
    interpret_result = response.json()
    print(f"响应: {json.dumps(interpret_result, ensure_ascii=False, indent=2)}")

    if interpret_result.get("type") != "tool_call":
        print("\n❌ 失败: 未识别到需要调用工具")
        return

    session_id = interpret_result.get("session_id")
    print(f"\n✓ Session ID: {session_id}")
    print(f"✓ 工具调用: {[t['tool_id'] for t in interpret_result.get('tool_calls', [])]}")

    # Step 2: Confirm
    print("\n[Step 2] 发送确认执行请求...")
    time.sleep(2)

    confirm_payload = {
        "session_id": session_id,
        "user_input": "是的，确认执行"
    }

    response = requests.post(
        f"{BASE_URL}/intent/confirm",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        },
        json=confirm_payload
    )

    print(f"状态码: {response.status_code}")
    confirm_result = response.json()
    print(f"响应: {json.dumps(confirm_result, ensure_ascii=False, indent=2)}")

    if confirm_result.get("success"):
        print("\n✅ 测试用例3通过")
        print(f"播报内容: {confirm_result.get('content', '')}")
    else:
        print(f"\n❌ 测试用例3失败: {confirm_result.get('error', '')}")

if __name__ == "__main__":
    print("BNB Chain 测试用例执行")
    print(f"Token有效期至: 2025-12-12")

    # test_case_1()
    # test_case_2()
    test_case_3()
