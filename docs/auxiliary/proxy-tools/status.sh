#!/bin/bash

# Trojan-Go 状态检查脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Trojan-Go 客户端状态 ==="
echo ""

# 检查进程
if [ -f "logs/trojan-go.pid" ]; then
    PID=$(cat logs/trojan-go.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "状态: ✓ 运行中"
        echo "PID: $PID"
        echo "代理地址: 127.0.0.1:1080 (SOCKS5)"
        echo ""
        
        # 检查端口监听
        if command -v ss > /dev/null 2>&1; then
            echo "端口监听:"
            ss -tlnp | grep :1080 || echo "  端口 1080 未监听"
        elif command -v netstat > /dev/null 2>&1; then
            echo "端口监听:"
            netstat -tlnp 2>/dev/null | grep :1080 || echo "  端口 1080 未监听"
        fi
        
        echo ""
        echo "最新日志 (最后 10 行):"
        echo "----------------------------------------"
        tail -n 10 logs/trojan-go.log
    else
        echo "状态: ✗ 未运行 (PID 文件存在但进程不存在)"
        rm -f logs/trojan-go.pid
    fi
else
    echo "状态: ✗ 未运行"
fi
