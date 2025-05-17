#!/bin/bash

# 设置颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}启动Echo前端开发服务器...${NC}"

# 切换到前端目录
cd "$(dirname "$0")"

# 创建日志目录
mkdir -p logs

# 设置日志文件名（包含时间戳）
LOG_FILE="logs/frontend_$(date +%Y%m%d_%H%M%S).log"

# 检查端口是否被占用
PORT=3000
lsof -i :$PORT > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo -e "${BLUE}端口 $PORT 已被占用，尝试使用其他端口...${NC}"
  PORT=3001
  
  lsof -i :$PORT > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    PORT=3002
  fi
  
  echo -e "${BLUE}将使用端口 $PORT${NC}"
fi

# 确保环境变量设置
export PORT=$PORT

# 启动开发服务器并重定向输出到日志文件
echo -e "${BLUE}开发服务器日志将保存到: $LOG_FILE${NC}"
echo -e "${GREEN}前端服务器启动在: http://localhost:$PORT${NC}"
echo -e "${GREEN}测试页面地址: http://localhost:$PORT/test${NC}"

npm start > "$LOG_FILE" 2>&1 