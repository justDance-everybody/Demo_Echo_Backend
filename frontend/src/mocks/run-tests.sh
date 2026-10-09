#!/bin/bash

# 前端测试启动脚本
# 用于启动自动化测试

echo "============================================="
echo "语音AI代理前端自动化测试 - 启动脚本"
echo "============================================="

# 确保测试文件执行权限
chmod +x src/mocks/cleanup-tests.sh

# 修改环境变量文件(如果存在)，添加测试模式
if [ -f ".env" ]; then
  if ! grep -q "REACT_APP_TEST_MODE" .env; then
    echo "REACT_APP_TEST_MODE=true" >> .env
    echo "✅ 已添加测试模式环境变量"
  fi
fi

# 停止可能正在运行的前端服务
echo "正在停止现有前端服务..."

# 查找占用3000端口的进程
REACT_PID=$(lsof -i :3000 -t 2>/dev/null)
if [ -n "$REACT_PID" ]; then
  echo "找到运行在端口3000的服务，PID: ${REACT_PID}，正在关闭..."
  kill -9 $REACT_PID
  sleep 1
  echo "✅ 端口3000已释放"
fi

# 查找其他可能存在的React脚本进程
REACT_SCRIPTS_PIDS=$(ps aux | grep "react-scripts" | grep -v grep | awk '{print $2}')
if [ -n "$REACT_SCRIPTS_PIDS" ]; then
  echo "找到其他React脚本进程，正在关闭..."
  for pid in $REACT_SCRIPTS_PIDS; do
    echo "关闭进程 PID: ${pid}"
    kill -9 $pid 2>/dev/null
  done
  echo "✅ 所有React相关进程已关闭"
fi

# 查找npm start进程
NPM_START_PIDS=$(ps aux | grep "npm start" | grep -v grep | awk '{print $2}')
if [ -n "$NPM_START_PIDS" ]; then
  echo "找到npm start进程，正在关闭..."
  for pid in $NPM_START_PIDS; do
    echo "关闭进程 PID: ${pid}"
    kill -9 $pid 2>/dev/null
  done
  echo "✅ 所有npm start进程已关闭"
fi

echo "✅ 前端服务已停止，准备启动新实例"

# 启动前端应用
  echo "启动前端应用..."
  npm start &
  echo "⏳ 正在启动，请等待几秒钟..."
  sleep 5
  echo "✅ 启动完成！请访问 http://localhost:3000/test"

echo ""
echo "测试完成后可运行 ./src/mocks/cleanup-tests.sh 清理测试环境"
echo "=============================================" 