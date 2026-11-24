"""把录好的 take.mkv 剪成成片：片头 + 原样对话（只叠说明框）+ 片尾，另出一个 2 倍速 GIF 预览。

用法：python compose.py <工作目录>；读 take.mkv 和 marks.json，写 echo-demo.mp4 / echo-demo.gif。
对话本身不剪，说明框按 marks.json 里每句台词的开始时间出现。
"""

import asyncio
import json
import shutil
import subprocess
import sys
from pathlib import Path

from playwright.async_api import async_playwright

W = Path(sys.argv[1]).resolve()

CSS = """
body{margin:0;width:1600px;height:900px;font-family:'Noto Sans CJK SC','Noto Sans SC',sans-serif;color:#eef1f6;overflow:hidden}
.card{position:absolute;inset:0;background:#0b0d12;display:flex;flex-direction:column;justify-content:center;padding:0 140px}
.k{font-size:20px;letter-spacing:.35em;color:#2dd4bf;margin-bottom:26px}
h1{font-size:92px;margin:0;letter-spacing:.04em;font-weight:700}
h2{font-size:38px;margin:18px 0 0;font-weight:400;color:#c9cfdb}
.meta{margin-top:56px;font-size:21px;color:#7d8597;line-height:1.9}
.meta b{color:#eef1f6;font-weight:500}
.cap{position:absolute;left:32px;top:62px;max-width:1080px;background:rgba(11,13,18,.86);border:1px solid #2a3142;
     border-left:4px solid #2dd4bf;border-radius:10px;padding:14px 22px}
.cap .n{font-size:15px;letter-spacing:.25em;color:#2dd4bf}
.cap .t{font-size:28px;margin-top:2px}
.cap .s{font-size:17px;color:#9aa3b5;margin-top:4px}
.cap.warn{border-left-color:#fbbf24}.cap.warn .n{color:#fbbf24}
.cap.user{border-left-color:#a78bfa}.cap.user .n{color:#a78bfa}
"""
PAGES = {
 "intro": """<div class=card><div class=k>ECHO · V2</div><h1>说一句话，事就办了</h1>
   <h2>一个实时语音模型，加上服务端的确认闸和工具白名单</h2>
   <div class=meta><b>真实录屏，一镜到底</b>：真浏览器、真模型 Qwen3.8-Omni-Flash-Realtime<br>用户一方的声音是合成语音，经虚拟麦克风输入；
   对话没有剪辑，说明框是后加的标注</div></div>""",
 "outro": """<div class=card><div class=k>2025 原型 → 2026 重写</div><h1>Echo</h1>
   <h2>github.com/justDance-everybody/Demo_Echo_Backend</h2>
   <div class=meta>约 1000 行 Python · 一个 tools.yaml 就是全部工具发现机制<br>
   写操作未经用户开口确认，服务端一律不执行</div></div>""",
 "c1": """<div class=cap><div class=n>① 只读工具 · 直接执行</div><div class=t>问天气 → 模型调用 get_weather → 服务端执行 → 直接说结果</div><div class=s>不多问一句“您确认吗”</div></div>""",
 "c2": """<div class="cap warn"><div class=n>② 写操作 · 先登记，不执行</div><div class=t>save_memo 被服务端拦下：参数锁定，等用户开口</div><div class=s>右侧黄色卡片就是待确认动作；模型自己说“确认”会被拒绝</div></div>""",
 "c3": """<div class="cap warn"><div class=n>③ 用户说“好” · 服务端才执行</div><div class=t>执行的是登记时锁定的参数，不是模型这时再给的</div><div class=s>确认只在“登记之后用户又说过话”时有效，120 秒过期</div></div>""",
 "c4": """<div class="cap user"><div class=n>④ 随时打断</div><div class=t>Echo 讲到一半，用户插话问别的</div><div class=s>不用按键，直接开口</div></div>""",
 "c5": """<div class="cap user"><div class=n>⑤ 约一秒内停下，转去办新事</div><div class=t>停掉旧回答，直接处理新问题</div><div class=s>右侧记录每轮“首字延迟”：用户说完到听见第一个字</div></div>""",
}


async def render_cards() -> None:
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=shutil.which("google-chrome"))
        pg = await b.new_page(viewport={"width": 1600, "height": 900})
        for k, html in PAGES.items():
            await pg.set_content(f"<style>{CSS}</style>{html}")
            await pg.wait_for_timeout(150)
            await pg.screenshot(path=str(W / f"card_{k}.png"), omit_background=True)
        await b.close()


def ff(*args: str) -> None:
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *args], check=True)


def main() -> None:
    asyncio.run(render_cards())
    m = json.loads((W / "marks.json").read_text())
    s, e = 0.8, m["end"] - 3.2  # 去掉开头点按钮前的空白和结尾的静音
    spans = [(m["01_weather"] - 0.2, m["02_memo"] - 0.1), (m["02_memo"], m["03_yes"] - 0.1),
             (m["03_yes"], m["04_story"] - 0.1), (m["04_story"], m["05_cut"] - 0.1), (m["05_cut"], e)]
    chain, last = ["[0:v]setpts=PTS-STARTPTS[v0]"], "v0"
    for i, (a, b) in enumerate(spans, 1):
        chain.append(f"[{last}][{i}:v]overlay=enable='between(t,{a - s:.2f},{b - s:.2f})'[v{i}]")
        last = f"v{i}"
    chain.append(f"[{last}]fade=in:0:10,fade=out:st={e - s - 0.4:.2f}:d=0.4,format=yuv420p[v]")
    chain.append("[0:a]asetpts=PTS-STARTPTS,aresample=48000[a]")
    cards = [x for i in range(1, 6) for x in ("-i", str(W / f"card_c{i}.png"))]
    enc = ["-c:v", "libx264", "-preset", "slow", "-crf", "20", "-r", "30", "-c:a", "aac", "-b:a", "160k", "-ar", "48000"]
    ff("-ss", str(s), "-to", f"{e:.2f}", "-i", str(W / "take.mkv"), *cards, "-filter_complex", ";".join(chain),
       "-map", "[v]", "-map", "[a]", *enc, str(W / "body.mp4"))
    for c in ("intro", "outro"):
        ff("-loop", "1", "-t", "4", "-i", str(W / f"card_{c}.png"), "-f", "lavfi", "-t", "4",
           "-i", "anullsrc=r=48000:cl=stereo", "-vf", "format=yuv420p,fade=in:0:12,fade=out:st=3.6:d=0.4",
           *enc, "-shortest", str(W / f"{c}.mp4"))
    (W / "list.txt").write_text("".join(f"file '{W / n}.mp4'\n" for n in ("intro", "body", "outro")))
    ff("-f", "concat", "-safe", "0", "-i", str(W / "list.txt"), "-c:v", "libx264", "-preset", "slow", "-crf", "22",
       "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(W / "echo-demo.mp4"))
    ff("-ss", "4", "-t", f"{e - s:.2f}", "-i", str(W / "echo-demo.mp4"), "-vf",
       "setpts=PTS/2,fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];"
       "[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle", str(W / "echo-demo.gif"))
    print(W / "echo-demo.mp4", W / "echo-demo.gif")


if __name__ == "__main__":
    main()
