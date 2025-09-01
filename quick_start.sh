#!/bin/bash
# MCPRouter 快速启动脚本

echo "=================================================="
echo "MCPRouter 集成系统快速启动"
echo "=================================================="

# 检查环境变量
if [ -z "$LLM_API_KEY" ]; then
    echo "❌ 错误: 未设置 LLM_API_KEY 环境变量"
    echo "请设置您的 OpenAI API 密钥:"
    echo "export LLM_API_KEY=your-api-key-here"
    exit 1
fi

echo "✅ LLM_API_KEY 已配置"

# 检查 Go 环境
if ! command -v go &> /dev/null; then
    echo "❌ 错误: 未安装 Go"
    echo "请安装 Go 1.21+ 版本"
    exit 1
fi

echo "✅ Go 环境检查通过"

# 检查 Python 环境
if ! command -v python &> /dev/null; then
    echo "❌ 错误: 未安装 Python"
    echo "请安装 Python 3.8+ 版本"
    exit 1
fi

echo "✅ Python 环境检查通过"

# 启动 MCPRouter
echo "🚀 启动 MCPRouter..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    start-mcprouter.bat
else
    # Linux/macOS
    ./start-mcprouter.sh
fi

# 等待 MCPRouter 启动
echo "⏳ 等待 MCPRouter 启动..."
sleep 5

# 检查 MCPRouter 状态
if curl -s http://localhost:8027/v1/list-servers > /dev/null; then
    echo "✅ MCPRouter 启动成功"
else
    echo "❌ MCPRouter 启动失败"
    exit 1
fi

# 启动 Python 后端
echo "🚀 启动 Python 后端..."
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# 等待后端启动
echo "⏳ 等待后端启动..."
sleep 3

# 检查后端状态
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Python 后端启动成功"
else
    echo "❌ Python 后端启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 系统启动完成！"
echo ""
echo "服务状态:"
echo "- MCPRouter API: http://localhost:8027"
echo "- MCPRouter Proxy: http://localhost:8025"
echo "- Python Backend: http://localhost:8000"
echo "- API 文档: http://localhost:8000/docs"
echo ""
echo "测试命令:"
echo "- 健康检查: curl http://localhost:8000/health"
echo "- 工具列表: curl http://localhost:8000/api/v1/tools/public"
echo "- 完整测试: cd MCPTEST && python test_mcprouter_system.py"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo '正在停止服务...'; kill $BACKEND_PID 2>/dev/null; exit 0" INT
wait
