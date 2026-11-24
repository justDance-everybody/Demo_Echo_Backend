"""真浏览器对真模型说话，同时录屏录音。

用户台词从虚拟麦克风（PulseAudio null sink）播进 Chrome，Echo 的声音从虚拟扬声器出来；
两路混进同一个 sink，和屏幕一起进同一个 ffmpeg，用墙钟时间戳对齐。
用法：python drive.py <工作目录>（record.sh 会先把声卡、屏幕、服务都起好）。
输出：<工作目录>/take.mkv 和 marks.json（每句台词开始的时间，供 compose.py 放说明框）。
"""

import asyncio
import json
import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright

W = Path(sys.argv[1]).resolve()
PORT = os.environ.get("DEMO_PORT", "8765")
DISPLAY = os.environ.get("DISPLAY", ":97")
URL = f"http://127.0.0.1:{PORT}/"


def say(name: str) -> None:
    subprocess.run(["paplay", "--device=mic", str(W / "clips" / f"{name}.wav")], check=True)


async def settle(page, timeout=30, quiet=1.5) -> None:
    """等 Echo 说完：先见到它开口，再连续 quiet 秒没有声音在播。"""
    t0, spoke, calm = time.time(), False, None
    while time.time() - t0 < timeout:
        mode, playing = await page.evaluate("[mode, sources.length]")
        if mode == "speak" or playing:
            spoke, calm = True, None
        elif spoke:
            calm = calm or time.time()
            if time.time() - calm > quiet:
                return
        await asyncio.sleep(0.1)
    print("等 Echo 说完超时", flush=True)


async def wait_speaking(page, timeout=20) -> None:
    t0 = time.time()
    while time.time() - t0 < timeout and await page.evaluate("mode") != "speak":
        await asyncio.sleep(0.05)


async def main() -> None:
    profile = W / "chrome-profile"
    shutil.rmtree(profile, ignore_errors=True)
    (profile / "Default").mkdir(parents=True)
    (profile / "Default" / "Preferences").write_text(json.dumps({"translate": {"enabled": False}}))
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            profile, executable_path=shutil.which("google-chrome"), headless=False, no_viewport=True,
            permissions=["microphone"], ignore_default_args=["--enable-automation", "--mute-audio"],
            args=[f"--app={URL}", "--window-position=0,0", "--window-size=1600,900", "--test-type",
                  "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required",
                  "--disable-features=Translate,TranslateUI", "--lang=zh-CN", "--no-first-run",
                  "--no-default-browser-check", "--hide-crash-restore-bubble"])
        while not ctx.pages:
            await asyncio.sleep(0.1)
        page = ctx.pages[0]
        await page.wait_for_load_state()
        await asyncio.sleep(2)

        pa = subprocess.Popen(["parec", "-d", "mix.monitor", "--rate=48000", "--channels=2", "--format=s16le",
                               "--latency-msec=10", "--raw"], stdout=subprocess.PIPE)
        rec = subprocess.Popen(
            ["ffmpeg", "-loglevel", "error", "-y",
             "-thread_queue_size", "1024", "-f", "x11grab", "-draw_mouse", "0", "-framerate", "30",
             "-video_size", "1600x900", "-i", DISPLAY,
             "-thread_queue_size", "1024", "-use_wallclock_as_timestamps", "1",
             "-f", "s16le", "-ar", "48000", "-ac", "2", "-i", "pipe:0",
             "-af", "aresample=async=1000", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "14",
             "-c:a", "pcm_s16le", str(W / "take.mkv")], stdin=pa.stdout)
        t0, marks = time.time(), {}

        def mark(k):
            marks[k] = round(time.time() - t0, 2)
            print(f"{marks[k]:6.2f}s {k}", flush=True)

        await asyncio.sleep(1.5)
        await page.click("#talk")
        await asyncio.sleep(1.5)
        for step in ["01_weather", "02_memo", "03_yes"]:
            mark(step)
            say(step)
            await settle(page)
            await asyncio.sleep(0.8)
        mark("04_story")
        say("04_story")
        await wait_speaking(page)
        await asyncio.sleep(4.0)            # 让它讲一会儿再打断
        mark("05_cut")
        say("05_cut")
        await settle(page)
        await asyncio.sleep(1.5)
        mark("end")
        rec.send_signal(signal.SIGINT)
        rec.wait(30)
        pa.terminate()
        await ctx.close()
    (W / "marks.json").write_text(json.dumps(marks, indent=1))


asyncio.run(main())
