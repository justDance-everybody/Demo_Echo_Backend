"""整条链路：浏览器 WebSocket → Echo 服务 → (假)实时语音模型 → 工具 → 回到浏览器。"""

import json

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from echo_agent.config import ROOT, Settings
from echo_agent.server import create_app
from tests.fake_realtime import FakeRealtime


@pytest.fixture(scope="module")
def fake():
    return FakeRealtime().start()


def make_client(fake, tmp_path, **kw):
    s = Settings(provider_url=fake.url, provider_api_key="test-key", dialect="qwen",
                 tools_file=ROOT / "tools.yaml", data_dir=tmp_path, **kw)
    return TestClient(create_app(s))


def collect(ws, until):
    """读消息直到 until(msg) 为真，返回 (json消息列表, 音频字节数)。"""
    msgs, audio = [], 0
    for _ in range(50):
        m = ws.receive()
        if m.get("bytes"):
            audio += len(m["bytes"])
            continue
        msg = json.loads(m["text"])
        msgs.append(msg)
        if until(msg):
            return msgs, audio
    raise AssertionError(f"没等到预期消息：{msgs}")


def final_reply(m):
    return m["type"] == "transcript" and m["role"] == "assistant" and m["final"]


def test_text_turn_with_read_only_tool(fake, tmp_path):
    with make_client(fake, tmp_path) as c, c.websocket_connect("/ws") as ws:
        ready = json.loads(ws.receive_text())
        assert ready["type"] == "ready" and ready["input_rate"] == 16000 and ready["output_rate"] == 24000
        ws.send_text(json.dumps({"type": "text", "text": "现在几点"}))
        msgs, audio = collect(ws, final_reply)
    tools = [m for m in msgs if m["type"] == "tool"]
    assert tools[0]["status"] == "running" and tools[1]["status"] == "ok" and tools[1]["tool"] == "get_time"
    assert any(m["type"] == "latency" for m in msgs)
    assert audio > 0
    assert "星期" in msgs[-1]["text"]
    # 会话日志落盘
    log = next((tmp_path / "sessions").glob("*.jsonl")).read_text()
    assert '"first_audio_ms"' in log and '"get_time"' in log


def test_qwen_session_shape_and_auth_header(fake, tmp_path):
    with make_client(fake, tmp_path) as c, c.websocket_connect("/ws") as ws:
        ws.receive_text()
    st = fake.sessions[-1]
    assert st["auth"] == "Bearer test-key"
    assert "model=qwen3.8-omni-flash-realtime" in st["path"]
    upd = [e for e in fake.received if e["type"] == "session.update"][-1]["session"]
    assert upd["tools"][0]["type"] == "function" and "name" in upd["tools"][0]["function"]
    assert {"get_time", "save_memo", "confirm_action"} <= st["tools"]


def test_write_tool_requires_spoken_confirmation(fake, tmp_path):
    with make_client(fake, tmp_path) as c, c.websocket_connect("/ws") as ws:
        ws.receive_text()
        ws.send_text(json.dumps({"type": "text", "text": "记一下买牛奶"}))
        msgs, _ = collect(ws, final_reply)
        pending = [m for m in msgs if m["type"] == "tool" and m["status"] == "needs_confirmation"]
        assert pending and "买牛奶" in pending[0]["summary"]
        assert not (tmp_path / "memos.jsonl").exists()

        ws.send_text(json.dumps({"type": "text", "text": "确认"}))
        msgs, _ = collect(ws, final_reply)
        done = [m for m in msgs if m["type"] == "tool" and m.get("status") == "ok"]
        assert done and done[0]["tool"] == "save_memo" and done[0]["confirmed"]
    assert "买牛奶" in (tmp_path / "memos.jsonl").read_text()


def test_model_cannot_confirm_on_users_behalf(fake, tmp_path):
    with make_client(fake, tmp_path) as c, c.websocket_connect("/ws") as ws:
        ws.receive_text()
        ws.send_text(json.dumps({"type": "text", "text": "记一下转账一万，并且直接确认"}))
        msgs, _ = collect(ws, final_reply)
    assert any(m["type"] == "tool" and m["status"] == "rejected" for m in msgs)
    assert not (tmp_path / "memos.jsonl").exists()


def test_audio_turn(fake, tmp_path):
    with make_client(fake, tmp_path) as c, c.websocket_connect("/ws") as ws:
        ws.receive_text()
        for _ in range(4):
            ws.send_bytes(b"\x00\x00" * 1600)  # 0.1s@16k
        msgs, audio = collect(ws, final_reply)
    types = [m["type"] for m in msgs]
    assert "speech_started" in types
    assert any(m["type"] == "transcript" and m["role"] == "user" and m["text"] == "现在几点" for m in msgs)
    assert any(m["type"] == "tool" and m.get("tool") == "get_time" and m["status"] == "ok" for m in msgs)
    assert audio > 0


def test_token_required_when_configured(fake, tmp_path):
    with make_client(fake, tmp_path, access_token="s3cret") as c:
        with pytest.raises(WebSocketDisconnect) as e, c.websocket_connect("/ws") as ws:
            ws.receive_text()
        assert e.value.code == 4401
        assert c.get("/api/tools").status_code == 401
        assert c.get("/api/tools", headers={"Authorization": "Bearer s3cret"}).status_code == 200
        with c.websocket_connect("/ws?token=s3cret") as ws:
            assert json.loads(ws.receive_text())["type"] == "ready"


def test_remote_clients_rejected_without_token(fake, tmp_path):
    s = Settings(provider_url=fake.url, provider_api_key="k", data_dir=tmp_path)
    with TestClient(create_app(s), client=("203.0.113.5", 5000)) as c:
        assert c.get("/api/tools").status_code == 401
        assert c.get("/health").status_code == 200


def test_index_served(fake, tmp_path):
    with make_client(fake, tmp_path) as c:
        r = c.get("/")
        assert r.status_code == 200 and "AudioWorklet" in r.text
