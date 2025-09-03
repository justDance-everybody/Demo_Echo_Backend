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
        
        # 检查是否已有同类进程运行，如果有则跳过启动新进程
        import psutil
        existing_process = None
        for proc in psutil.process_iter(['pid', 'cmdline']):
            try:
                cmdline = ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else ''
                # 检查更广泛的MCP服务器进程模式
                if any(pattern in cmdline.lower() for pattern in ['@amap/amap-maps-mcp-server', 'mcp-amap', f'mcp.*{name}']):
                    if proc.info['pid'] != os.getpid():
                        existing_process = proc.info['pid']
                        print(f"发现现有MCP服务器进程 (PID: {existing_process})，避免重复启动")
                        # 抛出特定异常，让上层处理
                        raise RuntimeError(f"MCP服务器 {name} 已在运行 (PID: {existing_process})，避免重复启动")
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        print(f"连接到 MCP 服务器: {cmd} {' '.join(args)}" + (f" (复用进程 PID: {existing_process})" if existing_process else " (启动新进程)"))
        
        import time
        start_time = time.time()
        
        try:
            # 为不同服务器设置不同的超时时间
            if name in ['web3-rpc', 'blockchain-rpc', 'amap-maps']:
                step_timeout = 30.0  # 慢服务器使用30秒超时
                total_timeout_desc = "30秒"
            else:
                step_timeout = 10.0  # 其他服务器使用10秒超时
                total_timeout_desc = "10秒"
            
            print(f"🔧 开始连接步骤 1: stdio_client 连接... (超时: {step_timeout}秒)")
            reader, writer = await asyncio.wait_for(
                self.exit_stack.enter_async_context(
                    stdio_client(StdioServerParameters(command=cmd, args=args, env=env))
                ),
                timeout=step_timeout
            )
            step1_time = time.time()
            print(f"✅ 步骤 1 完成，耗时: {step1_time - start_time:.2f}秒")
            
            print(f"🔧 开始连接步骤 2: ClientSession 创建... (超时: {step_timeout}秒)")
            self.session = await asyncio.wait_for(
                self.exit_stack.enter_async_context(
                    ClientSession(reader, writer)
                ),
                timeout=step_timeout
            )
            step2_time = time.time()
            print(f"✅ 步骤 2 完成，耗时: {step2_time - step1_time:.2f}秒")
            
            print(f"🔧 开始连接步骤 3: 会话初始化... (超时: {step_timeout}秒)")
            await asyncio.wait_for(self.session.initialize(), timeout=step_timeout)
            step3_time = time.time()
            print(f"✅ 步骤 3 完成，耗时: {step3_time - step2_time:.2f}秒")
            
            print(f"🔧 开始连接步骤 4: 获取工具列表... (超时: {step_timeout}秒)")
            resp = await asyncio.wait_for(self.session.list_tools(), timeout=step_timeout)
            step4_time = time.time()
            print(f"✅ 步骤 4 完成，耗时: {step4_time - step3_time:.2f}秒")
            print(f"🎉 总连接时间: {step4_time - start_time:.2f}秒")
        except asyncio.TimeoutError:
            timeout_msg = f"连接到 MCP 服务器 {name} 超时 ({total_timeout_desc})"
            if existing_process:
                timeout_msg += f" (尝试复用进程 PID: {existing_process} 失败)"
            print(timeout_msg)
            raise RuntimeError(timeout_msg)
        except Exception as e:
            error_msg = f"连接到 MCP 服务器 {name} 失败: {e}"
            if existing_process:
                error_msg += f" (尝试复用进程 PID: {existing_process})"
            print(error_msg)
            raise RuntimeError(error_msg)
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
                result = await asyncio.wait_for(self.session.call_tool(name, args), timeout=120.0)
            except asyncio.TimeoutError:
                print(f"工具 {name} 执行超时 (120秒)")
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
        """安全关闭MCP客户端连接"""
        try:
            await self.exit_stack.aclose()
        except RuntimeError as e:
            if "Attempted to exit cancel scope in a different task" in str(e):
                # 忽略跨任务cancel scope错误，这是正常的清理过程
                print(f"警告: 跨任务关闭连接 (这是正常的): {e}")
            else:
                # 其他RuntimeError需要重新抛出
                raise
        except Exception as e:
            print(f"关闭MCP客户端时出现错误: {e}")
            # 继续执行，不阻止清理过程

async def main():
    client=MCPClient()
    try: await client.run()
    finally: await client.close()

if __name__=='__main__': asyncio.run(main())
