#!/bin/bash

echo "✨ 正在启动Echo前端开发服务器..."

# 进入前端目录
cd frontend

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
  echo "🔍 未检测到node_modules，正在安装依赖..."
  npm install
fi

# 启动开发服务器（使用正确的脚本名称）
echo "🚀 启动开发服务器..."
npm run start:dev 