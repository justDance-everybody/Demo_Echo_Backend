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
        reader, writer = await self.exit_stack.enter_async_context(
            stdio_client(StdioServerParameters(command=cmd, args=args, env=env))
        )
        self.session = await self.exit_stack.enter_async_context(
            ClientSession(reader, writer)
        )
        await self.session.initialize()
        resp = await self.session.list_tools()
        self.tools = resp.tools
        print("已连接 MCP，可用工具:", [t.name for t in self.tools])

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
            result = await self.session.call_tool(name, args)
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
