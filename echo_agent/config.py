"""运行配置。全部来自环境变量，见 .env.example。"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

DEFAULT_INSTRUCTIONS = """你是 Echo，一个只用语音交流的助手。
- 回答要短，像打电话一样说话，一般不超过两三句；不要念 Markdown、链接或长列表。
- 需要实时信息或要做事时调用工具；不要编造工具结果。工具失败就如实说，并给一个下一步。
- 如果工具返回 status=needs_user_confirmation：把 summary 原样念给用户，问他确认还是取消，
  然后停下等他回答。用户明确同意后才调用 confirm_action；拒绝就调用 cancel_action。
  绝不能在用户开口回答之前调用 confirm_action。用户同意后先调用 confirm_action，
  拿到执行结果之后才能说“记好了”“办好了”；没调用就不能说已经办了。
- 用户中途打断你时，直接处理他的新话，不要回到旧话题。"""


@dataclass
class Settings:
    # 实时语音模型
    provider_url: str = ""
    provider_api_key: str = ""
    dialect: str = "qwen"  # qwen | openai
    model: str = ""
    voice: str = ""
    instructions: str = DEFAULT_INSTRUCTIONS
    # 服务
    access_token: str = ""  # 为空时只接受本机连接
    tools_file: Path = ROOT / "tools.yaml"
    data_dir: Path = ROOT / "data"
    confirm_ttl_s: float = 120.0
    tool_timeout_s: float = 15.0
    tool_output_max_chars: int = 4000

    @classmethod
    def from_env(cls) -> Settings:
        e = os.environ
        dialect = e.get("ECHO_DIALECT", "qwen")
        s = cls(
            provider_url=e.get("ECHO_PROVIDER_URL", ""),
            provider_api_key=e.get("ECHO_PROVIDER_API_KEY", ""),
            dialect=dialect,
            model=e.get("ECHO_MODEL", ""),
            voice=e.get("ECHO_VOICE", ""),
            access_token=e.get("ECHO_ACCESS_TOKEN", ""),
        )
        if e.get("ECHO_INSTRUCTIONS_FILE"):
            s.instructions = Path(e["ECHO_INSTRUCTIONS_FILE"]).read_text(encoding="utf-8")
        if e.get("ECHO_TOOLS_FILE"):
            s.tools_file = Path(e["ECHO_TOOLS_FILE"])
        if e.get("ECHO_DATA_DIR"):
            s.data_dir = Path(e["ECHO_DATA_DIR"])
        return s
