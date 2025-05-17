#!/bin/bash

# 全语音AI-Agent前端自动化测试脚本
# 用于运行所有前端测试

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}   全语音AI-Agent前端自动化测试工具  ${NC}"
echo -e "${BLUE}=====================================${NC}"

# 确保当前目录是前端目录
if [ ! -f "package.json" ]; then
  echo -e "${RED}错误: 请在前端目录(frontend)运行此脚本${NC}"
  exit 1
fi

# 停止所有相关进程的函数
stop_all_processes() {
  echo -e "\n${YELLOW}正在停止所有相关进程...${NC}"
  
  # 查找并杀死所有占用3000端口的进程
  echo -e "查找占用端口3000的进程..."
  PORT_PIDS=$(lsof -i :3000 -t 2>/dev/null)
  if [ -n "$PORT_PIDS" ]; then
    echo -e "找到正在使用端口3000的进程:"
    for pid in $PORT_PIDS; do
      echo -e "- 进程PID: ${pid}, 命令: $(ps -p $pid -o comm=)"
      kill -9 $pid 2>/dev/null
    done
    echo -e "✅ 端口3000已释放"
  else
    echo -e "✓ 端口3000当前空闲"
  fi
  
  # 查找所有React脚本相关进程
  echo -e "查找React相关进程..."
  REACT_PIDS=$(ps aux | grep -E "react-scripts|webpack|node.*start" | grep -v grep | awk '{print $2}')
  if [ -n "$REACT_PIDS" ]; then
    echo -e "找到React相关进程:"
    for pid in $REACT_PIDS; do
      echo -e "- 进程PID: ${pid}, 命令: $(ps -p $pid -o comm=)"
      kill -9 $pid 2>/dev/null
    done
    echo -e "✅ React相关进程已终止"
  else
    echo -e "✓ 未发现React相关进程"
  fi
  
  # 查找npm进程
  echo -e "查找npm相关进程..."
  NPM_PIDS=$(ps aux | grep -E "npm (start|run|test)" | grep -v grep | awk '{print $2}')
  if [ -n "$NPM_PIDS" ]; then
    echo -e "找到npm相关进程:"
    for pid in $NPM_PIDS; do
      echo -e "- 进程PID: ${pid}, 命令: $(ps -p $pid -o comm=)"
      kill -9 $pid 2>/dev/null
    done
    echo -e "✅ npm相关进程已终止"
  else
    echo -e "✓ 未发现npm相关进程"
  fi
  
  # 额外查找可能的node进程
  echo -e "查找其他可能的node进程..."
  NODE_PIDS=$(ps aux | grep -E "node.*frontend" | grep -v grep | awk '{print $2}')
  if [ -n "$NODE_PIDS" ]; then
    echo -e "找到其他node进程:"
    for pid in $NODE_PIDS; do
      echo -e "- 进程PID: ${pid}, 命令: $(ps -p $pid -o comm=)"
      kill -9 $pid 2>/dev/null
    done
    echo -e "✅ 相关node进程已终止"
  else
    echo -e "✓ 未发现额外node进程"
  fi
  
  # 等待一下确保所有进程已终止
  sleep 2
  
  # 再次检查确保端口已释放
  if [ -n "$(lsof -i :3000 -t 2>/dev/null)" ]; then
    echo -e "${RED}警告: 端口3000仍被占用，可能需要手动终止进程${NC}"
  else
    echo -e "${GREEN}✅ 所有进程已停止，端口3000已释放${NC}"
  fi
}

# 处理命令行参数
if [ "$1" = "stop" ]; then
  stop_all_processes
  
  # 恢复环境变量(如果存在备份)
  if [ -f ".env.backup" ]; then
    echo -e "\n恢复原始环境变量..."
    mv .env.backup .env
    echo -e "✅ 原始环境变量已恢复"
  fi
  
  echo -e "\n${GREEN}测试服务已成功停止${NC}"
  exit 0
fi

# 首先停止所有可能存在的进程
echo -e "\n${YELLOW}第一步: 终止所有现有服务...${NC}"
stop_all_processes

