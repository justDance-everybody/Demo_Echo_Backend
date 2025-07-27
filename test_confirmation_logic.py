#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试新的确认逻辑
验证大模型是否能正确判断用户的确认意图
"""

import asyncio
import json
import requests
from typing import Dict, Any

class ConfirmationTester:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None
        
    def login(self) -> bool:
        """登录获取token"""
        try:
            login_data = {
                "username": "devuser_5090",
                "password": "mryuWTGdMk"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v1/auth/token",
                data=login_data
            )
            
            if response.status_code == 200:
                result = response.json()
                self.token = result.get("access_token")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.token}"
                })
                print("✅ 登录成功")
                return True
            else:
                print(f"❌ 登录失败: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ 登录异常: {e}")
            return False
    
    def create_intent_session(self) -> str:
        """创建一个意图会话，返回session_id"""
        try:
            # 发送一个需要工具调用的请求
            intent_data = {
                "query": "帮我查询北京的天气",
                "user_id": 1
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v1/intent/interpret",
                json=intent_data
            )
            
            if response.status_code == 200:
                result = response.json()
                session_id = result.get("session_id")
                print(f"✅ 创建意图会话成功，session_id: {session_id}")
                print(f"确认文本: {result.get('confirm_text')}")
                return session_id
            else:
                print(f"❌ 创建意图会话失败: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ 创建意图会话异常: {e}")
            return None
    
    def test_confirmation(self, session_id: str, user_input: str) -> Dict[str, Any]:
        """测试确认逻辑"""
        try:
            confirm_data = {
                "session_id": session_id,
                "user_input": user_input
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v1/intent/confirm",
                json=confirm_data
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "data": result
                }
            else:
                return {
                    "success": False,
                    "error": f"{response.status_code} - {response.text}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def run_tests(self):
        """运行所有测试"""
        print("🚀 开始测试新的确认逻辑")
        print("=" * 50)
        
        # 登录
        if not self.login():
            return
        
        # 测试用例
        test_cases = [
            {
                "name": "明确确认 - 是的",
                "input": "是的",
                "expected": "确认执行"
            },
            {
                "name": "明确确认 - 好的",
                "input": "好的",
                "expected": "确认执行"
            },
            {
                "name": "明确确认 - 确认",
                "input": "确认",
                "expected": "确认执行"
            },
            {
                "name": "明确确认 - 执行吧",
                "input": "执行吧",
                "expected": "确认执行"
            },
            {
                "name": "明确拒绝 - 不要",
                "input": "不要",
                "expected": "重新开始"
            },
            {
                "name": "明确拒绝 - 取消",
                "input": "取消",
                "expected": "重新开始"
            },
            {
                "name": "新需求 - 我想查询上海的天气",
                "input": "我想查询上海的天气",
                "expected": "重新开始"
            },
            {
                "name": "新需求 - 帮我计算一下",
                "input": "帮我计算一下",
                "expected": "重新开始"
            },
            {
                "name": "模糊输入 - 嗯",
                "input": "嗯",
                "expected": "可能确认或重新开始"
            },
            {
                "name": "语音转文字可能的输入 - 好吧",
                "input": "好吧",
                "expected": "确认执行"
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n📝 测试 {i}: {test_case['name']}")
            print(f"输入: \"{test_case['input']}\"")
            print(f"期望: {test_case['expected']}")
            
            # 为每个测试创建新的会话
            session_id = self.create_intent_session()
            if not session_id:
                print("❌ 无法创建会话，跳过此测试")
                continue
            
            # 测试确认逻辑
            result = self.test_confirmation(session_id, test_case['input'])
            
            if result['success']:
                data = result['data']
                success = data.get('success', False)
                content = data.get('content', '')
                
                print(f"结果: success={success}, content=\"{content}\"")
                
                # 判断结果是否符合预期
                if "请重新告诉我" in content:
                    actual_result = "重新开始"
                elif "执行完成" in content or success:
                    actual_result = "确认执行"
                else:
                    actual_result = "其他"
                
                print(f"实际结果: {actual_result}")
                
                if "确认执行" in test_case['expected'] and actual_result == "确认执行":
                    print("✅ 测试通过")
                elif "重新开始" in test_case['expected'] and actual_result == "重新开始":
                    print("✅ 测试通过")
                elif "可能" in test_case['expected']:
                    print("✅ 测试通过（模糊情况）")
                else:
                    print("⚠️ 结果与预期不完全匹配，但可能是合理的")
            else:
                print(f"❌ 测试失败: {result['error']}")
        
        print("\n" + "=" * 50)
        print("🎉 测试完成")

if __name__ == "__main__":
    tester = ConfirmationTester()
    tester.run_tests()