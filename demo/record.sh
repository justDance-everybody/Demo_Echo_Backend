#!/usr/bin/env bash
# 一条命令重录 demo：合成用户台词 → 起虚拟声卡、虚拟屏幕和 Echo 服务 → 真浏览器对真模型说话 → 剪成片。
# 需要：Linux，ffmpeg、Xvfb、pulseaudio（含 pactl/parec/paplay）、google-chrome、uv；仓库根目录的 .env 配好模型密钥。
# 产物在 demo/out/：echo-demo.mp4、echo-demo.gif，以及原始录像 take.mkv 和会话日志 data/sessions/。
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$(cd .. && pwd)
W=$PWD/out
DISPLAY_NUM=${DEMO_DISPLAY:-97}
export DEMO_PORT=${DEMO_PORT:-8765}

[ -f "$ROOT/.env" ] || { echo "先在仓库根目录配好 .env（见 .env.example）"; exit 1; }
for c in ffmpeg Xvfb pulseaudio pactl parec paplay google-chrome uv curl; do
  command -v "$c" >/dev/null || { echo "缺少 $c"; exit 1; }
done
set -a; . "$ROOT/.env"; set +a

rm -rf "$W/data" "$W/pulse"; mkdir -p "$W/pulse"
# 独立的 PulseAudio，不碰本机已有的声卡
export PULSE_RUNTIME_PATH=$W/pulse PULSE_STATE_PATH=$W/pulse XDG_RUNTIME_DIR=$W/pulse PULSE_SERVER=unix:$W/pulse/native
export DISPLAY=:$DISPLAY_NUM

cleanup() {
  [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null
  [ -n "${XVFB_PID:-}" ] && kill "$XVFB_PID" 2>/dev/null
  pulseaudio --kill 2>/dev/null
  true
}
trap cleanup EXIT

pulseaudio --daemonize=yes --exit-idle-time=-1 -n \
  --load="module-native-protocol-unix socket=$W/pulse/native" \
  --load="module-null-sink sink_name=spk rate=48000" \
  --load="module-null-sink sink_name=mic rate=48000" \
  --load="module-null-sink sink_name=mix rate=48000" \
  --load="module-remap-source source_name=micin master=mic.monitor" \
  --load="module-loopback source=spk.monitor sink=mix latency_msec=10" \
  --load="module-loopback source=mic.monitor sink=mix latency_msec=10"
pactl set-default-sink spk      # Chrome 的声音 → spk
pactl set-default-source micin  # Chrome 的麦克风 ← mic（台词用 paplay 播进 mic）

Xvfb ":$DISPLAY_NUM" -screen 0 1600x900x24 -nolisten tcp >"$W/xvfb.log" 2>&1 &
XVFB_PID=$!

(cd "$ROOT" && ECHO_PORT=$DEMO_PORT ECHO_DATA_DIR=$W/data exec uv run echo-server) >"$W/server.log" 2>&1 &
SERVER_PID=$!
for _ in $(seq 100); do curl -sf "http://127.0.0.1:$DEMO_PORT/health" >/dev/null && break; sleep 0.2; done

uv run --quiet python tts.py "$W/clips"
uv run --quiet --with playwright python drive.py "$W"
uv run --quiet --with playwright python compose.py "$W"
