#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Echo AI 交互式控制台
让用户通过命令行与Echo AI后端服务进行实时交互

使用方法:
    python3 echo_ai_console.py
    
支持的命令:
    /login <username> <password>  - 登录
    /logout                       - 登出
    /whoami                       - 查看当前用户信息
    /tools                        - 查看可用工具
    /help                         - 显示帮助信息
    /quit 或 /exit               - 退出程序
    其他任何文本                   - 发送给AI进行意图解析
"""

import requests
import json
import uuid
import sys
import os
from typing import Dict, Any, Optional
from urllib.parse import urlencode
import readline  # 启用命令行历史记录


class EchoAIConsole:
    """Echo AI 交互式控制台 / Echo AI Interactive Console"""
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url
        self.api_prefix = "/api/v1"
        self.access_token = None
        self.session_id = None
        self.user_info = None
        self.running = True
        self.debug_mode = True  # 默认开启调试模式以显示详细日志
        
        # 语言选择
        self.language = self._select_language()
        
        # 颜色输出
        self.colors = {
            'reset': '\033[0m',
            'red': '\033[31m',
            'green': '\033[32m',
            'yellow': '\033[33m',
            'blue': '\033[34m',
            'magenta': '\033[35m',
            'cyan': '\033[36m',
            'white': '\033[37m',
            'bold': '\033[1m'
        }
        
        # 语言配置
        self.texts = {
            'zh': {
                'welcome': '🚀 欢迎使用 Echo AI 交互式控制台!',
                'checking_service': '正在检查服务状态...',
                'server_connected': '服务器连接正常',
                'connection_failed': '无法连接到服务器',
                'check_network': '请检查网络连接或服务器状态',
                'auto_login': '正在自动登录开发者账号...',
                'login_success': '登录成功! 欢迎',
                'auto_login_success': '已自动登录为开发者，您可以直接输入指令进行交互',
                'auto_login_failed': '自动登录失败，请手动登录',
                'login_failed': '登录失败',
                'login_error': '登录过程中发生错误',
                'logout_success': '已登出',
                'please_login': '请先登录',
                'username': '用户名',
                'role': '角色',
                'user_id': '用户ID',
                'get_user_info_failed': '获取用户信息失败',
                'get_user_info_error': '获取用户信息时发生错误',
                'available_tools': '可用工具',
                'get_tools_failed': '获取工具列表失败',
                'get_tools_error': '获取工具列表时发生错误',
                'network_error': '网络请求失败',
                'processing_request': '正在处理您的请求...',
                'confirm_prompt': '请确认 (是/否): ',
                'operation_cancelled': '操作已取消',
                'confirm_input_hint': '请输入 \'是\' 或 \'否\'',
                'unknown_response': '未知响应类型',
                'request_failed': '处理请求失败',
                'request_error': '处理请求时发生错误',
                'no_active_session': '没有活跃的会话',
                'executing': '正在执行...',
                'execution_failed': '执行失败',
                'confirm_execution_failed': '确认执行失败',
                'confirm_execution_error': '确认执行时发生错误',
                'goodbye': '再见! 👋',
                'login_usage': '用法: /login <用户名> <密码>',
                'unknown_command': '未知命令',
                'help_hint': '输入 /help 查看帮助',
                'interrupt_hint': '按 Ctrl+D 或输入 /quit 退出程序',
                'unknown_error': '发生未知错误',
                'guest': '访客',
                'tip_natural_language': '💡 提示: 直接输入自然语言指令即可，如 \'你好\' 或 \'深圳今天天气怎么样\'',
                'tip_help_quit': '💡 输入 /help 查看更多命令，输入 /quit 退出程序',
                'help_info': '📋 输入 /help 查看帮助信息',
                'help_text': '''
🤖 Echo AI 交互式控制台 - 帮助信息

📋 可用命令:
  /login <用户名> <密码>    - 登录到系统
  /logout                   - 登出当前用户
  /whoami                   - 查看当前用户信息
  /tools                    - 查看可用工具列表
  /debug                    - 切换调试模式 (显示详细日志)
  /help                     - 显示此帮助信息
  /quit 或 /exit           - 退出程序

💬 AI交互:
  输入任何其他文本将发送给AI进行处理，例如:
  - "你好"
  - "帮我翻译Hello World为中文"
  - "深圳今天天气怎么样"
  - "帮我搜索Python教程"
  - "转账0.01个SOL到指定地址"

🔐 测试账号:
  普通用户: testuser_5090 / 8lpcUY2BOt
  开发者:   devuser_5090 / mryuWTGdMk
  管理员:   adminuser_5090 / SAKMRtxCjT

🔧 调试模式:
  - 默认开启，显示详细的HTTP请求/响应日志
  - 显示MCP工具执行的完整过程和结果
  - 使用 /debug 命令可以切换开启/关闭

💡 提示:
  - 使用上下箭头键可以查看命令历史
  - 按 Ctrl+C 可以中断当前操作
  - 按 Ctrl+D 或输入 /quit 退出程序
'''
            },
            'en': {
                'welcome': '🚀 Welcome to Echo AI Interactive Console!',
                'checking_service': 'Checking service status...',
                'server_connected': 'Server connection successful',
                'connection_failed': 'Unable to connect to server',
                'check_network': 'Please check network connection or server status',
                'auto_login': 'Auto-logging in as developer...',
                'login_success': 'Login successful! Welcome',
                'auto_login_success': 'Auto-logged in as developer, you can now interact directly',
                'auto_login_failed': 'Auto-login failed, please login manually',
                'login_failed': 'Login failed',
                'login_error': 'Error occurred during login',
                'logout_success': 'Logged out',
                'please_login': 'Please login first',
                'username': 'Username',
                'role': 'Role',
                'user_id': 'User ID',
                'get_user_info_failed': 'Failed to get user info',
                'get_user_info_error': 'Error occurred while getting user info',
                'available_tools': 'Available tools',
                'get_tools_failed': 'Failed to get tools list',
                'get_tools_error': 'Error occurred while getting tools list',
                'network_error': 'Network request failed',
                'processing_request': 'Processing your request...',
                'confirm_prompt': 'Please confirm (yes/no): ',
                'operation_cancelled': 'Operation cancelled',
                'confirm_input_hint': 'Please enter \'yes\' or \'no\'',
                'unknown_response': 'Unknown response type',
                'request_failed': 'Request processing failed',
                'request_error': 'Error occurred while processing request',
                'no_active_session': 'No active session',
                'executing': 'Executing...',
                'execution_failed': 'Execution failed',
                'confirm_execution_failed': 'Confirm execution failed',
                'confirm_execution_error': 'Error occurred while confirming execution',
                'goodbye': 'Goodbye! 👋',
                'login_usage': 'Usage: /login <username> <password>',
                'unknown_command': 'Unknown command',
                'help_hint': 'Type /help for help',
                'interrupt_hint': 'Press Ctrl+D or type /quit to exit',
                'unknown_error': 'Unknown error occurred',
                'guest': 'guest',
                'tip_natural_language': '💡 Tip: Enter natural language commands directly, like \'hello\' or \'what\'s the weather in Shenzhen\'',
                'tip_help_quit': '💡 Type /help for more commands, /quit to exit',
                'help_info': '📋 Type /help for help information',
                'help_text': '''
🤖 Echo AI Interactive Console - Help

📋 Available Commands:
  /login <username> <password>  - Login to system
  /logout                       - Logout current user
  /whoami                       - View current user info
  /tools                        - View available tools
  /debug                        - Toggle debug mode (show detailed logs)
  /help                         - Show this help
  /quit or /exit               - Exit program

💬 AI Interaction:
  Enter any other text to send to AI for processing, for example:
  - "hello"
  - "translate Hello World to Chinese"
  - "what\'s the weather in Shenzhen today"
  - "help me search Python tutorials"
  - "transfer 0.01 SOL to specified address"

🔐 Test Accounts:
  Regular user: testuser_5090 / 8lpcUY2BOt
  Developer:    devuser_5090 / mryuWTGdMk
  Admin:        adminuser_5090 / SAKMRtxCjT

🔧 Debug Mode:
  - Enabled by default, shows detailed HTTP request/response logs
  - Shows complete MCP tool execution process and results
  - Use /debug command to toggle on/off

💡 Tips:
  - Use up/down arrow keys to view command history
  - Press Ctrl+C to interrupt current operation
  - Press Ctrl+D or type /quit to exit
'''
            }
        }
    
    def _select_language(self):
        """选择语言 / Select Language"""
        print("\n🌐 Language Selection / 语言选择")
        print("1. 中文 (Chinese)")
        print("2. English")
        
        while True:
            try:
                choice = input("\nPlease select language / 请选择语言 (1/2): ").strip()
                if choice == '1':
                    return 'zh'
                elif choice == '2':
                    return 'en'
                else:
                    print("Invalid choice. Please enter 1 or 2. / 无效选择，请输入 1 或 2。")
            except (EOFError, KeyboardInterrupt):
                print("\nDefaulting to Chinese / 默认使用中文")
                return 'zh'
    
    def get_text(self, key: str) -> str:
        """获取当前语言的文本"""
        return self.texts[self.language].get(key, key)
    
    def colored(self, text: str, color: str) -> str:
        """给文本添加颜色"""
        return f"{self.colors.get(color, '')}{text}{self.colors['reset']}"
    
    def print_info(self, message: str) -> None:
        """打印信息"""
        print(self.colored(f"ℹ️  {message}", 'blue'))
    
    def print_success(self, message: str) -> None:
        """打印成功信息"""
        print(self.colored(f"✅ {message}", 'green'))
    
    def print_error(self, message: str) -> None:
        """打印错误信息"""
        print(self.colored(f"❌ {message}", 'red'))
    
    def print_warning(self, message: str) -> None:
        """打印警告信息"""
        print(self.colored(f"⚠️  {message}", 'yellow'))
    
    def print_ai_response(self, message: str) -> None:
        """打印AI响应"""
        print(self.colored(f"🤖 {message}", 'cyan'))
    
    def _get_headers(self, content_type: str = "application/json") -> Dict[str, str]:
        """获取请求头"""
        headers = {"Content-Type": content_type}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers
    
    def _make_request(self, method: str, endpoint: str, data: Any = None, 
                     content_type: str = "application/json", silent: bool = False) -> requests.Response:
        """发送HTTP请求"""
        url = f"{self.base_url}{self.api_prefix}{endpoint}"
        headers = self._get_headers(content_type)
        
        # 根据接口类型设置不同的超时时间
        if endpoint == "/intent/confirm":
            # 确认执行接口需要更长的超时时间，因为后端需要执行工具
            timeout = 120  # 120秒，给后端足够的执行时间
        else:
            # 其他接口使用默认超时时间
            timeout = 30
        
        try:
            if content_type == "application/x-www-form-urlencoded":
                response = requests.request(method, url, headers=headers, data=data, timeout=timeout)
            else:
                response = requests.request(method, url, headers=headers, 
                                          json=data if data else None, timeout=timeout)
            
            # 记录HTTP详情（仅在debug模式下）
            self._log_http_details(method, url, headers, data, response)
            
            return response
        except requests.exceptions.RequestException as e:
            if not silent:
                self.print_error(f"{self.get_text('network_error')}: {e}")
            raise
    
    def _log_http_details(self, method: str, url: str, headers: dict, data: Any, response: requests.Response) -> None:
        """记录HTTP请求和响应的详细信息"""
        if not self.debug_mode:
            return
            
        print(self.colored("\n=== HTTP请求详情 ===", 'cyan'))
        print(self.colored(f"方法: {method}", 'blue'))
        print(self.colored(f"URL: {url}", 'blue'))
        print(self.colored(f"请求头: {json.dumps(headers, ensure_ascii=False, indent=2)}", 'blue'))
        if data:
            print(self.colored(f"请求体: {json.dumps(data, ensure_ascii=False, indent=2)}", 'blue'))
        
        print(self.colored(f"\n响应状态: {response.status_code} {response.reason}", 'blue'))
        print(self.colored(f"响应头: {json.dumps(dict(response.headers), ensure_ascii=False, indent=2)}", 'blue'))
        
        try:
            if response.headers.get('content-type', '').startswith('application/json'):
                response_data = response.json()
                print(self.colored(f"响应体: {json.dumps(response_data, ensure_ascii=False, indent=2)}", 'blue'))
            else:
                print(self.colored(f"响应体: {response.text[:1000]}{'...' if len(response.text) > 1000 else ''}", 'blue'))
        except:
            print(self.colored("响应体: [无法解析]", 'blue'))
        
        print(self.colored("=== HTTP请求结束 ===\n", 'cyan'))
    
    def health_check(self) -> bool:
        """健康检查"""
        try:
            self.print_info(self.get_text('checking_service'))
            response = requests.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                self.print_success(self.get_text('server_connected'))
                return True
            else:
                self.print_error(self.get_text('connection_failed'))
                return False
        except Exception as e:
            self.print_error(f"{self.get_text('connection_failed')}: {e}")
            self.print_warning(self.get_text('check_network'))
            return False
    
    def login(self, username: str, password: str) -> bool:
        """用户登录"""
        try:
            form_data = urlencode({
                'username': username,
                'password': password
            })
            
            response = self._make_request(
                "POST", "/auth/token", 
                data=form_data,
                content_type="application/x-www-form-urlencoded"
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get('access_token')
                self.user_info = {
                    'user_id': data.get('user_id'),
                    'username': data.get('username'),
                    'role': data.get('role')
                }
                self.print_success(f"{self.get_text('login_success')} {username} ({data.get('role')})")
                return True
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                error_msg = error_data.get('detail', f'HTTP {response.status_code}')
                self.print_error(f"{self.get_text('login_failed')}: {error_msg}")
                return False
        except Exception as e:
            self.print_error(f"{self.get_text('login_error')}: {e}")
            return False
    
    def logout(self) -> None:
        """用户登出"""
        self.access_token = None
        self.session_id = None
        self.user_info = None
        self.print_success(self.get_text('logout_success'))
    
    def get_user_info(self) -> bool:
        """获取当前用户信息"""
        if not self.access_token:
            self.print_warning(self.get_text('please_login'))
            return False
        
        try:
            response = self._make_request("GET", "/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                self.print_info(f"{self.get_text('username')}: {data.get('username')}")
                self.print_info(f"{self.get_text('role')}: {data.get('role')}")
                self.print_info(f"{self.get_text('user_id')}: {data.get('user_id')}")
                return True
            else:
                self.print_error(f"{self.get_text('get_user_info_failed')}: HTTP {response.status_code}")
                return False
        except Exception as e:
            self.print_error(f"{self.get_text('get_user_info_error')}: {e}")
            return False
    
    def get_tools(self) -> bool:
        """获取可用工具列表"""
        if not self.access_token:
            self.print_warning(self.get_text('please_login'))
            return False
        
        try:
            response = self._make_request("GET", "/tools")
            
            if response.status_code == 200:
                data = response.json()
                tools = data.get('tools', [])
                self.print_success(f"{self.get_text('available_tools')} ({len(tools)}):")
                for i, tool in enumerate(tools, 1):
                    print(f"  {i}. {tool.get('tool_id')}: {tool.get('name')}")
                    if tool.get('description'):
                        print(f"     {self.colored(tool.get('description'), 'white')}")
                return True
            else:
                self.print_error(f"{self.get_text('get_tools_failed')}: HTTP {response.status_code}")
                return False
        except Exception as e:
            self.print_error(f"{self.get_text('get_tools_error')}: {e}")
            return False
    
    def interpret_intent(self, query: str) -> Optional[Dict]:
        """意图解析"""
        if not self.access_token:
            self.print_warning(self.get_text('please_login'))
            return None
        
        if not self.session_id:
            self.session_id = str(uuid.uuid4())
        
        try:
            data = {
                "query": query,
                "session_id": self.session_id,
                "user_id": self.user_info.get('user_id', 13)
            }
            
            # 详细日志：显示请求信息
            if self.debug_mode:
                print(self.colored("\n=== 意图解析请求详情 ===", 'cyan'))
                print(self.colored(f"请求URL: {self.base_url}{self.api_prefix}/intent/interpret", 'blue'))
                print(self.colored(f"请求数据: {json.dumps(data, ensure_ascii=False, indent=2)}", 'blue'))
            
            self.print_info(self.get_text('processing_request'))
            response = self._make_request("POST", "/intent/interpret", data)
            
            # 详细日志：显示响应信息
            if self.debug_mode:
                print(self.colored(f"\n响应状态码: {response.status_code}", 'blue'))
                print(self.colored(f"响应头: {dict(response.headers)}", 'blue'))
            
            if response.status_code == 200:
                result = response.json()
                
                # 详细日志：显示完整响应内容
                if self.debug_mode:
                    print(self.colored("响应内容:", 'blue'))
                    print(self.colored(json.dumps(result, ensure_ascii=False, indent=2), 'blue'))
                    print(self.colored("=== 意图解析响应结束 ===\n", 'cyan'))
                
                if result.get('type') == 'direct_response':
                    # 直接响应
                    content = result.get('content', '').strip()
                    if content:
                        self.print_ai_response(content)
                    return result
                    
                elif result.get('type') == 'tool_call':
                    # 需要工具调用
                    confirm_text = result.get('confirm_text', '')
                    if confirm_text:
                        self.print_ai_response(confirm_text)
                        
                        # 获取用户的自然语言确认输入
                        user_input = input(self.colored(self.get_text('confirm_prompt'), 'yellow')).strip()
                        
                        # 将用户输入发送到后端进行意图确认处理
                        return self.confirm_execution(user_input)
                    else:
                        # 没有确认文本，直接执行
                        return self.confirm_execution("是" if self.language == 'zh' else "yes")
                
                else:
                    self.print_ai_response(result.get('content', self.get_text('unknown_response')))
                    return result
                    
            else:
                # 详细日志：显示错误响应
                if self.debug_mode:
                    try:
                        error_response = response.text
                        print(self.colored(f"错误响应内容: {error_response}", 'red'))
                    except:
                        print(self.colored("无法读取错误响应内容", 'red'))
                    print(self.colored("=== 意图解析响应结束 ===\n", 'cyan'))
                
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                error_msg = error_data.get('detail', f'HTTP {response.status_code}')
                self.print_error(f"{self.get_text('request_failed')}: {error_msg}")
                return None
                
        except Exception as e:
            if self.debug_mode:
                print(self.colored("=== 意图解析响应结束 ===\n", 'cyan'))
            self.print_error(f"{self.get_text('request_error')}: {e}")
            return None
    
    def confirm_execution(self, user_input: str = "是") -> Optional[Dict]:
        """确认执行"""
        if not self.session_id:
            self.print_error(self.get_text('no_active_session'))
            return None
        
        try:
            data = {
                "session_id": self.session_id,
                "user_input": user_input
            }
            
            # 详细日志：显示执行确认请求信息
            if self.debug_mode:
                print(self.colored("\n=== 执行确认请求详情 ===", 'cyan'))
                print(self.colored(f"请求URL: {self.base_url}{self.api_prefix}/intent/confirm", 'blue'))
                print(self.colored(f"请求数据: {json.dumps(data, ensure_ascii=False, indent=2)}", 'blue'))
            
            self.print_info(self.get_text('executing'))
            response = self._make_request("POST", "/intent/confirm", data)
            
            # 详细日志：显示响应信息
            if self.debug_mode:
                print(self.colored(f"\n响应状态码: {response.status_code}", 'blue'))
                print(self.colored(f"响应头: {dict(response.headers)}", 'blue'))
            
            if response.status_code == 200:
                result = response.json()
                
                # 详细日志：显示完整响应内容
                if self.debug_mode:
                    print(self.colored("响应内容:", 'blue'))
                    print(self.colored(json.dumps(result, ensure_ascii=False, indent=2), 'blue'))
                    
                    # 如果有工具执行结果，显示详细信息
                    if 'tool_results' in result:
                        print(self.colored("\n=== MCP工具执行详情 ===", 'magenta'))
                        tool_results = result['tool_results']
                        if isinstance(tool_results, list):
                            for i, tool_result in enumerate(tool_results):
                                print(self.colored(f"\n工具 #{i+1}:", 'magenta'))
                                print(self.colored(json.dumps(tool_result, ensure_ascii=False, indent=2), 'magenta'))
                        else:
                            print(self.colored(json.dumps(tool_results, ensure_ascii=False, indent=2), 'magenta'))
                        print(self.colored("=== MCP工具执行结束 ===\n", 'magenta'))
                    
                    # 如果有执行日志，显示详细信息
                    if 'execution_logs' in result:
                        print(self.colored("\n=== 执行日志详情 ===", 'yellow'))
                        logs = result['execution_logs']
                        if isinstance(logs, list):
                            for log in logs:
                                print(self.colored(f"[{log.get('timestamp', 'N/A')}] {log.get('level', 'INFO')}: {log.get('message', '')}", 'yellow'))
                        else:
                            print(self.colored(str(logs), 'yellow'))
                        print(self.colored("=== 执行日志结束 ===\n", 'yellow'))
                    
                    print(self.colored("=== 执行确认响应结束 ===\n", 'cyan'))
                
                if result.get('success'):
                    content = result.get('content', '').strip()
                    if content:
                        self.print_ai_response(content)
                else:
                    error = result.get('error', self.get_text('execution_failed'))
                    self.print_error(f"{self.get_text('execution_failed')}: {error}")
                
                return result
            else:
                # 详细日志：显示错误响应
                if self.debug_mode:
                    try:
                        error_response = response.text
                        print(self.colored(f"错误响应内容: {error_response}", 'red'))
                    except:
                        print(self.colored("无法读取错误响应内容", 'red'))
                    print(self.colored("=== 执行确认响应结束 ===\n", 'cyan'))
                
                self.print_error(f"{self.get_text('confirm_execution_failed')}: HTTP {response.status_code}")
                return None
                
        except Exception as e:
            if self.debug_mode:
                print(self.colored("=== 执行确认响应结束 ===\n", 'cyan'))
            self.print_error(f"{self.get_text('confirm_execution_error')}: {e}")
            return None
    
    def show_help(self) -> None:
        """显示帮助信息"""
        print(self.get_text('help_text'))
    
    def process_command(self, user_input: str) -> None:
        """处理用户命令"""
        user_input = user_input.strip()
        
        if not user_input:
            return
        
        # 处理系统命令
        if user_input.startswith('/'):
            parts = user_input.split()
            command = parts[0].lower()
            
            if command in ['/quit', '/exit']:
                self.print_info(self.get_text('goodbye'))
                self.running = False
                
            elif command == '/help':
                self.show_help()
                
            elif command == '/login':
                if len(parts) >= 3:
                    username = parts[1]
                    password = parts[2]
                    self.login(username, password)
                else:
                    self.print_error(self.get_text('login_usage'))
                    
            elif command == '/logout':
                self.logout()
                
            elif command == '/whoami':
                self.get_user_info()
                
            elif command == '/tools':
                self.get_tools()
                
            elif command == '/debug':
                self.debug_mode = not self.debug_mode
                status = "开启" if self.debug_mode else "关闭"
                status_en = "enabled" if self.debug_mode else "disabled"
                if self.language == 'zh':
                    self.print_success(f"调试模式已{status}")
                    if self.debug_mode:
                        self.print_info("现在将显示详细的HTTP请求/响应日志和MCP工具执行过程")
                    else:
                        self.print_info("不再显示详细日志")
                else:
                    self.print_success(f"Debug mode {status_en}")
                    if self.debug_mode:
                        self.print_info("Will now show detailed HTTP request/response logs and MCP tool execution process")
                    else:
                        self.print_info("Will no longer show detailed logs")
                
            else:
                self.print_error(f"{self.get_text('unknown_command')}: {command}. {self.get_text('help_hint')}")
        
        else:
            # 发送给AI处理
            self.interpret_intent(user_input)
    
    def run(self) -> None:
        """运行交互式控制台"""
        # 显示欢迎信息
        print(self.colored(self.get_text('welcome'), 'bold'))
        
        # 健康检查
        if not self.health_check():
            return
        
        # 自动登录开发者账号
        self.print_info(self.get_text('auto_login'))
        if self.login("devuser_5090", "mryuWTGdMk"):
            self.print_success(self.get_text('auto_login_success'))
            print(self.colored(self.get_text('tip_natural_language'), 'cyan'))
            print(self.colored(self.get_text('tip_help_quit'), 'cyan'))
        else:
            self.print_error(self.get_text('auto_login_failed'))
            print(self.colored(self.get_text('help_info'), 'blue'))
        
        print()
        
        # 主循环
        while self.running:
            try:
                # 显示提示符
                if self.user_info:
                    prompt = f"{self.colored(self.user_info['username'], 'green')}@echo-ai> "
                else:
                    prompt = f"{self.colored(self.get_text('guest'), 'yellow')}@echo-ai> "
                
                user_input = input(prompt)
                self.process_command(user_input)
                
            except KeyboardInterrupt:
                print("\n")
                self.print_info(self.get_text('interrupt_hint'))
                continue
                
            except EOFError:
                print("\n")
                self.print_info(self.get_text('goodbye'))
                break
                
            except Exception as e:
                self.print_error(f"{self.get_text('unknown_error')}: {e}")
                continue


def main():
    """主函数"""
    console = EchoAIConsole()
    console.run()


if __name__ == "__main__":
    main()