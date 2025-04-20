#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MCP (Model Context Protocol) 客户端库
提供与MCP服务器通信的核心组件和协议实现
"""

import json
import sys
import uuid
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field


# -----------------------------------------------------------------------------
# 协议数据结构
# -----------------------------------------------------------------------------

@dataclass
class MCPTool:
    """MCP工具定义"""
    name: str  # 工具名称，如 "web_search"
    description: str  # 工具描述
    parameters: Dict[str, Any] = field(default_factory=dict)  # 参数模式


@dataclass
class MCPToolResponse:
    """工具调用响应"""
    id: str  # 响应ID
    content: Any  # 响应内容
    error: Optional[str] = None  # 错误信息（如果有）


@dataclass
class MCPListToolsResponse:
    """获取工具列表响应"""
    tools: List[MCPTool]  # 可用工具列表


# 客户端会话类
class ClientSession:
    """
    MCP 客户端会话，管理与服务器的通信
    """
    
    def __init__(self, reader, writer):
        """
        初始化客户端会话
        
        Args:
            reader: 读取器，用于读取服务器响应
            writer: 写入器，用于向服务器发送请求
        """
        self.reader = reader
        self.writer = writer
        self.initialized = False
        self.version = "1.0"  # MCP协议版本
        self.session_id = str(uuid.uuid4())  # 随机会话ID
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器退出"""
        # 确保会话结束时发送goodbye消息
        if self.initialized:
            try:
                await self._send_request({
                    "type": "goodbye",
                    "session_id": self.session_id
                })
            except:
                pass  # 忽略关闭时的错误
    
    async def initialize(self) -> bool:
        """
        初始化MCP会话，进行协议握手
        
        Returns:
            初始化是否成功
        """
        if self.initialized:
            return True
        
        # 发送hello请求
        await self._send_request({
            "type": "hello",
            "version": self.version,
            "session_id": self.session_id
        })
        
        # 等待hello响应
        response = await self._read_response()
        if not response or response.get("type") != "hello" or response.get("status") != "success":
            return False
        
        self.initialized = True
        return True
    
    async def list_tools(self) -> MCPListToolsResponse:
        """
        获取服务器支持的工具列表
        
        Returns:
            工具列表响应对象
        """
        if not self.initialized:
            raise RuntimeError("会话尚未初始化")
        
        # 发送list_tools请求
        await self._send_request({
            "type": "list_tools",
            "session_id": self.session_id
        })
        
        # 等待响应
        response = await self._read_response()
        if not response or response.get("type") != "list_tools_response":
            raise RuntimeError("无效的list_tools响应")
        
        # 解析工具列表
        tools_data = response.get("tools", [])
        tools = []
        for tool_data in tools_data:
            tool = MCPTool(
                name=tool_data.get("name", ""),
                description=tool_data.get("description", ""),
                parameters=tool_data.get("parameters", {})
            )
            tools.append(tool)
        
        return MCPListToolsResponse(tools=tools)
    
    async def call_tool(self, tool_name: str, params: Dict[str, Any]) -> MCPToolResponse:
        """
        调用服务器上的工具
        
        Args:
            tool_name: 工具名称
            params: 工具参数
            
        Returns:
            工具调用响应
        """
        if not self.initialized:
            raise RuntimeError("会话尚未初始化")
        
        # 生成请求ID
        request_id = str(uuid.uuid4())
        
        # 发送tool_call请求
        await self._send_request({
            "type": "tool_call",
            "session_id": self.session_id,
            "id": request_id,
            "name": tool_name,
            "parameters": params
        })
        
        # 等待响应
        response = await self._read_response()
        if not response or response.get("type") != "tool_response":
            raise RuntimeError("无效的工具调用响应")
        
        # 验证响应ID
        if response.get("id") != request_id:
            raise RuntimeError("响应ID不匹配")
        
        # 构造工具响应
        return MCPToolResponse(
            id=response.get("id", ""),
            content=response.get("content"),
            error=response.get("error")
        )
    
    async def _send_request(self, request: Dict[str, Any]) -> None:
        """
        发送请求到服务器
        
        Args:
            request: 请求数据
        """
        await self.writer.write_json(request)
    
    async def _read_response(self) -> Optional[Dict[str, Any]]:
        """
        从服务器读取响应
        
        Returns:
            响应数据，如果读取失败则返回None
        """
        return await self.reader.read_json()


# 从client.stdio模块导入以方便使用
from .client.stdio import stdio_client, StdioServerParameters
