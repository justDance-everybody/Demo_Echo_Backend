#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MCP stdio 客户端实现
用于通过标准输入输出与MCP服务器通信
"""

import sys
import os
import asyncio
import json
from typing import Optional, Tuple, Dict, Any, AsyncGenerator
from contextlib import asynccontextmanager
from dataclasses import dataclass
import subprocess


@dataclass
class StdioServerParameters:
    """启动子进程的参数配置"""
    command: str  # 命令，如 "python" 或 "node"
    args: list[str]  # 参数列表，如 ["server.py"]
    env: Optional[Dict[str, str]] = None  # 环境变量


@asynccontextmanager
async def stdio_client(params: StdioServerParameters) -> AsyncGenerator[Tuple, None]:
    """
    创建一个子进程并通过标准输入/输出与之通信
    
    Args:
        params: 启动子进程的参数
        
    Yields:
        (reader, writer) 元组，用于读写子进程的标准输出和输入
    """
    # 创建环境变量副本
    env = os.environ.copy()
    if params.env:
        env.update(params.env)
    
    # 启动子进程
    process = await asyncio.create_subprocess_exec(
        params.command,
        *params.args,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env
    )
    
    if process.stdin is None or process.stdout is None:
        raise RuntimeError("无法创建子进程的标准输入/输出管道")
    
    # 监听stderr并打印日志
    async def log_stderr():
        if process.stderr:
            while True:
                line = await process.stderr.readline()
                if not line:
                    break
                print(f"MCP服务输出: {line.decode('utf-8').strip()}", 
                      file=sys.stderr)
    
    # 启动stderr日志线程
    asyncio.create_task(log_stderr())
    
    try:
        # 创建reader和writer包装器
        reader = StdioReader(process.stdout)
        writer = StdioWriter(process.stdin)
        
        yield (reader, writer)
    finally:
        # 关闭进程
        if process.returncode is None:
            try:
                process.terminate()
                await asyncio.wait_for(process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                print("无法正常终止进程，强制终止")
                process.kill()
                await process.wait()


class StdioReader:
    """标准输出读取器，用于从子进程的stdout读取数据"""
    
    def __init__(self, stream: asyncio.StreamReader):
        self.stream = stream
    
    async def read_line(self) -> Optional[str]:
        """读取一行数据"""
        line = await self.stream.readline()
        if not line:
            return None
        return line.decode('utf-8').rstrip()
    
    async def read_json(self) -> Optional[Dict[str, Any]]:
        """读取一行JSON并解析"""
        line = await self.read_line()
        if line is None:
            return None
        try:
            return json.loads(line)
        except json.JSONDecodeError as e:
            print(f"JSON解析错误: {e}")
            return None


class StdioWriter:
    """标准输入写入器，用于向子进程的stdin写入数据"""
    
    def __init__(self, stream: asyncio.StreamWriter):
        self.stream = stream
    
    async def write_line(self, line: str) -> None:
        """写入一行数据"""
        self.stream.write(f"{line}\n".encode('utf-8'))
        await self.stream.drain()
    
    async def write_json(self, data: Dict[str, Any]) -> None:
        """将数据编码为JSON并写入"""
        json_str = json.dumps(data, ensure_ascii=False)
        await self.write_line(json_str) 