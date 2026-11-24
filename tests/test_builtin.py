import os

import pytest

from echo_agent import builtin


async def test_calculate():
    assert (await builtin.calculate("(12.5+3)*4"))["result"] == 62
    assert (await builtin.calculate("2^10"))["result"] == 1024
    assert (await builtin.calculate("7÷2"))["result"] == 3.5


@pytest.mark.parametrize("expr", ["__import__('os')", "a+1", "9**9999", "[1]*3"])
async def test_calculate_rejects_non_arithmetic(expr):
    with pytest.raises(ValueError):
        await builtin.calculate(expr)


async def test_get_time():
    r = await builtin.get_time()
    assert r["timezone"] == "Asia/Shanghai" and r["weekday"].startswith("星期")


async def test_memo_roundtrip(tmp_path):
    m = builtin.MemoStore(tmp_path / "m.jsonl")
    assert (await m.list_memos())["memos"] == []
    await m.save_memo("买牛奶")
    await m.save_memo("交电费")
    assert [x["text"] for x in (await m.list_memos(limit=1))["memos"]] == ["交电费"]


@pytest.mark.skipif(not os.environ.get("ECHO_NETWORK_TESTS"), reason="需要外网：ECHO_NETWORK_TESTS=1")
async def test_weather_live():
    r = await builtin.get_weather("武汉")
    assert "now" in r and len(r["daily"]) == 7 and r["daily"][0]["weekday"].startswith("今天")
