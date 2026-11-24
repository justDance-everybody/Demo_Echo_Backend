"""打断：用户开口后，被打断那轮回答还在路上的音频不能再转给浏览器。"""

import asyncio
import json

from echo_agent.confirm import Executor
from echo_agent.session import ClientGone, VoiceSession
from echo_agent.tools import Registry


class StubProvider:
    class d:  # noqa: N801
        input_rate, output_rate = 16000, 24000

    def __init__(self, events):
        self._events = events

    async def connect(self, instructions, tools): ...
    async def append_audio(self, pcm16): ...
    async def send_text(self, text): ...
    async def send_tool_outputs(self, outputs): ...
    async def cancel(self): ...
    async def close(self): ...

    async def events(self):
        for ev in self._events:
            yield ev
            await asyncio.sleep(0)


class StubClient:
    def __init__(self):
        self.audio: list[bytes] = []
        self.msgs: list[dict] = []

    async def send_text(self, data):
        self.msgs.append(json.loads(data))

    async def send_bytes(self, data):
        self.audio.append(data)

    async def receive(self):
        await asyncio.sleep(0.2)
        raise ClientGone()


async def test_stale_audio_dropped_after_barge_in(tmp_path):
    events = [
        {"type": "response_created"},
        {"type": "audio", "data": b"old1"},
        {"type": "speech_started"},          # 用户插话
        {"type": "audio", "data": b"old2"},  # 被打断那轮的音频还在路上
        {"type": "speech_stopped"},
        {"type": "response_created"},        # 新一轮回答
        {"type": "audio", "data": b"new1"},
    ]
    client = StubClient()
    s = VoiceSession(client, StubProvider(events), Executor(Registry([]), 120, 5, 4000), "", tmp_path)
    await s.run()
    assert client.audio == [b"old1", b"new1"]
    assert any(m["type"] == "speech_started" for m in client.msgs)
