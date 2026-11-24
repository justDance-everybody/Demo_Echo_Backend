"""实时语音模型适配层（OpenAI Realtime 风格的 WebSocket 协议）。

Qwen-Omni-Realtime（阿里云百炼）和 OpenAI Realtime 用的是同一套事件模型，
差别只在 session.update 的字段和少数事件名，这里用 dialect 区分。
上层只看到归一化后的事件：
  audio(bytes) / transcript(role, text, final) / speech_started / speech_stopped /
  user_turn / tool_call(call_id, name, arguments) / response_created / response_done / error(message)
"""

from __future__ import annotations

import base64
import json
from collections.abc import AsyncIterator
from dataclasses import dataclass

import websockets


@dataclass
class Dialect:
    name: str
    input_rate: int
    output_rate: int
    default_model: str
    default_voice: str

    def session_update(self, instructions: str, tools: list[dict], voice: str) -> dict:
        if self.name == "openai":
            return {
                "type": "session.update",
                "session": {
                    "type": "realtime",
                    "instructions": instructions,
                    "output_modalities": ["audio"],
                    "audio": {
                        "input": {
                            "format": {"type": "audio/pcm", "rate": self.input_rate},
                            "transcription": {"model": "gpt-4o-mini-transcribe"},
                            "turn_detection": {"type": "semantic_vad"},
                        },
                        "output": {"format": {"type": "audio/pcm", "rate": self.output_rate}, "voice": voice},
                    },
                    "tools": [{"type": "function", **t} for t in tools],
                },
            }
        # qwen：工具用嵌套的 OpenAI function 格式（官方 Function Calling 文档）
        return {
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "voice": voice,
                "instructions": instructions,
                "audio": {
                    "input": {"format": {"type": "pcm", "sample_rate": self.input_rate}},
                    "output": {"format": {"type": "pcm", "sample_rate": self.output_rate}, "voice": voice},
                },
                "input_audio_transcription": {"model": "qwen3-asr-flash-realtime"},
                # semantic_vad 会把“好的”“可以”这类短回应当成附和过滤掉，确认闸收不到用户的“同意”；
                # 官方建议 3.8 系列用 semantic_vad_ec（实测：短确认能触发）
                "turn_detection": {"type": "semantic_vad_ec"},
                "tools": [{"type": "function", "function": t} for t in tools],
            },
        }


DIALECTS = {
    "qwen": Dialect("qwen", 16000, 24000, "qwen3.8-omni-flash-realtime", "Tina"),
    "openai": Dialect("openai", 24000, 24000, "gpt-realtime", "marin"),
}

AUDIO_DELTA = {"response.audio.delta", "response.output_audio.delta"}
TRANSCRIPT_DELTA = {"response.audio_transcript.delta", "response.output_audio_transcript.delta", "response.text.delta"}
TRANSCRIPT_DONE = {"response.audio_transcript.done", "response.output_audio_transcript.done"}


class RealtimeClient:
    def __init__(self, url: str, api_key: str, dialect: str, model: str = "", voice: str = ""):
        if dialect not in DIALECTS:
            raise ValueError(f"未知 dialect {dialect}，可选 {list(DIALECTS)}")
        self.d = DIALECTS[dialect]
        self.model = model or self.d.default_model
        self.voice = voice or self.d.default_voice
        sep = "&" if "?" in url else "?"
        self.url = url if "model=" in url else f"{url}{sep}model={self.model}"
        self.api_key = api_key
        self.ws = None

    async def connect(self, instructions: str, tools: list[dict]) -> None:
        self.ws = await websockets.connect(
            self.url,
            additional_headers={"Authorization": f"Bearer {self.api_key}"},
            max_size=16 * 1024 * 1024,
        )
        await self._send(self.d.session_update(instructions, tools, self.voice))

    async def close(self) -> None:
        if self.ws is not None:
            await self.ws.close()

    async def _send(self, event: dict) -> None:
        await self.ws.send(json.dumps(event, ensure_ascii=False))

    async def append_audio(self, pcm16: bytes) -> None:
        await self._send({"type": "input_audio_buffer.append", "audio": base64.b64encode(pcm16).decode()})

    async def send_text(self, text: str) -> None:
        await self._send(
            {
                "type": "conversation.item.create",
                "item": {"type": "message", "role": "user", "content": [{"type": "input_text", "text": text}]},
            }
        )
        await self._send({"type": "response.create"})

    async def send_tool_outputs(self, outputs: list[tuple[str, str]]) -> None:
        for call_id, output in outputs:
            await self._send(
                {
                    "type": "conversation.item.create",
                    "item": {"type": "function_call_output", "call_id": call_id, "output": output},
                }
            )
        await self._send({"type": "response.create"})

    async def cancel(self) -> None:
        await self._send({"type": "response.cancel"})

    async def events(self) -> AsyncIterator[dict]:
        async for raw in self.ws:
            ev = json.loads(raw)
            t = ev.get("type", "")
            if t in AUDIO_DELTA:
                yield {"type": "audio", "data": base64.b64decode(ev["delta"])}
            elif t in TRANSCRIPT_DELTA:
                yield {"type": "transcript", "role": "assistant", "text": ev.get("delta", ""), "final": False}
            elif t in TRANSCRIPT_DONE:
                yield {"type": "transcript", "role": "assistant", "text": ev.get("transcript", ""), "final": True}
            elif t == "conversation.item.input_audio_transcription.completed":
                yield {"type": "transcript", "role": "user", "text": ev.get("transcript", ""), "final": True}
            elif t == "input_audio_buffer.speech_started":
                yield {"type": "speech_started"}
            elif t == "input_audio_buffer.speech_stopped":
                yield {"type": "speech_stopped"}
            elif t == "input_audio_buffer.committed":
                yield {"type": "user_turn"}
            elif t == "response.function_call_arguments.done":
                yield {
                    "type": "tool_call",
                    "call_id": ev["call_id"],
                    "name": ev["name"],
                    "arguments": ev.get("arguments", "{}"),
                }
            elif t == "response.created":
                yield {"type": "response_created"}
            elif t == "response.done":
                yield {"type": "response_done", "status": (ev.get("response") or {}).get("status", "")}
            elif t == "error":
                err = ev.get("error") or {}
                yield {"type": "error", "message": err.get("message") or json.dumps(ev, ensure_ascii=False)}
            elif t in ("session.created", "session.updated"):
                yield {"type": t}
