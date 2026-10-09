#!/bin/bash

# Trojan-Go 客户端启动脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查配置文件
if [ ! -f "config/client.json" ]; then
    echo "错误: 配置文件不存在 config/client.json"
    echo "请先编辑配置文件，填入服务器信息"
    exit 1
fi

# 检查是否已经在运行
if [ -f "logs/trojan-go.pid" ]; then
    PID=$(cat logs/trojan-go.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "Trojan-Go 已经在运行中 (PID: $PID)"
        exit 0
    else
        echo "删除过期的 PID 文件"
        rm -f logs/trojan-go.pid
    fi
fi

# 启动 Trojan-Go
echo "正在启动 Trojan-Go 客户端..."
nohup ./trojan-go -config config/client.json > logs/trojan-go.log 2>&1 &
PID=$!

# 保存 PID
echo $PID > logs/trojan-go.pid

# 等待启动
sleep 2

# 检查是否启动成功
if ps -p $PID > /dev/null 2>&1; then
    echo "✓ Trojan-Go 启动成功 (PID: $PID)"
    echo "✓ SOCKS5 代理: 127.0.0.1:1080"
    echo ""
    echo "测试连接："
    echo "  curl --socks5 127.0.0.1:1080 https://www.google.com -I"
    echo ""
    echo "查看日志："
    echo "  tail -f $SCRIPT_DIR/logs/trojan-go.log"
else
    echo "✗ Trojan-Go 启动失败"
    echo "查看日志："
    cat logs/trojan-go.log
    rm -f logs/trojan-go.pid
    exit 1
fi
