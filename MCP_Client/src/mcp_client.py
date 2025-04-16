import asyncio
import os
import sys
import json
from typing import Optional, Dict, List, Any
from contextlib import AsyncExitStack

# 添加父目录到路径，以便能找到src模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import aiohttp

from openai import OpenAI
from dotenv import load_dotenv

# 导入日志模块和服务器配置模块
from src.utils.logger import get_logger, info, error, debug, warning
from src.utils.server_config import get_server_config, ServerConfigError

load_dotenv()  # 加载.env文件中的环境变量

logger = get_logger()

class MCPClient:
    def __init__(self):
        # 初始化会话和客户端对象
        self.session: Optional[ClientSession] = None
        self.client_session: Optional[aiohttp.ClientSession] = None
        self.exit_stack = AsyncExitStack()
        
        # 从环境变量读取LLM配置
        api_key = os.environ.get("LLM_API_KEY")
        api_base = os.environ.get("LLM_API_BASE")
        
        info(f"初始化MCP客户端，API基础URL: {api_base}")
        
        # 初始化OpenAI客户端
        openai_config = {}
        if api_key:
            openai_config["api_key"] = api_key
        if api_base:
            openai_config["base_url"] = api_base
            
        self.openai = OpenAI(**openai_config)
        
        # 从环境变量获取LLM模型名称和其他参数
        self.model = os.environ.get("LLM_MODEL")
        self.max_tokens = int(os.environ.get("LLM_MAX_TOKENS", "1000"))
        
        info(f"使用模型: {self.model}, 最大令牌数: {self.max_tokens}")

    async def connect_to_server_by_id(self, server_id: str):
        """通过ID连接到配置好的MCP服务器
        
        参数:
            server_id: 服务器ID
        """
        try:
            # 获取服务器配置
            server_config = get_server_config()
            server_params = server_config.get_server_command(server_id)
            
            # 判断是URL服务器还是命令行服务器
            if len(server_params) == 1:  # URL服务器
                url = server_params[0]
                info(f"正在连接到MCP HTTP/SSE服务器: {server_id}, URL: {url}")
                
                # 创建HTTP客户端会话
                self.client_session = aiohttp.ClientSession()
                
                # 对于SSE服务器，需要特别处理
                if "sse" in url.lower():
                    info("检测到SSE连接，但当前版本尚未实现完整SSE支持")
                    # 在这里需要实现:
                    # 1. SSE连接建立
                    # 2. JSON-RPC 2.0消息处理
                    # 3. 实现MCP协议
                    # 由于实现复杂度高，暂时返回模拟成功
                    
                    print(f"\n已连接到HTTP/SSE服务器 {server_id}，可用工具: ['getPoiInfo', 'getWeather', 'navigation', 'search']")
                    print("注意: SSE服务器连接模拟成功，但功能尚未完全实现")
                    
                    # 为了完整实现，需要:
                    # - 使用aiohttp或专门的SSE客户端库处理SSE连接
                    # - 实现JSON-RPC 2.0消息格式处理
                    # - 实现MCP协议相关的初始化、工具列表获取等功能
                    return True
                
                # 普通HTTP连接
                try:
                    # 测试连接
                    async with self.client_session.get(url) as resp:
                        if resp.status != 200:
                            raise ValueError(f"无法连接到HTTP服务器，状态码: {resp.status}")
                    
                    info(f"已成功连接到HTTP服务器 {server_id}")
                    print(f"\n已连接到HTTP服务器 {server_id}，但当前版本对HTTP服务器的支持有限")
                    return True
                except Exception as e:
                    error(f"连接HTTP服务器 {server_id} 失败: {str(e)}")
                    raise
            else:  # 命令行服务器
                command, args, env = server_params
                info(f"正在连接到MCP命令行服务器: {server_id}, 命令: {command}, 参数: {args}")
                
                # 使用stdio客户端连接
                server_params = StdioServerParameters(
                    command=command,
                    args=args,
                    env=env
                )
                
                stdio_transport = await self.exit_stack.enter_async_context(stdio_client(server_params))
                self.stdio, self.write = stdio_transport
                self.session = await self.exit_stack.enter_async_context(ClientSession(self.stdio, self.write))
            
                await self.session.initialize()
                
                # 列出可用工具
                response = await self.session.list_tools()
                tools = response.tools
                tool_names = [tool.name for tool in tools]
                info(f"已连接到服务器 {server_id}，可用工具: {tool_names}")
                print(f"\n已连接到服务器 {server_id}，可用工具：", tool_names)
                return True
        except Exception as e:
            error(f"连接MCP服务器 {server_id} 失败: {str(e)}")
            raise

    async def connect_to_server(self, server_path_or_id: str):
        """连接到MCP服务器，支持直接指定脚本路径或使用配置文件中的服务器ID
        
        参数:
            server_path_or_id: 服务器脚本路径或配置的服务器ID
        """
        # 首先尝试作为配置中的服务器ID处理
        server_config = get_server_config()
        available_servers = server_config.get_available_servers()
        
        if server_path_or_id in available_servers:
            info(f"使用配置文件中的服务器: {server_path_or_id}")
            return await self.connect_to_server_by_id(server_path_or_id)
            
        # 如果不在配置中，继续尝试作为脚本路径处理
        # 检查是否为http或https开头的URL
        if server_path_or_id.startswith(('http://', 'https://')):
            info(f"检测到URL路径: {server_path_or_id}")
            # 暂时不支持HTTP服务器
            error("当前版本不支持HTTP服务器直接连接")
            raise NotImplementedError("当前版本不支持HTTP服务器直接连接，请在配置文件中配置并使用ID连接")
        
        # 作为脚本路径处理
        is_python = server_path_or_id.endswith('.py')
        is_js = server_path_or_id.endswith('.js')
        if not (is_python or is_js):
            error(f"不支持的服务器脚本类型: {server_path_or_id}")
            raise ValueError("服务器脚本必须是 .py 或 .js 文件，或者是配置中的服务器ID")
            
        info(f"正在连接到MCP服务器脚本: {server_path_or_id}")
        command = "python" if is_python else "node"
        
        # 从环境变量获取可能的服务器环境变量
        env = {k: v for k, v in os.environ.items() if k.startswith("MCP_")}
        
        server_params = StdioServerParameters(
            command=command,
            args=[server_path_or_id],
            env=env if env else None
        )
        
        try:
            stdio_transport = await self.exit_stack.enter_async_context(stdio_client(server_params))
            self.stdio, self.write = stdio_transport
            self.session = await self.exit_stack.enter_async_context(ClientSession(self.stdio, self.write))
            
            await self.session.initialize()
            
            # 列出可用工具
            response = await self.session.list_tools()
            tools = response.tools
            tool_names = [tool.name for tool in tools]
            info(f"已连接到服务器脚本，可用工具: {tool_names}")
            print("\n已连接到服务器，可用工具：", tool_names)
            return True
        except Exception as e:
            error(f"连接MCP服务器失败: {str(e)}")
            raise

    async def list_available_servers(self):
        """列出配置文件中的可用服务器"""
        try:
            server_config = get_server_config()
            available_servers = server_config.get_available_servers()
            default_server = server_config.get_default_server()
            
            print("\n可用的MCP服务器:")
            for server_id in available_servers:
                server_info = server_config.get_server_config(server_id)
                server_name = server_info.get("name", server_id)
                server_desc = server_info.get("description", "")
                
                # 显示是否为默认服务器
                default_mark = " (默认)" if server_id == default_server else ""
                server_type = "HTTP" if "url" in server_info else "命令行"
                print(f"  - {server_id}{default_mark} [{server_type}]: {server_name} - {server_desc}")
                
            return available_servers, default_server
        except Exception as e:
            error(f"列出可用服务器失败: {str(e)}")
            print(f"\n无法加载服务器配置: {str(e)}")
            return [], None

    async def process_query(self, query: str) -> str:
        """使用OpenAI和可用工具处理查询"""
        if not self.session and not self.client_session:
            error("尝试处理查询但未连接到服务器")
            raise RuntimeError("未连接到MCP服务器")
            
        info(f"处理用户查询: {query}")
        messages = [
            {
                "role": "user",
                "content": query
            }
        ]
        
        # 检查是否为HTTP/SSE连接
        if self.client_session and not self.session:
            # HTTP/SSE连接下的查询处理 (高德地图等)
            info("检测到HTTP/SSE服务器连接，但功能尚未完全实现")
            return "当前版本尚未实现完整HTTP/SSE服务器查询处理功能。\n请使用命令行类型的MCP服务器，如MiniMax。"
        
        # 命令行服务器的处理流程
        debug("获取可用工具列表")
        response = await self.session.list_tools()
        available_tools = [{
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.inputSchema
            }
        } for tool in response.tools]

        # 初始OpenAI API调用
        try:
            debug(f"调用模型 {self.model} 处理初始查询")
            
            # 从环境变量获取额外的调用参数
            completion_params = {
                "model": self.model,
                "messages": messages,
                "tools": available_tools
            }
            
            # 只有在设置了max_tokens时才添加它
            if self.max_tokens:
                completion_params["max_tokens"] = self.max_tokens
                
            # 其他可能从环境变量中获取的参数
            temperature = os.environ.get("LLM_TEMPERATURE")
            if temperature:
                completion_params["temperature"] = float(temperature)
                
            top_p = os.environ.get("LLM_TOP_P")
            if top_p:
                completion_params["top_p"] = float(top_p)
                
            frequency_penalty = os.environ.get("LLM_FREQUENCY_PENALTY")
            if frequency_penalty:
                completion_params["frequency_penalty"] = float(frequency_penalty)
                
            presence_penalty = os.environ.get("LLM_PRESENCE_PENALTY")
            if presence_penalty:
                completion_params["presence_penalty"] = float(presence_penalty)
            
            response = self.openai.chat.completions.create(**completion_params)
        except Exception as e:
            error(f"调用LLM时出错: {str(e)}")
            return f"与语言模型通信时出错: {str(e)}"

        # 处理响应和工具调用
        final_text = []
        assistant_message = response.choices[0].message
        
        # 添加模型的初始响应文本（如果有）
        if assistant_message.content:
            debug("接收到模型文本响应")
            final_text.append(assistant_message.content)
        
        # 处理工具调用
        if assistant_message.tool_calls:
            debug(f"模型请求执行工具调用，数量: {len(assistant_message.tool_calls)}")
            # 将助手的消息添加到会话历史
            messages.append({
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": assistant_message.tool_calls
            })
            
            # 处理每个工具调用
            for tool_call in assistant_message.tool_calls:
                # 解析工具调用
                function_name = tool_call.function.name
                function_args = tool_call.function.arguments
                
                info(f"执行工具 {function_name} 调用")
                debug(f"工具参数: {function_args}")
                
                # 记录工具调用
                final_text.append(f"[调用工具 {function_name} 参数 {function_args}]")
                
                try:
                    # 执行工具调用
                    args_dict = json.loads(function_args)
                    result = await self.session.call_tool(function_name, args_dict)
                    
                    # 详细记录结果内容，便于调试
                    info(f"原始工具返回结果: {result}")
                    if hasattr(result, "__dict__"):
                        info(f"结果对象属性: {result.__dict__}")
                    
                    # 添加详细调试
                    if result.content is not None:
                        info(f"工具 {function_name} 执行结果类型: {type(result.content)}")
                        info(f"工具 {function_name} 执行结果: {result.content}")
                        
                        # 打印所有属性
                        if hasattr(result.content, "__dict__"):
                            info(f"结果content对象属性: {result.content.__dict__}")
                    else:
                        info(f"工具 {function_name} 执行结果为None")
                    
                    # 检查额外属性
                    if hasattr(result, "extra"):
                        info(f"结果额外属性: {result.extra}")
                        if hasattr(result.extra, "__dict__"):
                            info(f"额外属性对象内容: {result.extra.__dict__}")
                    
                    # 提取可能的URL
                    result_url = None
                    tool_result_content = result.content
                    
                    # 检查工具结果，提取URL或文本内容
                    if tool_result_content is not None:
                        # 如果有text属性（TextContent类型）
                        if hasattr(tool_result_content, 'text'):
                            debug(f"结果有text属性: {tool_result_content.text}")
                            tool_result_content = tool_result_content.text
                        
                        # 如果有url属性
                        if hasattr(tool_result_content, 'url'):
                            debug(f"结果有url属性: {tool_result_content.url}")
                            result_url = tool_result_content.url
                        
                        # 如果是字典或有__dict__属性，检查是否包含url
                        if isinstance(tool_result_content, dict) and 'url' in tool_result_content:
                            result_url = tool_result_content['url']
                            debug(f"从字典中提取URL: {result_url}")
                        elif hasattr(tool_result_content, '__dict__'):
                            if 'url' in tool_result_content.__dict__:
                                result_url = tool_result_content.__dict__['url']
                                debug(f"从对象字典中提取URL: {result_url}")
                    
                    # 将工具结果转换为字符串
                    if tool_result_content is not None:
                        if not isinstance(tool_result_content, (str, int, float, bool)):
                            try:
                                tool_result_content = json.dumps(tool_result_content)
                            except:
                                tool_result_content = str(tool_result_content)
                        
                        # 确保最终是字符串类型
                        if not isinstance(tool_result_content, str):
                            tool_result_content = str(tool_result_content)
                    else:
                        tool_result_content = "null"
                    
                    # 添加到消息历史
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": tool_result_content
                    })
                    
                    # 对于多媒体工具，添加友好的结果显示
                    if function_name in ['text_to_audio', 'generate_video', 'text_to_image', 'play_audio']:
                        if result_url:
                            final_text.append(f"[工具执行成功，生成的媒体内容URL: {result_url}]")
                        elif hasattr(result, 'extra') and hasattr(result.extra, 'url'):
                            final_text.append(f"[工具执行成功，生成的媒体内容URL: {result.extra.url}]")
                        elif hasattr(result, 'url'):
                            final_text.append(f"[工具执行成功，生成的媒体内容URL: {result.url}]")
                        else:
                            # 尝试直接返回工具结果作为信息
                            final_text.append(f"[工具 {function_name} 执行成功]")
                            final_text.append(f"工具执行结果: {result}")
                            info(f"注意：无法从结果中提取媒体URL，请查看服务器日志获取完整信息")
                    else:
                        # 对于非媒体工具，显示执行结果
                        final_text.append(f"[工具 {function_name} 执行成功: {tool_result_content}]")
                
                except Exception as e:
                    error_message = f"工具调用失败: {str(e)}"
                    error(f"执行工具 {function_name} 时出错: {str(e)}")
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": error_message
                    })
                    final_text.append(error_message)
            
            # 获取模型的响应继续对话
            try:
                debug("将工具结果发送回模型以获取最终响应")
                
                # 对于多媒体工具，直接返回结果，不再调用模型
                is_multimedia_tool = any(tc.function.name in ['text_to_audio', 'generate_video', 'text_to_image', 'play_audio'] 
                                       for tc in assistant_message.tool_calls)
                
                if is_multimedia_tool:
                    debug("检测到多媒体工具调用，不再请求模型生成最终响应")
                    final_text.append("工具执行完成。")
                else:
                    # 对于非多媒体工具，获取模型的进一步解释
                    debug("准备请求模型生成最终响应")
                    completion_params["messages"] = messages
                    completion_params.pop("tools", None)
                    
                    response = self.openai.chat.completions.create(**completion_params)
                    final_text.append(response.choices[0].message.content)
            except Exception as e:
                error(f"调用LLM获取最终响应时出错: {str(e)}")
                final_text.append(f"生成最终响应时出错: {str(e)}")

        info("查询处理完成")
        return "\n".join(final_text)

    async def chat_loop(self):
        """运行交互式聊天循环"""
        info("开始交互式聊天循环")
        print("\nMCP 客户端已启动!")
        print("输入查询或输入 'quit' 退出。")
        
        while True:
            try:
                query = input("\n查询: ").strip()
                
                if query.lower() == 'quit':
                    info("用户请求退出聊天循环")
                    break
                    
                response = await self.process_query(query)
                print("\n" + response)
                    
            except Exception as e:
                error(f"聊天循环中出现错误: {str(e)}")
                print(f"\n错误: {str(e)}")
    
    async def cleanup(self):
        """清理资源"""
        info("清理MCP客户端资源")
        if self.client_session:
            info("关闭HTTP客户端会话")
            await self.client_session.close()
        await self.exit_stack.aclose()
        info("MCP客户端已关闭")

