#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
后端API交互流程测试脚本

模拟真实用户使用场景：登录 -> 输入指令 -> 确认 -> 查看结果

使用方法：
    python test_backend_api.py
"""

import requests
import json
import uuid
import sys
import time
from urllib.parse import urlencode
from typing import Optional, Dict, Any

# 配置信息
BASE_URL = "http://localhost:3000"
API_PREFIX = "/api/v1"

# 预置测试账号（来自前后端对接指南）
TEST_ACCOUNTS = {
    "user": {"username": "testuser_5090", "password": "8lpcUY2BOt"},
    "developer": {"username": "devuser_5090", "password": "mryuWTGdMk"},
    "admin": {"username": "adminuser_5090", "password": "SAKMRtxCjT"}
}

class BackendAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.api_prefix = API_PREFIX
        self.session = requests.Session()
        self.access_token = None
        self.current_user = None
        self.session_id = str(uuid.uuid4())
        
    def _get_url(self, endpoint: str) -> str:
        """构建完整的API URL"""
        return f"{self.base_url}{self.api_prefix}{endpoint}"
    
    def _set_auth_header(self):
        """设置认证头"""
        if self.access_token:
            self.session.headers.update({
                'Authorization': f'Bearer {self.access_token}'
            })
    
    def login(self, role: str = "developer") -> bool:
        """登录指定角色的用户"""
        if role not in TEST_ACCOUNTS:
            print(f"❌ 错误：未知角色 '{role}'，可用角色：{list(TEST_ACCOUNTS.keys())}")
            return False
            
        account = TEST_ACCOUNTS[role]
        print(f"🔐 正在登录 {role} 用户: {account['username']}")
        
        # 使用 application/x-www-form-urlencoded 格式
        data = urlencode({
            'username': account['username'],
            'password': account['password']
        })
        
        try:
            response = self.session.post(
                self._get_url('/auth/token'),
                data=data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            if response.status_code == 200:
                result = response.json()
                self.access_token = result['access_token']
                self.current_user = {"role": role, "username": account['username']}
                self._set_auth_header()
                print(f"✅ 登录成功！当前用户: {role}")
                return True
            else:
                print(f"❌ 登录失败：{response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ 登录异常：{e}")
            return False
    
    def health_check(self) -> bool:
        """健康检查"""
        print(f"🏥 检查后端服务健康状态")
        
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 后端服务正常：{result}")
                return True
            else:
                print(f"❌ 后端服务异常：{response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ 健康检查失败：{e}")
            return False
    
    def interpret_intent(self, query: str, user_id: int = 13) -> Optional[Dict]:
        """意图解析"""
        payload = {
            "query": query,
            "session_id": self.session_id,
            "user_id": user_id
        }
        
        try:
            response = self.session.post(
                self._get_url('/intent/interpret'),
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"🧠 意图解析成功: {result.get('type', 'unknown')}")
                # 根据API实际返回格式，优先使用confirm_text，其次使用content
                ai_reply = result.get('confirm_text') or result.get('content', 'N/A')
                print(f"💬 AI回复: {ai_reply}")
                if result.get('tool_calls'):
                    print(f"🔧 需要调用工具: {[tc.get('tool_id') for tc in result.get('tool_calls', [])]}")
                return result
            else:
                print(f"❌ 意图解析失败：{response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ 意图解析异常：{e}")
            return None
    
    def confirm_execution(self, session_id: str, user_input: str) -> Optional[Dict]:
        """确认执行"""
        payload = {
            "session_id": session_id,
            "user_input": user_input
        }
        
        try:
            response = self.session.post(
                self._get_url('/intent/confirm'),
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 确认执行成功: {result.get('success', 'unknown')}")
                print(f"📋 执行内容: {result.get('content', 'N/A')}")
                if result.get('error'):
                    print(f"⚠️ 错误信息: {result.get('error')}")
                return result
            else:
                print(f"❌ 确认执行失败：{response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ 确认执行异常：{e}")
            return None
    
    def execute_tool(self, tool_id: str, parameters: Dict = None, session_id: str = None, user_id: int = 13) -> Optional[Dict]:
        """执行工具"""
        payload = {
            "session_id": session_id or self.session_id,
            "user_id": user_id,
            "tool_id": tool_id,
            "params": parameters or {}
        }
        
        try:
            response = self.session.post(
                self._get_url('/execute'),
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ 工具执行成功: {result.get('status', 'unknown')}")
                print(f"📋 执行结果: {result.get('result', 'N/A')}")
                if result.get('error'):
                    print(f"⚠️ 错误信息: {result.get('error')}")
                return result
            else:
                print(f"❌ 工具执行失败：{response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ 工具执行异常：{e}")
            return None
    
    def get_tools(self) -> Optional[Dict]:
        """获取可用工具列表"""
        try:
            response = self.session.get(self._get_url('/tools'))
            
            if response.status_code == 200:
                result = response.json()
                tools = result.get('tools', [])
                print(f"🛠️ 可用工具 ({len(tools)}个):")
                for tool in tools:
                    print(f"   - {tool.get('tool_id')}: {tool.get('name')}")
                return result
            else:
                print(f"❌ 获取工具列表失败：{response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ 获取工具列表异常：{e}")
            return None

def ai_chat_interaction(tester: BackendAPITester):
    """AI对话交互 - 模拟真实用户使用场景"""
    print("\n🤖 AI对话交互模式")
    print("💡 提示：输入 'quit' 退出对话模式")
    print("💡 示例指令：'今天北京的天气怎么样？'、'帮我翻译hello world'")
    print("-" * 50)
    
    while True:
        # 1. 用户输入指令
        query = input("\n👤 请输入您的指令: ").strip()
        
        if query.lower() in ['quit', 'exit', '退出', 'q']:
            print("👋 退出对话模式")
            break
            
        if not query:
            print("❌ 请输入有效指令")
            continue
        
        print(f"\n🧠 正在处理: {query}")
        
        # 2. 意图解析
        interpretation = tester.interpret_intent(query)
        if not interpretation:
            print("❌ 处理失败，请重试")
            continue
        
        # 根据API实际返回格式，优先使用confirm_text，其次使用content
        ai_understanding = interpretation.get('confirm_text') or interpretation.get('content', '无响应内容')
        print(f"\n📋 AI理解: {ai_understanding}")
        
        # 3. 如果需要工具调用，询问用户确认
        if interpretation.get('type') == 'tool_call' and interpretation.get('tool_calls'):
            tool_calls = interpretation.get('tool_calls', [])
            print(f"\n🔧 需要调用工具: {[tc.get('tool_id') for tc in tool_calls]}")
            
            # 支持用户任意表达确认意图，不再限制为y/n
            print("\n💬 请确认是否执行上述操作：")
            print("💡 您可以用任何方式表达确认或拒绝，例如：")
            print("   确认：'是的'、'好的'、'可以'、'执行吧'、'没问题'等")
            print("   拒绝：'不要'、'取消'、'算了'、'不执行'等")
            print("   重新开始：'我想要别的'、'换个需求'等")
            
            user_confirmation = input("👤 您的回复: ").strip()
            if not user_confirmation:
                user_confirmation = "好的"  # 默认确认
            
            print(f"\n🧠 正在分析您的确认意图: '{user_confirmation}'")
            print("⏳ 正在执行...")
            # 4. 确认执行 - 传递用户的自然语言确认输入
            confirm_result = tester.confirm_execution(interpretation['session_id'], user_confirmation)
            if confirm_result:
                print(f"\n✅ 执行结果: {confirm_result.get('content', '执行完成')}")
                if confirm_result.get('tts'):
                    print(f"🔊 语音播报: {confirm_result.get('tts')}")
                
                # 5. 如果确认结果中包含工具调用，执行工具
                if confirm_result.get('tool_calls'):
                    for tool_call in confirm_result.get('tool_calls', []):
                        tool_id = tool_call.get('tool_id')
                        parameters = tool_call.get('parameters', {})
                        print(f"\n🛠️ 执行工具: {tool_id}")
                        execute_result = tester.execute_tool(tool_id, parameters, interpretation['session_id'])
                        if not execute_result:
                            print(f"❌ 工具 {tool_id} 执行失败")
            else:
                print("❌ 执行失败或用户拒绝执行")
        else:
            # 直接响应，无需工具调用
            print(f"\n💬 AI回复: {interpretation.get('content', '处理完成')}")
        
        print("-" * 50)

def print_menu():
    """打印菜单"""
    print("\n" + "="*50)
    print("🤖 后端API交互流程测试脚本")
    print("="*50)
    print("1. 健康检查")
    print("2. 切换用户角色")
    print("3. AI对话交互 (输入指令)")
    print("4. 查看可用工具")
    print("5. 直接执行工具")
    print("0. 退出")
    print("="*50)

def main():
    """主函数"""
    tester = BackendAPITester()
    
    print(f"🌐 后端服务地址：{BASE_URL}")
    print(f"📡 API前缀：{API_PREFIX}")
    
    # 默认登录开发者账号
    print("\n🔄 自动登录开发者账号...")
    if not tester.login("developer"):
        print("❌ 自动登录失败，请检查后端服务是否正常运行")
        return
    
    while True:
        print_menu()
        choice = input("\n请选择操作 (0-5): ").strip()
        
        try:
            if choice == '0':
                print("👋 再见！")
                break
            elif choice == '1':
                tester.health_check()
            elif choice == '2':
                print("可用角色：user, developer, admin")
                role = input("请输入角色 (默认: developer): ").strip()
                if not role:
                    role = "developer"
                tester.login(role)
            elif choice == '3':
                ai_chat_interaction(tester)
            elif choice == '4':
                tester.get_tools()
            elif choice == '5':
                # 直接执行工具
                tools_result = tester.get_tools()
                if tools_result and tools_result.get('tools'):
                    tool_id = input("请输入要执行的工具ID: ").strip()
                    if tool_id:
                        print("请输入工具参数 (JSON格式，留空表示无参数):")
                        params_input = input().strip()
                        parameters = {}
                        if params_input:
                            try:
                                parameters = json.loads(params_input)
                            except json.JSONDecodeError:
                                print("❌ 参数格式错误，使用空参数")
                        tester.execute_tool(tool_id, parameters)
                    else:
                        print("❌ 工具ID不能为空")
                else:
                    print("❌ 无法获取工具列表")
            else:
                print("❌ 无效选择，请重新输入")
                
        except KeyboardInterrupt:
            print("\n\n👋 用户中断，再见！")
            break
        except Exception as e:
            print(f"❌ 操作异常：{e}")
        
        if choice != '3':  # 对话模式内部已有暂停
            input("\n按回车键继续...")

if __name__ == "__main__":
    main()