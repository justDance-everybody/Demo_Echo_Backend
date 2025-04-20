#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import asyncio
import json
from typing import Optional, Tuple
from contextlib import AsyncExitStack
import uuid

# MCP 相关库
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# OpenAI SDK
from openai import OpenAI, AsyncOpenAI

# 读取 .env 文件的工具
from dotenv import load_dotenv

class LLMClient:
    def __init__(self, api_key: str, model: str, base_url: str):
        """
        参数：
          api_key - OpenAI API密钥
          model - 模型名称
          base_url - API基础URL
        """
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url
        )
        self.model = model
        
    async def generate(self, messages: list) -> str:
        """
        调用 OpenAI Chat Completion API，返回模型生成的文本。
        messages 格式：
          [{"role": "system", "content": "系统说明"}, 
           {"role": "user",   "content": "用户输入"}, ...]
        """
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=1000,
        )
        # 取第一个候选的消息内容
        return response.choices[0].message.content

class MCPSession:
    def __init__(self, llm: LLMClient):
        """
        参数：
          llm - LLM 客户端
        """
        self.llm = llm
        self.messages = []  # 会话消息历史
        self.mcp_session = None  # MCP 会话对象
        
    async def send_message(self, message: str) -> str:
        """
        发送消息并获取回复
        参数：
          message - 要发送的消息
        返回：
          回复消息
        """
        # 添加用户消息
        self.messages.append({"role": "user", "content": message})
        
        # 调用LLM获取回复
        response = await self.llm.client.chat.completions.create(
            model=self.llm.model,
            messages=self.messages
        )
        
        # 获取回复内容
        reply = response.choices[0].message.content
        
        # 添加助手回复
        self.messages.append({"role": "assistant", "content": reply})
        
        return reply
        
    async def call_tool(self, tool_name: str, tool_args: dict):
        """
        调用MCP工具
        参数：
          tool_name - 工具名称
          tool_args - 工具参数
        返回：
          工具调用结果
        """
        if not self.mcp_session:
            raise RuntimeError("MCP会话未初始化")
            
        # 调用MCP工具
        result = await self.mcp_session.call_tool(tool_name, tool_args)
        return result

# -----------------------------------------------------------------------------
# 一、入口：加载环境变量并启动主流程
# -----------------------------------------------------------------------------
def load_environment():
    """
    根据环境变量 ENV 加载对应的 .env 文件，并读取关键变量：
      - LLM_API_KEY   : 大模型 API Key
      - LLM_MODEL     : 模型名称（如 "gpt-4o-mini"）
      - LLM_API_BASE  : OpenAI API Base URL（如 "https://api.openai.com/v1"）
    """
    # 默认为 dev 环境，可通过 ENV=staging 等切换
    env = os.getenv("ENV", "dev")
    dotenv_path = os.path.join(os.getcwd(), f".env.{env}")
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path)
    else:
        # 若指定文件不存在，也尝试加载根目录下的 .env
        load_dotenv()

    # 强制要求存在这三个环境变量
    try:
        llm_key  = os.environ["LLM_API_KEY"]
        llm_model = os.environ["LLM_MODEL"]
        llm_base = os.environ["LLM_API_BASE"]
    except KeyError as e:
        print(f"[ERROR] 缺少环境变量: {e}")
        sys.exit(1)

    return llm_key, llm_model, llm_base

async def main():
    # 1) 创建 LLM 客户端
    llm = LLMClient(
        api_key=os.getenv("LLM_API_KEY"),
        model=os.getenv("LLM_MODEL"),
        base_url=os.getenv("LLM_API_BASE"),
    )

    # 2) 创建 MCP 客户端
    client = MCPClient(llm)
    
    # 3) 初始化会话
    await client.init_session()

    # 4) 连接到 MCP 服务器并运行（chat_loop已在connect_to_mcp中调用）
    await client.connect_to_mcp(sys.argv[1])

