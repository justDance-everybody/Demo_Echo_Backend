#!/bin/bash

# 实习生测试环境停止脚本
# 用于清理和停止所有测试服务

echo "🛑 停止测试环境..."

# 停止后端服务
if [ -f "backend.pid" ]; then
    BACKEND_PID=$(cat backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "停止后端服务 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        sleep 2
        
        # 强制杀死进程（如果还在运行）
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo "强制停止后端服务..."
            kill -9 $BACKEND_PID
        fi
    fi
    rm -f backend.pid
fi

# 停止Docker服务
echo "🐳 停止Docker服务..."
docker-compose down

# 清理Docker卷（可选）
read -p "是否清理数据库数据? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "清理数据库数据..."
    docker-compose down -v
    docker volume prune -f
fi

# 清理日志文件（可选）
read -p "是否清理日志文件? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "清理日志文件..."
    rm -f logs/*.log
fi

echo "✅ 测试环境已停止"
echo ""
echo "💡 提示:"
echo "   - 重新启动: ./start_testing.sh"
echo "   - 查看文档: README.md"
echo ""