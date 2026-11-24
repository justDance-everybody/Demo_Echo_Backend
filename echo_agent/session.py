"""一次语音会话：浏览器 WebSocket ⇄ 实时语音模型，中间只做三件事——
转发音频、执行工具（含确认闸）、记日志和延迟。

浏览器 → 服务端：二进制帧 = PCM16 单声道音频（采样率见 ready 消息）；
                 文本帧 {"type":"text","text":...} 或 {"type":"interrupt"}。
服务端 → 浏览器：二进制帧 = PCM16 模型语音；
                 文本帧 ready / transcript / speech_started / tool / latency / error。
"""

from __future__ import annotations

import asyncio
import json
import secrets
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any, Protocol

from echo_agent.confirm import Executor


class Provider(Protocol):
    d: Any

    async def connect(self, instructions: str, tools: list[dict]) -> None: ...
    async def append_audio(self, pcm16: bytes) -> None: ...
    async def send_text(self, text: str) -> None: ...
    async def send_tool_outputs(self, outputs: list[tuple[str, str]]) -> None: ...
    async def cancel(self) -> None: ...
    async def close(self) -> None: ...
    def events(self): ...


class Client(Protocol):
    async def send_text(self, data: str) -> None: ...
    async def send_bytes(self, data: bytes) -> None: ...
    async def receive(self) -> dict: ...


class SessionLog:
    def __init__(self, data_dir: Path, session_id: str):
        d = data_dir / "sessions"
        d.mkdir(parents=True, exist_ok=True)
        self.path = d / f"{time.strftime('%Y%m%d-%H%M%S')}-{session_id}.jsonl"

    def write(self, kind: str, **fields) -> None:
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps({"t": round(time.time(), 3), "kind": kind, **fields}, ensure_ascii=False) + "\n")


class VoiceSession:
    def __init__(self, client: Client, provider: Provider, executor: Executor, instructions: str, data_dir: Path):
        self.client = client
        self.rt = provider
        self.ex = executor
        self.instructions = instructions
        self.id = secrets.token_hex(6)
        self.log = SessionLog(data_dir, self.id)
        self.user_end: float | None = None  # 用户说完（或发出文字）的时刻
        self.calls: list[tuple[str, asyncio.Task]] = []
        # 用户开口打断后，被打断那轮回答的音频可能还在路上；在模型开始新一轮回答之前一律丢掉
        self.barged_in = False

    async def _send(self, **msg) -> None:
        await self.client.send_text(json.dumps(msg, ensure_ascii=False))

    async def run(self) -> None:
        await self.rt.connect(self.instructions, self.ex.tool_specs())
        self.log.write("start", tools=[t["name"] for t in self.ex.tool_specs()])
        await self._send(
            type="ready",
            session_id=self.id,
            input_rate=self.rt.d.input_rate,
            output_rate=self.rt.d.output_rate,
        )
        up = asyncio.create_task(self._upstream())
        down = asyncio.create_task(self._downstream())
        try:
            done, pending = await asyncio.wait({up, down}, return_when=asyncio.FIRST_COMPLETED)
            for t in pending:
                t.cancel()
            for t in done:
                if t.exception() and not isinstance(t.exception(), (ClientGone, asyncio.CancelledError)):
                    self.log.write("error", message=repr(t.exception()))
                    try:
                        await self._send(type="error", message=str(t.exception()))
                    except Exception:
                        pass
        finally:
            for _, task in self.calls:
                task.cancel()
            await self.rt.close()
            self.log.write("end")

    async def _upstream(self) -> None:
        while True:
            msg = await self.client.receive()
            if msg.get("type") == "websocket.disconnect":
                raise ClientGone()
            if msg.get("bytes"):
                await self.rt.append_audio(msg["bytes"])
            elif msg.get("text"):
                data = json.loads(msg["text"])
                if data.get("type") == "text" and data.get("text", "").strip():
                    self.ex.note_user_turn()
                    self.user_end = time.monotonic()
                    self.log.write("user", text=data["text"], via="text")
                    await self.rt.send_text(data["text"])
                elif data.get("type") == "interrupt":
                    await self.rt.cancel()

    async def _downstream(self) -> None:
        async for ev in self.rt.events():
            t = ev["type"]
            if t == "audio":
                if self.barged_in:
                    continue
                if self.user_end is not None:
                    ms = round((time.monotonic() - self.user_end) * 1000)
                    self.user_end = None
                    self.log.write("latency", first_audio_ms=ms)
                    await self._send(type="latency", first_audio_ms=ms)
                await self.client.send_bytes(ev["data"])
            elif t == "transcript":
                if ev["final"]:
                    self.log.write("transcript", role=ev["role"], text=ev["text"])
                await self._send(**ev)
            elif t == "speech_started":
                self.barged_in = True
                await self._send(type="speech_started")
            elif t == "response_created":
                self.barged_in = False
            elif t == "speech_stopped":
                self.user_end = time.monotonic()
            elif t == "user_turn":
                self.ex.note_user_turn()
            elif t == "tool_call":
                task = asyncio.create_task(self.ex.handle(ev["name"], ev["arguments"]))
                self.calls.append((ev["call_id"], task))
                await self._send(type="tool", tool=ev["name"], status="running")
            elif t == "response_done" and self.calls:
                outputs = []
                for call_id, task in self.calls:
                    r = await task
                    outputs.append((call_id, r["output"]))
                    self.log.write("tool", **r["event"])
                    await self._send(type="tool", **r["event"])
                self.calls = []
                await self.rt.send_tool_outputs(outputs)
            elif t == "error":
                self.log.write("provider_error", message=ev["message"])
                await self._send(type="error", message=ev["message"])


class ClientGone(Exception):
    pass


ProviderFactory = Callable[[], Provider]