# -----------------------------------------------------------------------------
# 二、MCP 客户端：管理与 MCP 服务器的 stdio 通信，以及多轮对话逻辑
# -----------------------------------------------------------------------------
class MCPClient:
    def __init__(self, llm: LLMClient):
        """
        参数：
          llm - LLM 客户端
        """
        self.llm = llm
        self.exit_stack = None
        self.session_id = None
        self.stdio = None
        self.writer = None
        self.session = None  # MCP会话对象

    async def init_session(self):
        """初始化会话"""
        # 创建异步上下文管理器
        self.exit_stack = AsyncExitStack()
        # 初始化会话状态
        self.session_id = str(uuid.uuid4())
        self.stdio = None
        self.writer = None
        # 创建MCP会话
        self.session = MCPSession(self.llm)

    async def connect_to_mcp(self, server_name: str):
        """
        连接到MCP服务器
        参数：
          server_name - 服务器名称，对应config/mcp_servers.json中的配置
        """
        # 加载服务器配置
        config_path = os.path.join(os.getcwd(), "config", "mcp_servers.json")
        with open(config_path, "r") as f:
            config = json.load(f)
        
        # 获取指定服务器的配置
        server_config = config["mcpServers"].get(server_name)
        if not server_config:
            raise ValueError(f"未找到服务器配置: {server_name}")
        
        # 设置环境变量
        env = os.environ.copy()
        if server_config.get("env"):
            env.update(server_config["env"])
        
        # 构建命令参数
        command = server_config["command"]
        args = server_config["args"]
        
        # 输出调试信息
        print(f"启动服务器: {command} {' '.join(args)}")
        
        # 启动stdio客户端
        stdio = await self.exit_stack.enter_async_context(
            stdio_client(StdioServerParameters(command=command, args=args, env=env))
        )
        
        # stdio返回的是(reader, writer)元组
        reader, writer = stdio
        self.stdio = reader
        self.writer = writer
        
        # 创建MCP会话并初始化
        client_session = ClientSession(reader, writer)
        await client_session.initialize()
        
        # 获取可用工具列表
        tools_resp = await client_session.list_tools()
        print(f"可用工具: {[tool.name for tool in tools_resp.tools]}")
        
        # 设置session的mcp_session
        self.session.mcp_session = client_session
        
        # 运行聊天循环
        await self.chat_loop()

    async def process_query(self, query: str) -> str:
        """
        处理一次用户询问：
          1) 先发给大模型生成初步回答
          2) 如果回答中包含工具调用请求，再调用 MCP 工具，并将结果反馈给模型
        """
        if not self.session:
            raise RuntimeError("还未连接到 MCP 服务器")

        # 1. 准备消息
        messages = [{"role": "user", "content": query}]

        # 2. 调用大模型
        try:
            text = await self.llm.generate(messages)
        except Exception as e:
            return f"[LLM 调用失败] {e}"

        # 如果模型内容中包含特殊占位（如 JSON 指令），可解析后进行工具调用
        # 这里假设工具调用格式为: {"tool":"工具名","input":{...}}
        final_output = [text]
        try:
            # 尝试把 text 当 JSON 解析，若成功并含 tool，则执行
            j = json.loads(text)
            if isinstance(j, dict) and "tool" in j and "input" in j:
                tool_name = j["tool"]
                tool_args = j["input"]
                # 调用 MCP 工具
                result = await self.session.call_tool(tool_name, tool_args)
                # 将工具结果反馈下去
                followup_msg = {
                    "role": "user",
                    "content": json.dumps({
                        "type": "tool_result",
                        "tool": tool_name,
                        "result": result.content
                    }, ensure_ascii=False)
                }
                messages.append({"role": "assistant", "content": text})
                messages.append(followup_msg)
                # 再次向大模型询问
                text2 = await self.llm.generate(messages)
                final_output.append(f"[工具 {tool_name} 调用结果] {result.content}")
                final_output.append(text2)
        except json.JSONDecodeError:
            # 不是 JSON 格式，就跳过工具调用
            pass

        return "\n".join(final_output)

    async def chat_loop(self):
        """
        运行一个简单的命令行交互循环，
        用户输入 'quit' 则退出。
        """
        print("MCP Client 已启动，输入查询或 'quit' 退出。")
        while True:
            query = input(">> ").strip()
            if query.lower() == "quit":
                break
            try:
                response = await self.process_query(query)
                print(response)
            except Exception as e:
                print(f"[Error] {e}")
    
    async def cleanup(self):
        """关闭所有异步上下文，释放资源"""
        await self.exit_stack.aclose()

# -----------------------------------------------------------------------------
# 四、运行入口
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    # Python 3.7+ 推荐用 asyncio.run
    asyncio.run(main())
