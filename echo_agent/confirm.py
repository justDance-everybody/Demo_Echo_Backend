"""工具执行与服务端确认闸。

规则：
- 只读工具（confirm=false）直接执行，不打扰用户。
- 写操作（confirm=true）第一次被调用时不执行，只登记一条待确认动作，
  把要念给用户的 summary 返回给模型。
- 模型之后调用 confirm_action(action_id) 才真正执行，且执行的是登记时的参数，
  模型和前端都没法在确认后换参数。
- confirm_action 只在「登记之后用户又说过话」时有效，防止模型自问自答替用户确认。
"""

from __future__ import annotations

import asyncio
import json
import secrets
import time
from dataclasses import dataclass
from typing import Any

from echo_agent.tools import Registry

CONFIRM_TOOLS = [
    {
        "name": "confirm_action",
        "description": "Execute a pending action. Call only after the user has explicitly said yes.",
        "parameters": {
            "type": "object",
            "properties": {"action_id": {"type": "string"}},
            "required": ["action_id"],
        },
    },
    {
        "name": "cancel_action",
        "description": "Cancel a pending action when the user says no or changes their mind.",
        "parameters": {
            "type": "object",
            "properties": {"action_id": {"type": "string"}},
            "required": ["action_id"],
        },
    },
]


@dataclass
class Pending:
    tool: str
    args: dict
    summary: str
    created_at: float
    user_turn: int


class Executor:
    def __init__(self, registry: Registry, ttl_s: float = 120, timeout_s: float = 15, max_chars: int = 4000):
        self.registry = registry
        self.ttl_s = ttl_s
        self.timeout_s = timeout_s
        self.max_chars = max_chars
        self.pending: dict[str, Pending] = {}
        self.user_turns = 0

    def note_user_turn(self) -> None:
        self.user_turns += 1

    def tool_specs(self) -> list[dict]:
        specs = [
            {"name": t.name, "description": t.description, "parameters": t.parameters}
            for t in self.registry.tools.values()
        ]
        if any(t.confirm for t in self.registry.tools.values()):
            specs += CONFIRM_TOOLS
        return specs

    async def handle(self, name: str, raw_args: str | dict) -> dict[str, Any]:
        """返回 {"output": 给模型的结果, "event": 给前端/日志的描述}。"""
        try:
            args = json.loads(raw_args) if isinstance(raw_args, str) else dict(raw_args or {})
            if not isinstance(args, dict):
                raise ValueError
        except (json.JSONDecodeError, ValueError):
            return self._out({"error": "参数不是合法 JSON 对象"}, name, "bad_args")

        if name == "confirm_action":
            return await self._confirm(args.get("action_id", ""))
        if name == "cancel_action":
            p = self.pending.pop(args.get("action_id", ""), None)
            return self._out({"status": "cancelled" if p else "not_found"}, name, "cancelled", tool=p and p.tool)

        tool = self.registry.get(name)
        if tool is None:
            return self._out({"error": f"没有工具 {name}"}, name, "unknown_tool")
        if tool.confirm:
            self._expire()
            action_id = secrets.token_hex(4)
            summary = tool.confirm_summary(args)
            self.pending[action_id] = Pending(name, args, summary, time.monotonic(), self.user_turns)
            return self._out(
                {"status": "needs_user_confirmation", "action_id": action_id, "summary": summary},
                name,
                "needs_confirmation",
                summary=summary,
            )
        return await self._run(name, args)

    async def _confirm(self, action_id: str) -> dict:
        self._expire()
        p = self.pending.get(action_id)
        if p is None:
            return self._out({"error": "没有这个待确认动作，可能已过期，请重新发起"}, "confirm_action", "rejected")
        if self.user_turns <= p.user_turn:
            return self._out(
                {"error": "用户还没有回答。先把 summary 念给用户并等待他的回答。"},
                "confirm_action",
                "rejected",
                tool=p.tool,
            )
        del self.pending[action_id]
        return await self._run(p.tool, p.args, confirmed=True)

    async def _run(self, name: str, args: dict, confirmed: bool = False) -> dict:
        tool = self.registry.get(name)
        t0 = time.monotonic()
        try:
            result = await asyncio.wait_for(tool.call(args), self.timeout_s)
            status = "ok"
        except TimeoutError:
            result, status = {"error": f"{name} 超时"}, "timeout"
        except Exception as e:  # 工具出错要让模型能如实告诉用户
            result, status = {"error": f"{type(e).__name__}: {e}"}, "error"
        if isinstance(result, dict) and "error" in result and status == "ok":
            status = "error"
        return self._out(
            result, name, status, ms=round((time.monotonic() - t0) * 1000), confirmed=confirmed, args=args
        )

    def _expire(self) -> None:
        now = time.monotonic()
        for k in [k for k, p in self.pending.items() if now - p.created_at > self.ttl_s]:
            del self.pending[k]

    def _out(self, result: Any, name: str, status: str, **extra) -> dict:
        text = json.dumps(result, ensure_ascii=False, default=str)
        if len(text) > self.max_chars:
            text = text[: self.max_chars] + "…(已截断)"
        return {"output": text, "event": {"tool": name, "status": status, **extra}}
