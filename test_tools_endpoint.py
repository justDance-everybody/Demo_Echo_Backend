#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试工具端点修复
"""

import httpx
import sys

def test_tools_endpoints():
    """测试工具端点"""
    base_url = "http://localhost:8000"
    
    print("=" * 50)
    print("测试工具端点")
    print("=" * 50)
    
    # 测试健康检查
    try:
        response = httpx.get(f"{base_url}/health")
        print(f"健康检查: {'✅ 通过' if response.status_code == 200 else '❌ 失败'} (HTTP {response.status_code})")
    except Exception as e:
        print(f"健康检查: ❌ 异常 - {e}")
        return False
    
    # 测试需要认证的工具端点
    try:
        response = httpx.get(f"{base_url}/api/v1/tools")
        print(f"需要认证的工具端点: {'✅ 通过' if response.status_code == 401 else '❌ 失败'} (HTTP {response.status_code})")
        if response.status_code == 401:
            print("   说明: 正确返回401未授权，需要认证")
        else:
            print(f"   响应: {response.text[:200]}...")
    except Exception as e:
        print(f"需要认证的工具端点: ❌ 异常 - {e}")
    
    # 测试无需认证的工具端点
    try:
        response = httpx.get(f"{base_url}/api/v1/tools/public")
        if response.status_code == 200:
            print("✅ 无需认证的工具端点: 通过")
            tools_data = response.json()
            tools = tools_data.get('tools', [])
            print(f"   工具数量: {len(tools)}")
            if tools:
                print(f"   第一个工具: {tools[0].get('name', 'Unknown')}")
            return True
        else:
            print(f"❌ 无需认证的工具端点: 失败 (HTTP {response.status_code})")
            print(f"   响应: {response.text[:200]}...")
            return False
    except Exception as e:
        print(f"❌ 无需认证的工具端点: 异常 - {e}")
        return False

if __name__ == "__main__":
    success = test_tools_endpoints()
    sys.exit(0 if success else 1)
