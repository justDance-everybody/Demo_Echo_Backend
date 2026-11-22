import asyncio
import json

import pytest

from echo_agent.confirm import Executor
from echo_agent.tools import Registry, Tool


def make_registry(calls):
    async def read(args):
        calls.append(("read", args))
        return {"ok": True}

    async def write(args):
        calls.append(("write", args))
        return {"written": args["text"]}

    async def slow(args):
        await asyncio.sleep(1)

    async def boom(args):
        raise RuntimeError("坏了")

    obj = {"type": "object", "properties": {}}
    return Registry([
        Tool("read", "读", obj, read),
        Tool("write", "写", obj, write, confirm=True, summary="要写入：{text}"),
        Tool("slow", "慢", obj, slow),
        Tool("boom", "炸", obj, boom),
    ])


@pytest.fixture
def ex():
    calls = []
    e = Executor(make_registry(calls), ttl_s=120, timeout_s=0.2)
    e.calls = calls
    return e


async def test_read_only_runs_directly(ex):
    r = await ex.handle("read", "{}")
    assert json.loads(r["output"]) == {"ok": True}
    assert r["event"]["status"] == "ok"
    assert ex.calls == [("read", {})]


async def test_write_needs_confirmation_after_user_turn(ex):
    r = await ex.handle("write", '{"text":"买牛奶"}')
    out = json.loads(r["output"])
    assert out["status"] == "needs_user_confirmation"
    assert out["summary"] == "要写入：买牛奶"
    assert ex.calls == []

    # 模型自问自答：用户还没开口就确认 → 拒绝
    r = await ex.handle("confirm_action", json.dumps({"action_id": out["action_id"]}))
    assert r["event"]["status"] == "rejected"
    assert ex.calls == []

    ex.note_user_turn()
    r = await ex.handle("confirm_action", json.dumps({"action_id": out["action_id"]}))
    assert r["event"]["status"] == "ok" and r["event"]["confirmed"]
    assert ex.calls == [("write", {"text": "买牛奶"})]

    # 同一个动作不能执行两次
    r = await ex.handle("confirm_action", json.dumps({"action_id": out["action_id"]}))
    assert r["event"]["status"] == "rejected"


async def test_confirm_ignores_new_args(ex):
    out = json.loads((await ex.handle("write", '{"text":"A"}'))["output"])
    ex.note_user_turn()
    await ex.handle("confirm_action", json.dumps({"action_id": out["action_id"], "text": "B"}))
    assert ex.calls == [("write", {"text": "A"})]


async def test_cancel_and_expiry(ex):
    out = json.loads((await ex.handle("write", '{"text":"A"}'))["output"])
    r = await ex.handle("cancel_action", json.dumps({"action_id": out["action_id"]}))
    assert json.loads(r["output"])["status"] == "cancelled"
    ex.note_user_turn()
    assert (await ex.handle("confirm_action", json.dumps({"action_id": out["action_id"]})))["event"]["status"] == "rejected"

    ex.ttl_s = 0
    out = json.loads((await ex.handle("write", '{"text":"A"}'))["output"])
    ex.note_user_turn()
    await asyncio.sleep(0.01)
    assert (await ex.handle("confirm_action", json.dumps({"action_id": out["action_id"]})))["event"]["status"] == "rejected"
    assert ex.calls == []


async def test_errors_are_reported_not_raised(ex):
    assert (await ex.handle("nope", "{}"))["event"]["status"] == "unknown_tool"
    assert (await ex.handle("read", "{bad"))["event"]["status"] == "bad_args"
    assert (await ex.handle("slow", "{}"))["event"]["status"] == "timeout"
    r = await ex.handle("boom", "{}")
    assert r["event"]["status"] == "error" and "坏了" in r["output"]


def test_confirm_tools_only_exposed_when_needed():
    obj = {"type": "object", "properties": {}}

    async def f(a):
        return {}

    only_read = Executor(Registry([Tool("r", "r", obj, f)]))
    assert [t["name"] for t in only_read.tool_specs()] == ["r"]


def test_output_truncated():
    obj = {"type": "object", "properties": {}}

    async def big(a):
        return "x" * 10000

    e = Executor(Registry([Tool("big", "", obj, big)]), max_chars=100)
    r = asyncio.run(e.handle("big", "{}"))
    assert len(r["output"]) < 120
