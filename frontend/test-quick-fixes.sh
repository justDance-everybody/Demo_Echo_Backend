#!/bin/bash

# 快速测试修复效果
echo "🧪 开始快速测试..."

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 检查前端服务
echo "🔍 检查前端服务..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 前端服务运行正常"
else
    echo "❌ 前端服务未运行"
fi

# 检查后端服务
echo "🔍 检查后端服务..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ 后端服务运行正常"
else
    echo "❌ 后端服务未运行"
fi

# 运行核心测试
echo "🎯 运行核心语音流程测试..."
cd frontend
npx cypress run --spec "cypress/e2e/voice_recording.cy.js" --headless

echo "📊 测试完成！查看结果..." 