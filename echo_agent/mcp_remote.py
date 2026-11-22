"""远程 MCP 工具（Streamable HTTP），用官方 mcp SDK。

只连 tools.yaml 里写明的 URL，只放行 allow 列表里的工具。每次调用新开一个连接：
无状态、不用管进程和重连，代价是每次多一次握手（同区域通常 <100ms）。
"""

from __future__ import annotations

import json
from collections.abc import Callable

import httpx
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

from echo_agent.tools import Tool


def _content_to_json(result) -> object:
    if getattr(result, "structuredContent", None):
        return result.structuredContent
    texts = [c.text for c in result.content if getattr(c, "type", "") == "text"]
    joined = "\n".join(texts)
    try:
        return json.loads(joined)
    except (json.JSONDecodeError, TypeError):
        return joined


async def load_mcp_tools(server: dict, expand_env: Callable[[str], str]) -> list[Tool]:
    name = server["name"]
    url = expand_env(server["url"])
    headers = {k: expand_env(v) for k, v in (server.get("headers") or {}).items()}
    allow = set(server.get("allow") or [])
    confirm = set(server.get("confirm") or [])
    summaries = server.get("summaries") or {}
    prefix = server.get("prefix", "")
    if not allow:
        raise ValueError(f"MCP 服务 {name} 没有 allow 列表；必须逐个放行工具")

    async with httpx.AsyncClient(headers=headers, timeout=15) as http, \
            streamable_http_client(url, http_client=http) as (read, write, _), \
            ClientSession(read, write) as session:
        await session.initialize()
        listed = (await session.list_tools()).tools

    missing = allow - {t.name for t in listed}
    if missing:
        raise ValueError(f"MCP 服务 {name} 没有这些工具：{sorted(missing)}")

    def make_call(remote_name: str):
        async def call(args: dict):
            async with httpx.AsyncClient(headers=headers, timeout=15) as http, \
                    streamable_http_client(url, http_client=http) as (read, write, _), \
                    ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(remote_name, args)
            if result.isError:
                return {"error": _content_to_json(result)}
            return _content_to_json(result)

        return call

    return [
        Tool(
            name=prefix + t.name,
            description=t.description or t.name,
            parameters=t.inputSchema or {"type": "object", "properties": {}},
            call=make_call(t.name),
            confirm=t.name in confirm,
            summary=summaries.get(t.name, ""),
            source=f"mcp:{name}",
        )
        for t in listed
        if t.name in allow
    ]