# 准备测试环境变量
echo -e "\n${YELLOW}第二步: 准备测试环境...${NC}"

# 创建或更新.env文件，确保测试模式开启
if [ -f ".env" ]; then
  # 备份原始.env文件
  cp .env .env.backup
  
  # 确保包含测试模式
  if ! grep -q "REACT_APP_TEST_MODE" .env; then
    echo "REACT_APP_TEST_MODE=true" >> .env
    echo -e "✅ 已添加测试模式环境变量"
  else
    # 确保值为true
    sed -i 's/REACT_APP_TEST_MODE=.*/REACT_APP_TEST_MODE=true/' .env
    echo -e "✅ 已更新测试模式环境变量"
  fi
else
  # 创建新的.env文件
  echo "REACT_APP_TEST_MODE=true" > .env
  echo -e "✅ 已创建测试模式环境变量文件"
fi

# 创建测试日志目录
mkdir -p logs
TEST_LOG_FILE="logs/frontend_test_$(date '+%Y%m%d_%H%M%S').log"
echo -e "测试日志将保存到: ${TEST_LOG_FILE}"

# 检查npm和node版本
echo -e "\n${YELLOW}检查环境...${NC}"
echo -e "Node版本: $(node -v)"
echo -e "NPM版本: $(npm -v)"

# 启动应用于测试模式
echo -e "\n${YELLOW}第三步: 启动应用于测试模式...${NC}"
echo -e "启动命令: BROWSER=none npm start"

# 使用nohup确保进程在后台持续运行，并设置BROWSER=none防止自动打开浏览器
BROWSER=none nohup npm start > $TEST_LOG_FILE 2>&1 &
APP_PID=$!

echo -e "应用启动中，主进程PID: ${APP_PID}"
echo -e "等待应用启动完成 (最多20秒)..."

# 等待应用启动，最多等待20秒
MAX_WAIT=20
for i in $(seq 1 $MAX_WAIT); do
  if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ 应用已成功启动 (等待时间: ${i}秒)${NC}"
    break
  fi
  
  # 如果到达最后一次尝试仍未成功
  if [ $i -eq $MAX_WAIT ]; then
    echo -e "${RED}❌ 应用可能启动失败，请检查${TEST_LOG_FILE}${NC}"
    echo -e "最近的日志:"
    tail -n 20 $TEST_LOG_FILE
    echo -e "尝试终止可能的僵尸进程..."
    stop_all_processes
    exit 1
  fi
  
  echo -e "等待中... (${i}/${MAX_WAIT})"
  sleep 1
done

# 运行测试
echo -e "\n${YELLOW}第四步: 运行自动化测试...${NC}"
echo -e "正在打开测试页面: http://localhost:3000/test"

# 尝试使用可用的浏览器打开测试页面
if command -v google-chrome &> /dev/null; then
  google-chrome http://localhost:3000/test &
elif command -v firefox &> /dev/null; then
  firefox http://localhost:3000/test &
elif command -v chromium-browser &> /dev/null; then
  chromium-browser http://localhost:3000/test &
elif command -v brave-browser &> /dev/null; then
  brave-browser http://localhost:3000/test &
elif command -v open &> /dev/null; then
  open http://localhost:3000/test &
elif command -v xdg-open &> /dev/null; then
  xdg-open http://localhost:3000/test &
else
  echo -e "${YELLOW}⚠️ 无法自动打开浏览器，请手动访问: http://localhost:3000/test${NC}"
fi

echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}✅ 测试环境已准备完成${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "- 应用运行在: ${BLUE}http://localhost:3000${NC}"
echo -e "- 测试页面位于: ${BLUE}http://localhost:3000/test${NC}"
echo -e "- 测试日志保存在: ${BLUE}${TEST_LOG_FILE}${NC}"
echo -e "\n使用以下命令停止测试服务:"
echo -e "${YELLOW}  ./run-all-tests.sh stop${NC}"

# 捕获Ctrl+C信号，确保优雅退出
trap "echo -e '\n${YELLOW}接收到终止信号，正在清理资源...${NC}'; stop_all_processes; echo -e '${GREEN}✅ 清理完成${NC}'; exit 0" INT 