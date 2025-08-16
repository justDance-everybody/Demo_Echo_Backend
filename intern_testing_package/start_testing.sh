#!/bin/bash

# 实习生测试环境一键启动脚本
# 用于快速启动后端API测试环境

set -e  # 遇到错误立即退出

# 确保脚本有执行权限
chmod +x "$0" 2>/dev/null || true
chmod +x stop_testing.sh 2>/dev/null || true

echo "🚀 启动实习生测试环境..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: 请先安装Docker Compose"
    exit 1
fi

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 请先安装Python 3.9+"
    exit 1
fi

echo "📦 检查并安装Python依赖..."
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

echo "🐳 启动Docker服务..."
# 停止可能存在的旧容器
docker-compose down 2>/dev/null || true

# 启动测试数据库和相关服务
docker-compose up -d

echo "⏳ 等待数据库启动..."
sleep 10

# 检查数据库连接
echo "🔍 检查数据库连接..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if docker-compose exec -T mysql mysql -u testuser -ptestpass123 -e "SELECT 1" test_ai_assistant &>/dev/null; then
        echo "✅ 数据库连接成功"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ 数据库连接失败，请检查Docker服务"
        exit 1
    fi
    
    echo "等待数据库启动... ($attempt/$max_attempts)"
    sleep 2
    ((attempt++))
done

echo "📊 初始化测试数据..."
# 执行数据库初始化脚本
docker-compose exec -T mysql mysql -u testuser -ptestpass123 test_ai_assistant < scripts/init_test_db.sql

echo "🔧 配置后端环境..."
cd backend

# 创建测试环境的.env文件
if [ ! -f ".env" ]; then
    echo "📝 创建测试环境配置文件..."
    cp .env.example .env
    
    # 配置测试环境的数据库连接
    sed -i 's|DATABASE_URL=.*|DATABASE_URL=mysql+pymysql://testuser:testpass123@localhost:3307/test_ai_assistant|g' .env
    sed -i 's|DB_HOST=.*|DB_HOST=localhost|g' .env
    sed -i 's|DB_PORT=.*|DB_PORT=3307|g' .env
    sed -i 's|DB_USER=.*|DB_USER=testuser|g' .env
    sed -i 's|DB_PASSWORD=.*|DB_PASSWORD=testpass123|g' .env
    sed -i 's|DB_NAME=.*|DB_NAME=test_ai_assistant|g' .env
    
    # 设置测试环境标识
    sed -i 's|ENV=.*|ENV=testing|g' .env
    
    # 设置CORS允许本地访问
    sed -i 's|CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3000,http://localhost:3001,*|g' .env
    
    # 设置默认的JWT密钥（仅用于测试）
    sed -i 's|JWT_SECRET=.*|JWT_SECRET=test_jwt_secret_key_for_intern_testing_only_32chars|g' .env
    
    # 设置测试用的LLM配置（使用模拟值）
    sed -i 's|LLM_API_KEY=.*|LLM_API_KEY=test_api_key_for_testing|g' .env
    sed -i 's|OPENAI_API_KEY=.*|OPENAI_API_KEY=test_openai_key_for_testing|g' .env
    
    echo "✅ 测试环境配置文件创建完成"
else
    echo "✅ 使用现有的.env配置文件"
fi

echo "🚀 启动后端服务..."
# 在后台启动后端服务
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid

echo "⏳ 等待后端服务启动..."
sleep 5

# 检查后端服务是否启动成功
max_attempts=20
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:3000/health &>/dev/null; then
        echo "✅ 后端服务启动成功"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ 后端服务启动失败，请检查日志: logs/backend.log"
        exit 1
    fi
    
    echo "等待后端服务启动... ($attempt/$max_attempts)"
    sleep 2
    ((attempt++))
done

cd ..

echo ""
echo "🎉 测试环境启动成功!"
echo ""
echo "📋 服务信息:"
echo "   后端API: http://localhost:3000"
echo "   API文档: http://localhost:3000/docs"
echo "   数据库: localhost:3307 (用户: testuser, 密码: testpass123)"
echo ""
echo "🧪 开始测试:"
echo "   1. 运行自动化测试: python test_runner.py"
echo "   2. 导入Postman集合: postman_collection.json"
echo "   3. 查看测试文档: README.md"
echo ""
echo "📝 日志文件:"
echo "   后端日志: logs/backend.log"
echo "   测试日志: logs/test.log"
echo ""
echo "🛑 停止服务: ./stop_testing.sh"
echo ""