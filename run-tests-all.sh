#!/bin/bash

# 全语音AI-Agent平台完整测试脚本
# 此脚本会先停止所有运行中的服务，然后启动后端和前端，最后运行自动化测试

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}   全语音AI-Agent平台自动化测试工具  ${NC}"
echo -e "${BLUE}=====================================${NC}"

# 确保在项目根目录运行
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
  echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
  exit 1
fi

# 第一步：停止所有现有服务
echo -e "\n${YELLOW}第一步: 停止所有运行中的服务...${NC}"

# 停止前端服务
echo -e "正在停止前端服务..."
cd frontend
./manage-frontend.sh stop
cd ..

# 停止后端服务
echo -e "正在停止后端服务..."
BACKEND_PID=$(lsof -i :8000 -t 2>/dev/null)
if [ -n "$BACKEND_PID" ]; then
  echo "发现后端服务进程 PID: $BACKEND_PID，正在关闭..."
  kill -9 $BACKEND_PID
  sleep 1
  echo "✅ 后端服务已关闭"
fi

# 查找其他可能的uvicorn进程
UVICORN_PIDS=$(ps aux | grep "uvicorn app.main:app" | grep -v grep | awk '{print $2}')
if [ -n "$UVICORN_PIDS" ]; then
  echo "找到额外的uvicorn进程，正在关闭..."
  for pid in $UVICORN_PIDS; do
    echo "关闭进程 PID: $pid"
    kill -9 $pid 2>/dev/null
  done
  echo "✅ 所有uvicorn进程已关闭"
fi

echo -e "${GREEN}✅ 所有服务已停止${NC}"
sleep 1

# 第二步：启动后端服务
echo -e "\n${YELLOW}第二步: 启动后端服务...${NC}"
cd backend

# 检查虚拟环境是否存在
if [ ! -d "venv" ]; then
  echo -e "${YELLOW}未检测到后端虚拟环境，正在创建...${NC}"
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
else
  source venv/bin/activate
fi

# 启动后端服务
echo -e "启动后端服务，日志保存到logs/backend_test.log..."
mkdir -p logs
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level info > logs/backend_test.log 2>&1 &
BACKEND_PID=$!
echo -e "后端服务启动，PID: ${BACKEND_PID}"
cd ..

# 等待几秒让后端完全启动
echo -e "等待后端服务启动完成 (5秒)..."
sleep 5

# 检查后端是否成功启动
if curl -s http://localhost:8000/api/health | grep -q "ok"; then
  echo -e "${GREEN}✅ 后端服务成功启动${NC}"
else
  echo -e "${RED}❌ 后端服务可能启动失败，请检查logs/backend_test.log${NC}"
  echo -e "最近的日志:"
  tail -n 10 backend/logs/backend_test.log
  echo -e "请修复问题后重试。继续启动前端服务..."
fi

# 第三步：启动前端服务
echo -e "\n${YELLOW}第三步: 启动前端服务...${NC}"
cd frontend
./manage-frontend.sh start
cd ..

# 等待几秒让前端完全启动
echo -e "等待前端服务启动完成 (5秒)..."
sleep 5

# 第四步：运行API测试
echo -e "\n${YELLOW}第四步: 运行API测试...${NC}"
cd frontend
./test-api.sh
cd ..

echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}✅ 全部测试流程已完成${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "- 后端服务运行在: ${BLUE}http://localhost:8000${NC}"
echo -e "- 前端应用运行在: ${BLUE}http://localhost:3000${NC}"
echo -e "- 测试页面位于: ${BLUE}http://localhost:3000/test${NC}"
echo -e "\n使用以下命令停止所有服务:"
echo -e "${YELLOW}  ./run-tests-all.sh stop${NC}"

# 添加停止所有服务的功能
if [ "$1" = "stop" ]; then
  echo -e "\n${YELLOW}正在停止所有服务...${NC}"
  
  # 停止前端
  cd frontend
  ./manage-frontend.sh stop
  cd ..
  
  # 停止后端
  BACKEND_PID=$(lsof -i :8000 -t 2>/dev/null)
  if [ -n "$BACKEND_PID" ]; then
    echo "发现后端服务进程 PID: $BACKEND_PID，正在关闭..."
    kill -9 $BACKEND_PID
    sleep 1
    echo "✅ 后端服务已关闭"
  fi
  
  # 查找其他可能的uvicorn进程
  UVICORN_PIDS=$(ps aux | grep "uvicorn app.main:app" | grep -v grep | awk '{print $2}')
  if [ -n "$UVICORN_PIDS" ]; then
    echo "找到额外的uvicorn进程，正在关闭..."
    for pid in $UVICORN_PIDS; do
      echo "关闭进程 PID: $pid"
      kill -9 $pid 2>/dev/null
    done
    echo "✅ 所有uvicorn进程已关闭"
  fi
  
  echo -e "${GREEN}✅ 所有服务已停止${NC}"
fi 