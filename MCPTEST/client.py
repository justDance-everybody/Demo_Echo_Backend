import sys
import os
import asyncio
import json
from typing import Optional, Tuple, List, Dict
from contextlib import AsyncExitStack
from dotenv import load_dotenv
from openai import OpenAI
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# 1. 指定加载的 .env 文件路径
dotenv_path = ".env"  # 直接使用当前目录下的 .env 文件
load_dotenv(dotenv_path)

# 2. 从环境变量读取 LLM 配置
LLM_API_KEY = os.getenv("LLM_API_KEY")
LLM_MODEL = os.getenv("LLM_MODEL")
LLM_API_BASE = os.getenv("LLM_API_BASE")
if not all([LLM_API_KEY, LLM_MODEL, LLM_API_BASE]):
    raise RuntimeError("Missing one of LLM_API_KEY, LLM_MODEL, or LLM_API_BASE in environment.")

# 配置 OpenAI 客户端
client = OpenAI(
    api_key=LLM_API_KEY,
    base_url=LLM_API_BASE
)

class MCPClient:
    def __init__(self):
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.server_configs: Dict = {}  # 存放从 JSON 文件加载的 MCP 服务器配置
        self.current_tools: List = []

        # 3. 加载默认 MCP 服务器配置
        mcp_config_path = os.getenv("MCP_SERVERS_PATH", "mcp_servers.json")
        try:
            with open(mcp_config_path, 'r') as f:
                config_data = json.load(f)
                self.server_configs = config_data.get("mcpServers", {})
            print(f"已加载 {len(self.server_configs)} 个 MCP 服务器配置")
        except Exception as e:
            print(f"加载配置文件失败: {e}")
            self.server_configs = {}

    async def connect_to_server(self, server_name_or_path: str):
        """连接到 MCP 服务器（可以是配置名称或脚本路径）"""
        # 首先检查是否是预配置的服务器名称
        if server_name_or_path in self.server_configs:
            config = self.server_configs[server_name_or_path]
            cmd = config["command"]
            args = config["args"]
            
            # 合并环境变量
            env = os.environ.copy()  # 获取当前环境变量
            if "env" in config:
                env.update(config["env"])  # 添加配置文件中的环境变量
        else:
            # 否则按照脚本路径处理
            ext = os.path.splitext(server_name_or_path)[1].lower()
            if ext not in ('.py', '.js'):
                raise ValueError("服务器脚本必须是 .py 或 .js 文件")
            cmd = 'python' if ext == '.py' else 'node'
            args = [server_name_or_path]
            env = os.environ.copy()

        params = StdioServerParameters(command=cmd, args=args, env=env)
        
        transport = await self.exit_stack.enter_async_context(stdio_client(params))
        self.stdio, self.write = transport
        self.session = await self.exit_stack.enter_async_context(
            ClientSession(self.stdio, self.write)
        )
        await self.session.initialize()

        # 获取并缓存可用工具
        resp = await self.session.list_tools()
        self.current_tools = resp.tools
        print("已连接。可用工具:", [t.name for t in self.current_tools])

    async def process_query(self, query: str) -> str:
        """使用 OpenAI ChatCompletion 调用 LLM，并自动执行 MCP 工具调用"""
        if not self.session:
            return "请先通过 `connect <服务器名称或脚本路径>` 连接到 MCP 服务器。"

        # 构造消息
        messages = [{"role": "user", "content": query}]

        # 转换 MCP 工具到 OpenAI 函数格式
        tools = [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.inputSchema  # 假定 inputSchema 为 JSON Schema
                }
            }
            for t in self.current_tools
        ]

        try:
            # 调用 OpenAI
            response = client.chat.completions.create(
                model=LLM_MODEL,
                messages=messages,
                tools=tools,
                tool_choice="auto"
            )

            final_text = []
            msg = response.choices[0].message
            # 如果模型调用了函数
            tool_calls = msg.tool_calls
            if tool_calls:
                for tool_call in tool_calls:
                    fn_name = tool_call.function.name
                    fn_args = json.loads(tool_call.function.arguments)
                    
                    # 确保 fn_args 是一个字典
                    if not isinstance(fn_args, dict):
                        fn_args = {"text": str(fn_args)}

                    # 执行 MCP 工具
                    try:
                        result = await self.session.call_tool(fn_name, fn_args)
                        # 处理工具返回结果
                        result_content = result.content
                        if hasattr(result_content, 'text'):  # 处理 TextContent 对象
                            result_content = result_content.text
                        elif isinstance(result_content, (list, dict)):  # 处理列表或字典
                            result_content = str(result_content)
                        else:
                            result_content = str(result_content)
                            
                        final_text.append(f"[调用 {fn_name} -> {result_content}]")

                        # 将工具结果反馈给模型
                        messages.extend([
                            {
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [
                                    {
                                        "id": tool_call.id,
                                        "type": "function",
                                        "function": {
                                            "name": fn_name,
                                            "arguments": json.dumps(fn_args)
                                        }
                                    }
                                ]
                            },
                            {
                                "role": "tool",
                                "tool_call_id": tool_call.id,
                                "content": result_content
                            }
                        ])
                    except Exception as e:
                        final_text.append(f"[工具调用错误: {str(e)}]")
                        continue

                # 获取模型的最终回应
                try:
                    messages.append({"role": "user", "content": "请总结一下上述操作的结果，并说明下一步可以做什么"})
                    followup = client.chat.completions.create(
                        model=LLM_MODEL,
                        messages=messages
                    )
                    if followup.choices[0].message.content:
                        final_text.append(followup.choices[0].message.content)
                except Exception as e:
                    final_text.append(f"[获取总结时出错: {str(e)}]")
            else:
                final_text.append(msg.content)

            return "\n".join(final_text)
        except Exception as e:
            return f"处理查询时出错: {str(e)}"

    async def chat_loop(self):
        print("\nMCP 客户端已启动！")
        
        # 显示可用服务器列表
        print("\n可用的服务器:")
        server_list = list(self.server_configs.items())
        for idx, (name, config) in enumerate(server_list, 1):
            print(f"{idx}. {name}: {config.get('description', '无描述')}")
        
        # 让用户选择服务器
        while True:
            try:
                choice = input("\n请选择要连接的服务器 (输入序号 1-{}, 或 'quit' 退出): ".format(len(server_list)))
                if choice.lower() == 'quit':
                    break
                
                try:
                    idx = int(choice) - 1
                    if 0 <= idx < len(server_list):
                        server_name = server_list[idx][0]
                        print(f"\n正在连接到 {server_name}...")
                        await self.connect_to_server(server_name)
                        break
                    else:
                        print("无效的选择，请输入有效的序号")
                except ValueError:
                    print("请输入有效的数字")
                continue
            except Exception as e:
                print(f"连接失败: {e}")
                continue

        # 进入主对话循环
        if self.session:
            print("\n连接成功！输入 'quit' 退出。")
            while True:
                query = input("\n> ").strip()
                if query.lower() == 'quit':
                    break

                try:
                    resp = await self.process_query(query)
                    print(resp)
                except Exception as e:
                    print(f"处理查询时出错: {e}")
        else:
            print("未能成功连接到服务器，程序退出。")

    async def cleanup(self):
        await self.exit_stack.aclose()

async def main():
    client = MCPClient()
    try:
        await client.chat_loop()
    finally:
        await client.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
