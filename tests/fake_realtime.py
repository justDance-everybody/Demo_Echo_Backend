"""按 Qwen/OpenAI Realtime 协议说话的假模型服务，用来在没有真模型时测通整条链路。

行为是写死的规则，不代表真模型的理解能力；真模型的效果用 eval/ 测。
"""

from __future__ import annotations

import asyncio
import base64
import json
import re
import threading

import websockets


def _rule(text: str, tool_names: set[str]):
    if "几点" in text or "时间" in text:
        return "get_time", {}
    m = re.search(r"算(.+)", text)
    if m:
        return "calculate", {"expression": m.group(1).strip()}
    m = re.search(r"记(?:一下)?[:：]?(.+?)(?:，?并且直接确认)?$", text)
    if m and "save_memo" in tool_names:
        return "save_memo", {"text": m.group(1).strip()}
    if text.strip() in ("确认", "好的", "是的"):
        return "confirm_action", None  # action_id 用最近一次 needs_user_confirmation 的
    if text.strip() in ("取消", "不要了"):
        return "cancel_action", None
    return None, None


class FakeRealtime:
    def __init__(self):
        self.sessions: list[dict] = []
        self.received: list[dict] = []
        self.port = 0
        self._loop = None
        self._ready = threading.Event()

    # ---- 生命周期 ----
    def start(self) -> FakeRealtime:
        threading.Thread(target=self._thread, daemon=True).start()
        self._ready.wait(5)
        return self

    def _thread(self):
        self._loop = asyncio.new_event_loop()
        self._loop.run_until_complete(self._serve())

    async def _serve(self):
        async with websockets.serve(self._handle, "127.0.0.1", 0) as server:
            self.port = server.sockets[0].getsockname()[1]
            self._ready.set()
            await asyncio.Future()

    @property
    def url(self) -> str:
        return f"ws://127.0.0.1:{self.port}/api-ws/v1/realtime"

    # ---- 协议 ----
    async def _handle(self, ws):
        state = {"tools": set(), "text": None, "outputs": [], "last_action": None, "audio": 0,
                 "auth": ws.request.headers.get("Authorization"), "path": ws.request.path, "self_confirm": False}
        self.sessions.append(state)
        n = 0

        async def send(**ev):
            await ws.send(json.dumps(ev, ensure_ascii=False))

        async def respond():
            nonlocal n
            n += 1
            rid = f"resp_{n}"
            await send(type="response.created", response={"id": rid})
            if state["outputs"]:
                outs, state["outputs"] = state["outputs"], []
                for o in outs:
                    data = json.loads(o["output"])
                    if data.get("status") == "needs_user_confirmation":
                        state["last_action"] = data["action_id"]
                        if state["self_confirm"]:  # 模拟一个“自问自答”的坏模型
                            state["self_confirm"] = False
                            await call(rid, "confirm_action", {"action_id": data["action_id"]})
                            return
                speech = "结果：" + " ".join(o["output"] for o in outs)
                await speak(rid, speech)
                return
            name, args = _rule(state["text"] or "", state["tools"])
            if name is None:
                await speak(rid, "你好，我是 Echo。")
                return
            if args is None:
                args = {"action_id": state["last_action"] or "missing"}
            await call(rid, name, args)

        async def call(rid, name, args):
            await send(type="response.function_call_arguments.done", response_id=rid, item_id="item_x",
                       output_index=0, call_id=f"call_{n}", name=name, arguments=json.dumps(args, ensure_ascii=False))
            await send(type="response.done", response={"id": rid, "status": "completed"})

        async def speak(rid, speech):
            await send(type="response.audio_transcript.delta", delta=speech[:4])
            await send(type="response.audio.delta", delta=base64.b64encode(b"\x01\x00" * 240).decode())
            await send(type="response.audio_transcript.done", transcript=speech)
            await send(type="response.done", response={"id": rid, "status": "completed"})

        await send(type="session.created", session={})
        async for raw in ws:
            ev = json.loads(raw)
            self.received.append(ev)
            t = ev["type"]
            if t == "session.update":
                tools = ev["session"].get("tools", [])
                state["tools"] = {(x.get("function") or x)["name"] for x in tools}
                await send(type="session.updated", session=ev["session"])
            elif t == "conversation.item.create":
                item = ev["item"]
                if item["type"] == "message":
                    state["text"] = item["content"][0]["text"]
                    state["self_confirm"] = "直接确认" in state["text"]
                elif item["type"] == "function_call_output":
                    state["outputs"].append(item)
            elif t == "response.create":
                await respond()
            elif t == "input_audio_buffer.append":
                state["audio"] += len(base64.b64decode(ev["audio"]))
                if state["audio"] >= 6400:  # 0.2s@16k：当作说完了一句“现在几点”
                    state["audio"] = -10**9
                    await send(type="input_audio_buffer.speech_started")
                    await send(type="input_audio_buffer.speech_stopped")
                    await send(type="input_audio_buffer.committed")
                    await send(type="conversation.item.input_audio_transcription.completed", transcript="现在几点")
                    state["text"] = "现在几点"
                    await respond()
