"""把“用户”一方的台词合成成语音（DashScope qwen3-tts-flash），存成 48 kHz wav。

用法：python tts.py <输出目录>；密钥读 ECHO_PROVIDER_API_KEY（和 Echo 用的同一把百炼 key）。
"""

import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

LINES = {
    "01_weather": "武汉今天天气怎么样？",
    "02_memo": "帮我记一下，明天下午三点跟投资人开会。",
    "03_yes": "好的，记吧。",
    "04_story": "详细给我讲讲武汉有哪些好吃的，每样都说说。",
    "05_cut": "等一下，三千块打八五折是多少？",
}
API = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"


def main(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    key = os.environ["ECHO_PROVIDER_API_KEY"]
    for name, text in LINES.items():
        wav = out / f"{name}.wav"
        if wav.exists():
            continue
        body = {"model": "qwen3-tts-flash", "input": {"text": text, "voice": "Ethan", "language_type": "Chinese"}}
        req = urllib.request.Request(API, data=json.dumps(body).encode(),
                                     headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        url = json.load(urllib.request.urlopen(req, timeout=60))["output"]["audio"]["url"]
        raw = out / f"{name}.raw.wav"
        urllib.request.urlretrieve(url, raw)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-ar", "48000", "-ac", "1", wav], check=True)
        raw.unlink()
        print(name, text)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