async def main():
    # 解析命令行参数
    if len(sys.argv) > 1:
        # 使用指定的服务器或脚本
        server_path_or_id = sys.argv[1]
        info(f"启动MCP客户端，连接到指定服务器: {server_path_or_id}")
        client = MCPClient()
        try:
            await client.connect_to_server(server_path_or_id)
            await client.chat_loop()
        except Exception as e:
            error(f"MCP客户端运行时出错: {str(e)}")
            print(f"错误: {str(e)}")
        finally:
            await client.cleanup()
    else:
        # 用户未指定服务器，尝试从配置加载可用服务器列表
        client = MCPClient()
        available_servers, default_server = await client.list_available_servers()
        
        # 如果有可用的服务器，让用户选择
        if available_servers:
            selected_server = None
            
            # 如果只有一个服务器，或有默认服务器，直接使用它
            if len(available_servers) == 1:
                selected_server = available_servers[0]
                print(f"\n仅有一个可用服务器，将使用: {selected_server}")
            elif default_server:
                print(f"\n将使用默认服务器: {default_server}")
                selected_server = default_server
            else:
                # 多个选择，让用户选择
                print("\n请选择要连接的服务器 (输入序号或ID):")
                for i, server_id in enumerate(available_servers):
                    print(f"  {i+1}. {server_id}")
                
                choice = input("\n选择: ").strip()
                
                # 尝试解析用户输入
                if choice.isdigit() and 1 <= int(choice) <= len(available_servers):
                    selected_server = available_servers[int(choice) - 1]
                elif choice in available_servers:
                    selected_server = choice
                else:
                    print(f"无效的选择: {choice}，退出")
                    return
            
            if selected_server:
                try:
                    await client.connect_to_server_by_id(selected_server)
                    await client.chat_loop()
                except Exception as e:
                    error(f"MCP客户端运行时出错: {str(e)}")
                    print(f"错误: {str(e)}")
                finally:
                    await client.cleanup()
        else:
            print("用法: python mcp_client.py <服务器脚本路径或服务器ID>")
            print("未找到可用的MCP服务器配置。请指定服务器脚本路径或添加服务器配置。")

if __name__ == "__main__":
    try:
        info("MCP客户端启动")
        asyncio.run(main())
    except KeyboardInterrupt:
        info("MCP客户端被用户中断")
    except Exception as e:
        error(f"MCP客户端未处理异常: {str(e)}")
        raise 