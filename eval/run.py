"""对真实时语音模型跑意图评测：工具选择准确率 + 首字延迟。

用法（先配好 .env 里的 ECHO_PROVIDER_URL / ECHO_PROVIDER_API_KEY）：
    uv run python eval/run.py [--cases eval/cases.yaml] [--repeat 1]

每条用例新开一个会话、用文字输入（避免把语音识别误差混进意图评测）。
写操作只会走到“待确认”这一步，不会真的执行。
"""

from __future__ import annotations

import argparse
import asyncio
import json
import statistics
import sys
import time
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from echo_agent.config import ROOT, Settings
from echo_agent.confirm import Executor
from echo_agent.realtime import RealtimeClient
from echo_agent.tools import load_registry


async def run_case(settings: Settings, registry, text: str, timeout: float = 30) -> dict:
    ex = Executor(registry, settings.confirm_ttl_s, settings.tool_timeout_s, settings.tool_output_max_chars)
    rt = RealtimeClient(settings.provider_url, settings.provider_api_key, settings.dialect,
                        settings.model, settings.voice)
    await rt.connect(settings.instructions, ex.tool_specs())
    calls, pending, first_audio, reply, error = [], [], None, "", None
    ex.note_user_turn()
    t0 = time.monotonic()
    await rt.send_text(text)

    async def loop():
        nonlocal first_audio, reply, error
        async for ev in rt.events():
            if ev["type"] == "audio" and first_audio is None:
                first_audio = (time.monotonic() - t0) * 1000
            elif ev["type"] == "transcript" and ev["role"] == "assistant" and ev["final"]:
                reply = ev["text"]
            elif ev["type"] == "tool_call":
                calls.append({"name": ev["name"], "args": json.loads(ev["arguments"] or "{}")})
                pending.append((ev["call_id"], ex.handle(ev["name"], ev["arguments"])))
            elif ev["type"] == "response_done":
                if not pending:
                    return
                outs = [(cid, (await coro)["output"]) for cid, coro in pending]
                pending.clear()
                await rt.send_tool_outputs(outs)
            elif ev["type"] == "error":
                error = ev["message"]
                return

    try:
        await asyncio.wait_for(loop(), timeout)
    except TimeoutError:
        error = error or "timeout"
    finally:
        await rt.close()
    return {"calls": calls, "first_audio_ms": first_audio, "reply": reply, "error": error}


def judge(case: dict, got: dict) -> bool:
    """任务是否办成：调用了期望的工具且参数对；或者（算术这类）没调工具但回答里有正确结果。"""
    calls = [c for c in got["calls"] if c["name"] not in ("confirm_action", "cancel_action")]
    if case.get("tool") is None:
        return not calls and not got["error"]
    for c in calls:
        if c["name"] == case["tool"] and all(str(v) in str(c["args"].get(k, "")) for k, v in (case.get("args") or {}).items()):
            return True
    return any(s in got["reply"] for s in case.get("reply_any") or [])


def picked_tool(case: dict, got: dict) -> bool:
    """更严的口径：第一个调用的工具就是期望的那个。"""
    first = next((c["name"] for c in got["calls"] if c["name"] not in ("confirm_action", "cancel_action")), None)
    return first == case.get("tool")


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cases", default=str(ROOT / "eval" / "cases.yaml"))
    ap.add_argument("--repeat", type=int, default=1)
    a = ap.parse_args()
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
    settings = Settings.from_env()
    if not settings.provider_url or not settings.provider_api_key:
        sys.exit("先设置 ECHO_PROVIDER_URL 和 ECHO_PROVIDER_API_KEY")
    settings.data_dir = ROOT / "data" / "eval"
    registry = await load_registry(settings.tools_file, settings.data_dir)
    cases = yaml.safe_load(Path(a.cases).read_text(encoding="utf-8"))

    rows = []
    for _ in range(a.repeat):
        for case in cases:
            got = await run_case(settings, registry, case["text"])
            ok = judge(case, got)
            rows.append({**case, **got, "ok": ok, "picked": picked_tool(case, got)})
            mark = "✓" if ok else "✗"
            lat = f"{got['first_audio_ms']:.0f}ms" if got["first_audio_ms"] else "-"
            print(f"{mark} {lat:>7}  {case['text']}  → {[c['name'] for c in got['calls']]}  {got['error'] or ''}")

    acc = sum(r["ok"] for r in rows) / len(rows)
    lats = sorted(r["first_audio_ms"] for r in rows if r["first_audio_ms"])
    p50 = statistics.median(lats) if lats else None
    p90 = lats[int(len(lats) * 0.9) - 1] if len(lats) >= 10 else (lats[-1] if lats else None)
    picked = sum(r["picked"] for r in rows)
    print(f"\n任务办成 {acc:.0%}（{sum(r['ok'] for r in rows)}/{len(rows)}）  "
          f"第一步就选对工具 {picked / len(rows):.0%}（{picked}/{len(rows)}）  "
          f"首字延迟 p50 {p50 and round(p50)}ms  p90 {p90 and round(p90)}ms")
    out = ROOT / "data" / "eval" / f"result-{time.strftime('%Y%m%d-%H%M%S')}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"model": settings.model, "dialect": settings.dialect, "accuracy": acc,
                               "picked_tool": picked / len(rows),
                               "p50_ms": p50, "p90_ms": p90, "rows": rows}, ensure_ascii=False, indent=1))
    print(f"明细：{out}")


if __name__ == "__main__":
    asyncio.run(main())
