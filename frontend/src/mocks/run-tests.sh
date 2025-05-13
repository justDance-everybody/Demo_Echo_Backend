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

# 检查是否已经在运行
if pgrep -f "react-scripts start" > /dev/null; then
  echo "⚠️ 前端应用已在运行，请直接访问 http://localhost:3000/test"
else
  echo "启动前端应用..."
  npm start &
  echo "⏳ 正在启动，请等待几秒钟..."
  sleep 5
  echo "✅ 启动完成！请访问 http://localhost:3000/test"
fi

echo ""
echo "测试完成后可运行 ./src/mocks/cleanup-tests.sh 清理测试环境"
echo "=============================================" 