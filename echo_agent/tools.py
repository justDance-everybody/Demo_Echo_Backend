"""工具注册表：tools.yaml 是唯一的工具白名单。

发现机制只有一条：tools.yaml 里列出的工具，会话开始时全部交给模型。
- builtin：本仓库内置的工具，按名字启用。
- mcp_servers：远程 MCP 服务（Streamable HTTP），只接我们审过的 URL，
  并用 allow 列表逐个放行工具。我们不托管任何第三方进程。
写操作在 confirm 里标出，执行前由服务端强制走确认（见 confirm.py）。
"""

from __future__ import annotations

import json
import logging
import os
import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from echo_agent import builtin

logger = logging.getLogger("echo.tools")

ToolFn = Callable[[dict], Awaitable[Any]]

# 超过这个数，模型选工具的准确率和首字延迟都会明显变差，需要先做检索再选择。
MAX_TOOLS_PER_SESSION = 40


@dataclass
class Tool:
    name: str
    description: str
    parameters: dict
    call: ToolFn
    confirm: bool = False
    summary: str = ""  # 确认时念给用户的话，可用 {参数名} 占位
    source: str = "builtin"

    def confirm_summary(self, args: dict) -> str:
        if self.summary:
            try:
                return self.summary.format(**args)
            except (KeyError, IndexError, ValueError):
                pass
        return f"将执行「{self.description or self.name}」，参数：{json.dumps(args, ensure_ascii=False)}"


def _obj(props: dict, required: list[str]) -> dict:
    return {"type": "object", "properties": props, "required": required}


def builtin_specs(memo: builtin.MemoStore) -> dict[str, tuple[str, dict, ToolFn]]:
    s = {"type": "string"}
    i = {"type": "integer"}
    return {
        "get_time": (
            "查询当前日期、时间和星期。",
            _obj({"timezone": {**s, "description": "IANA 时区，默认 Asia/Shanghai"}}, []),
            lambda a: builtin.get_time(**a),
        ),
        "calculate": (
            "计算一个算术表达式，例如 '(12.5+3)*4'。",
            _obj({"expression": s}, ["expression"]),
            lambda a: builtin.calculate(**a),
        ),
        "get_weather": (
            "查询某个城市当前天气和未来几天预报。",
            _obj({"city": {**s, "description": "城市名，如 武汉"}, "days": {**i, "description": "1-7，默认 1"}}, ["city"]),
            lambda a: builtin.get_weather(**a),
        ),
        "save_memo": (
            "给用户记一条备忘。",
            _obj({"text": s}, ["text"]),
            lambda a: memo.save_memo(**a),
        ),
        "list_memos": (
            "读出用户最近的备忘。",
            _obj({"limit": i}, []),
            lambda a: memo.list_memos(**a),
        ),
    }


_ENV = re.compile(r"\$\{([A-Z0-9_]+)\}")


def _expand_env(value: str) -> str:
    def sub(m: re.Match) -> str:
        if m.group(1) not in os.environ:
            raise KeyError(f"环境变量 {m.group(1)} 未设置")
        return os.environ[m.group(1)]

    return _ENV.sub(sub, value)


class Registry:
    def __init__(self, tools: list[Tool]):
        if len(tools) > MAX_TOOLS_PER_SESSION:
            raise ValueError(
                f"启用了 {len(tools)} 个工具，超过 {MAX_TOOLS_PER_SESSION}。先在 tools.yaml 里收窄 allow 列表。"
            )
        self.tools = {t.name: t for t in tools}

    def get(self, name: str) -> Tool | None:
        return self.tools.get(name)

    def public_list(self) -> list[dict]:
        return [
            {"name": t.name, "description": t.description, "confirm": t.confirm, "source": t.source}
            for t in self.tools.values()
        ]


async def load_registry(path, data_dir) -> Registry:
    cfg = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    memo = builtin.MemoStore(data_dir / "memos.jsonl")
    specs = builtin_specs(memo)
    tools: list[Tool] = []
    for name, opts in (cfg.get("builtin") or {}).items():
        opts = opts or {}
        if name not in specs:
            raise ValueError(f"tools.yaml: 未知内置工具 {name}")
        desc, params, fn = specs[name]
        tools.append(
            Tool(name, desc, params, fn, confirm=bool(opts.get("confirm")), summary=opts.get("summary", ""))
        )
    for server in cfg.get("mcp_servers") or []:
        from echo_agent.mcp_remote import load_mcp_tools

        try:
            tools.extend(await load_mcp_tools(server, _expand_env))
        except Exception as e:  # 一个远程服务挂了不影响其他工具
            logger.error(f"MCP 服务 {server.get('name')} 加载失败：{e}")
    names = [t.name for t in tools]
    dup = {n for n in names if names.count(n) > 1}
    if dup:
        raise ValueError(f"工具重名：{sorted(dup)}，请在 tools.yaml 里给 MCP 服务配 prefix")
    return Registry(tools)
