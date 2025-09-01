#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
from typing import Any, Dict, Optional

import httpx
from loguru import logger


class MCPRouterClient:
    """轻量级的 MCPRouter HTTP 客户端。

    不依赖全局 settings，直接读取环境变量，避免修改现有配置代码。
    环境变量（可选）：
      - MCPROUTER_API_URL (默认 http://127.0.0.1:8027)
      - MCPROUTER_TIMEOUT (秒，默认 30)
    """

    def __init__(self) -> None:
        self.api_base_url: str = os.getenv("MCPROUTER_API_URL", "http://127.0.0.1:8027").rstrip("/")
        timeout_s: float = float(os.getenv("MCPROUTER_TIMEOUT", "30"))
        self._client = httpx.AsyncClient(
            base_url=self.api_base_url,
            timeout=timeout_s,
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
            http2=True,
        )
        logger.info(f"MCPRouterClient 初始化: base={self.api_base_url}, timeout={timeout_s}")

    async def close(self) -> None:
        try:
            await self._client.aclose()
        except Exception:
            pass

    async def list_tools(self, server: str) -> Dict[str, Any]:
        resp = await self._client.post(
            "/v1/list-tools",
            json={"server": server},
            headers={"Authorization": f"Bearer {server}"},
        )
        resp.raise_for_status()
        return resp.json()

    async def call_tool(self, server: str, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        resp = await self._client.post(
            "/v1/call-tool",
            json={"server": server, "name": name, "arguments": arguments},
            headers={"Authorization": f"Bearer {server}"},
        )
        resp.raise_for_status()
        return resp.json()


# 全局可复用实例
mcprouter_client = MCPRouterClient()


