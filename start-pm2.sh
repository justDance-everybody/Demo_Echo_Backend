#!/bin/bash
echo "🚀 正在初始化 PM2 服务..."

# 安装 PM2（如未安装）
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2 中..."
    npm install -g pm2
fi

# 启动服务
echo "🧠 启动 ecosystem.config.js 配置中的服务..."
pm2 start ecosystem.config.js

# 保存进程状态
pm2 save

# 显示状态
pm2 list

echo "✅ 所有服务已启动！下次进入后可直接运行 pm2 resurrect 恢复。"
