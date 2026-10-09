#!/bin/bash

# 全语音AI-Agent平台服务管理脚本
# 功能：
# 1. 检测并关闭已运行的前端、后端服务
# 2. 按顺序启动后端和前端服务
# 3. 详细记录启动过程的日志

# 日志文件路径
BACKEND_LOG="../backend/logs/backend_start.log"
FRONTEND_LOG="./logs/frontend_start.log"
MAIN_LOG="../logs/service_start.log"

# 创建日志目录
mkdir -p ../backend/logs
mkdir -p ./logs
mkdir -p ../logs

# 记录日志函数
log() {
  local message="$1"
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  echo -e "$timestamp - $message"
  echo -e "$timestamp - $message" >> "$MAIN_LOG"
}

log "======================================"
log "    全语音AI-Agent服务管理脚本       "
log "======================================"

# 1. 检测并关闭已运行的服务
log "检查并关闭已运行的服务..."

# 检查前端服务(端口3000)
FRONTEND_PID=$(lsof -i :3000 -t 2>/dev/null)
if [ -n "$FRONTEND_PID" ]; then
  log "发现前端服务运行在端口3000，PID: $FRONTEND_PID，正在关闭..."
  kill -9 $FRONTEND_PID
  sleep 1
  log "✅ 已关闭前端服务"
else
  log "✓ 未检测到运行中的前端服务"
fi

# 检查其他可能的React进程
REACT_SCRIPTS_PIDS=$(ps aux | grep "react-scripts" | grep -v grep | awk '{print $2}')
if [ -n "$REACT_SCRIPTS_PIDS" ]; then
  log "发现额外的React进程，正在关闭..."
  for pid in $REACT_SCRIPTS_PIDS; do
    log "关闭React进程 PID: $pid"
    kill -9 $pid
  done
  log "✅ 已关闭所有React相关进程"
fi

# 检查后端服务(端口8000)
BACKEND_PID=$(lsof -i :8000 -t 2>/dev/null)
if [ -n "$BACKEND_PID" ]; then
  log "发现后端服务运行在端口8000，PID: $BACKEND_PID，正在关闭..."
  kill -9 $BACKEND_PID
  sleep 1
  log "✅ 已关闭后端服务"
else
  log "✓ 未检测到运行中的后端服务"
fi

# 检查uvicorn进程
UVICORN_PIDS=$(ps aux | grep "uvicorn app.main:app" | grep -v grep | awk '{print $2}')
if [ -n "$UVICORN_PIDS" ]; then
  log "发现额外的uvicorn进程，正在关闭..."
  for pid in $UVICORN_PIDS; do
    log "关闭uvicorn进程 PID: $pid"
    kill -9 $pid
  done
  log "✅ 已关闭所有uvicorn相关进程"
fi

# 2. 启动后端服务
log "正在启动后端服务..."
log "当前目录: $(pwd)"

cd ../backend
log "进入后端目录: $(pwd)"

# 启动后端服务并记录日志
log "启动命令: python -m uvicorn app.main:app --reload --port 8000"
python -m uvicorn app.main:app --reload --port 8000 > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

# 等待后端服务启动
log "等待后端服务启动..."
BACKEND_START_TIME=0
BACKEND_MAX_WAIT=30
BACKEND_STARTED=false

while [ $BACKEND_START_TIME -lt $BACKEND_MAX_WAIT ] && [ "$BACKEND_STARTED" = "false" ]; do
  # 尝试健康检查路由
  if curl -s http://localhost:8000/health > /dev/null; then
    BACKEND_STARTED=true
    log "✅ 后端服务已成功启动 (PID: $BACKEND_PID)"
  else
    sleep 2
    BACKEND_START_TIME=$((BACKEND_START_TIME+2))
    log "等待后端启动... (${BACKEND_START_TIME}s/${BACKEND_MAX_WAIT}s)"
  fi
done

if [ "$BACKEND_STARTED" = "false" ]; then
  log "❌ 后端服务启动超时，请检查日志: $BACKEND_LOG"
  log "后端日志末尾内容:"
  tail -n 20 "$BACKEND_LOG" | while read -r line; do log "  $line"; done
  exit 1
fi

# 3. 启动前端服务
cd ../frontend
log "进入前端目录: $(pwd)"

# 启动前端服务并记录日志
log "启动命令: npm run start"
npm run start > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

# 等待前端服务启动
log "等待前端服务启动..."
FRONTEND_START_TIME=0
FRONTEND_MAX_WAIT=60
FRONTEND_STARTED=false

while [ $FRONTEND_START_TIME -lt $FRONTEND_MAX_WAIT ] && [ "$FRONTEND_STARTED" = "false" ]; do
  # 检查端口是否已被监听
  if curl -s http://localhost:3000 > /dev/null; then
    FRONTEND_STARTED=true
    log "✅ 前端服务已成功启动 (PID: $FRONTEND_PID)"
  else
    sleep 2
    FRONTEND_START_TIME=$((FRONTEND_START_TIME+2))
    log "等待前端启动... (${FRONTEND_START_TIME}s/${FRONTEND_MAX_WAIT}s)"
  fi
done

if [ "$FRONTEND_STARTED" = "false" ]; then
  log "❌ 前端服务启动超时，请检查日志: $FRONTEND_LOG"
  log "前端日志末尾内容:"
  tail -n 20 "$FRONTEND_LOG" | while read -r line; do log "  $line"; done
  exit 1
fi

# 4. 显示服务状态
log "======================================"
log "服务状态摘要:"
log "后端服务: 运行中 (PID: $BACKEND_PID, 端口: 8000)"
log "前端服务: 运行中 (PID: $FRONTEND_PID, 端口: 3000)"
log "后端日志: $BACKEND_LOG"
log "前端日志: $FRONTEND_LOG"
log "主日志: $MAIN_LOG"
log "======================================"

# 提供停止服务的命令提示
log "要停止所有服务，请运行:"
log "kill -9 $BACKEND_PID $FRONTEND_PID"
log ""
log "请通过浏览器访问: http://localhost:3000"
log "如需访问修改后的确认对话框版本，请访问: http://localhost:3000/classic"
log "======================================"

# 尝试自动打开浏览器到主页路径
if command -v xdg-open &> /dev/null; then
  log "尝试自动打开浏览器..."
  xdg-open http://localhost:3000 &
elif command -v open &> /dev/null; then
  log "尝试自动打开浏览器..."
  open http://localhost:3000 &
fi

# 返回到原目录
cd ..
log "返回原目录: $(pwd)"

# 等待用户按Ctrl+C终止脚本
log "服务已启动并在后台运行"
log "按 Ctrl+C 退出此脚本 (服务将继续在后台运行)"
wait 