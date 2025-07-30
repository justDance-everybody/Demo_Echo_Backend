#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import asyncio
import json
import os.path
from typing import Optional, List, Dict
from contextlib import AsyncExitStack
from dotenv import load_dotenv
from openai import AsyncOpenAI
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

load_dotenv()
LLM_API_KEY = os.getenv("LLM_API_KEY")
LLM_MODEL = os.getenv("LLM_MODEL")
LLM_API_BASE = os.getenv("LLM_API_BASE")
if not all([LLM_API_KEY, LLM_MODEL, LLM_API_BASE]):
    raise RuntimeError("缺少环境变量: LLM_API_KEY、LLM_MODEL 或 LLM_API_BASE")

llm = AsyncOpenAI(api_key=LLM_API_KEY, base_url=LLM_API_BASE)

class MCPClient:
    def __init__(self):
        self.exit_stack = AsyncExitStack()
        self.server_configs: Dict[str, Dict] = {}
        self.session: Optional[ClientSession] = None
        self.tools: List = []
        path = os.getenv("MCP_SERVERS_PATH", "config/mcp_servers.json")
        with open(path, encoding='utf-8') as f:
            self.server_configs = json.load(f).get("mcpServers", {})
        print(f"已加载 {len(self.server_configs)} 个 MCP 服务器配置。")

    async def connect(self, name: str):
        cfg = self.server_configs.get(name)
        if cfg:
            cmd, args = cfg["command"], cfg.get("args", [])
            env = os.environ.copy()
            if cfg.get("env"): env.update(cfg["env"])
        else:
            ext = os.path.splitext(name)[1].lower()
            if ext not in (".py", ".js"): raise ValueError("脚本必须以 .py 或 .js 结尾")
            cmd = "python" if ext == ".py" else "node"
            args = [name]
            env = os.environ.copy()
        print(f"启动 MCP 服务器: {cmd} {' '.join(args)}")
        try:
            # 为stdio_client连接添加10秒超时
            reader, writer = await asyncio.wait_for(
                self.exit_stack.enter_async_context(
                    stdio_client(StdioServerParameters(command=cmd, args=args, env=env))
                ),
                timeout=10.0
            )
            # 为session初始化添加10秒超时
            self.session = await asyncio.wait_for(
                self.exit_stack.enter_async_context(
                    ClientSession(reader, writer)
                ),
                timeout=10.0
            )
            await asyncio.wait_for(self.session.initialize(), timeout=10.0)
            resp = await asyncio.wait_for(self.session.list_tools(), timeout=10.0)
        except asyncio.TimeoutError:
            print(f"连接到 MCP 服务器 {name} 超时 (10秒)")
            raise RuntimeError(f"连接到 MCP 服务器 {name} 超时")
        except Exception as e:
            print(f"连接到 MCP 服务器 {name} 失败: {e}")
            raise
        self.tools = resp.tools
        print("\n--- 可用工具详细信息 ---")
        if not self.tools:
            print("未找到任何可用工具。")
        else:
            for i, tool in enumerate(self.tools):
                print(f"工具 {i+1}:")
                print(f"  Name (用于 tool_id 和 endpoint['mcp_tool_name']): {tool.name}")
                print(f"  Description: {tool.description}")
                schema_str = "{}"
                if tool.inputSchema:
                    try:
                        schema_str = json.dumps(tool.inputSchema, ensure_ascii=False, indent=2)
                    except TypeError:
                        schema_str = f"无法序列化为 JSON: {tool.inputSchema}"
                print(f"  Input Schema (用于 request_schema):\n{schema_str}")
                print("-" * 20)
        print(f"已连接 MCP，共找到 {len(self.tools)} 个工具。\n")

    async def process_query(self, query: str) -> str:
        if not self.session: return "请先连接到 MCP 服务器。"
        print(f"正在处理: {query}")
        messages = [{"role":"user","content":query}]
        funcs = []
        for t in self.tools:
            funcs.append({"type":"function","function":{"name":t.name,"description":t.description,"parameters":t.inputSchema}})
        resp = await llm.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            tools=funcs,
            tool_choice="auto"
        )
        msg = resp.choices[0].message
        calls = getattr(msg, 'tool_calls', []) or []
        final: List[str] = []
        # 执行所有调用
        for call in calls:
            name = call.function.name
            args = json.loads(call.function.arguments)
            if not isinstance(args, dict): args={"text":str(args)}
            print(f"调用工具 {name} 参数 {args}")
            # 添加超时处理，避免工具执行时间过长
            try:
                result = await asyncio.wait_for(self.session.call_tool(name, args), timeout=6.0)
            except asyncio.TimeoutError:
                print(f"工具 {name} 执行超时 (6秒)")
                result = type('MockResult', (), {'content': f'工具 {name} 执行超时，请稍后重试'})()
            content = getattr(result.content, 'text', result.content)
            if isinstance(content, (list, dict)): content=str(content)
            final.append(f"[调用 {name} -> {content}]")
            messages.extend([
                {"role":"assistant","content":None,"tool_calls":[{"id":call.id,"type":"function","function":{"name":name,"arguments":json.dumps(args)}}]},
                {"role":"tool","tool_call_id":call.id,"content":content}
            ])
        if calls:
            messages.append({"role":"user","content":"请基于以上工具结果给出最终回答。"})
            resp2 = await llm.chat.completions.create(model=LLM_MODEL,messages=messages)
            final.append(resp2.choices[0].message.content or "")
        else:
            final.append(msg.content or "")
        return "\n".join(final)

    async def run(self):
        print("\nMCP 客户端启动。")
        names = list(self.server_configs.keys())
        for i,n in enumerate(names,1): print(f"{i}. {n}")
        while True:
            sel=input("选择服务器(quit退出):").strip()
            if sel=='quit':return
            if sel.isdigit() and 1<=int(sel)<=len(names):
                await self.connect(names[int(sel)-1]);break
            print("无效输入")
        print("连接成功，输入 'quit' 结束。")
        while True:
            q=input(">").strip()
            if q=='quit':break
            print(await self.process_query(q))

    async def close(self):
        await self.exit_stack.aclose()

async def main():
    client=MCPClient()
    try: await client.run()
    finally: await client.close()

if __name__=='__main__': asyncio.run(main())
