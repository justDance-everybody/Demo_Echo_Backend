#!/bin/bash

# Trojan-Go 客户端停止脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 PID 文件
if [ ! -f "logs/trojan-go.pid" ]; then
    echo "Trojan-Go 没有运行"
    exit 0
fi

PID=$(cat logs/trojan-go.pid)

# 检查进程是否存在
if ! ps -p $PID > /dev/null 2>&1; then
    echo "Trojan-Go 进程不存在，清理 PID 文件"
    rm -f logs/trojan-go.pid
    exit 0
fi

# 停止进程
echo "正在停止 Trojan-Go (PID: $PID)..."
kill $PID

# 等待进程退出
for i in {1..10}; do
    if ! ps -p $PID > /dev/null 2>&1; then
        echo "✓ Trojan-Go 已停止"
        rm -f logs/trojan-go.pid
        exit 0
    fi
    sleep 1
done

# 如果还没退出，强制结束
if ps -p $PID > /dev/null 2>&1; then
    echo "强制停止 Trojan-Go..."
    kill -9 $PID
    rm -f logs/trojan-go.pid
    echo "✓ Trojan-Go 已强制停止"
fi
