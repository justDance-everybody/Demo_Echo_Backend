#!/bin/bash
# 运行后端服务，设置正确的PYTHONPATH以包含MCP_Client/src目录

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在项目根目录运行
if [ ! -d "backend" ] || [ ! -d "MCP_Client" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    echo "例如: cd /path/to/project && ./backend/run_with_log.sh"
    exit 1
fi

# 创建日志目录
mkdir -p backend/logs

# 日志文件路径
LOG_FILE="backend/logs/backend_$(date +%Y%m%d_%H%M%S).log"

echo -e "${GREEN}正在启动后端服务...${NC}"
echo -e "${YELLOW}日志文件: ${LOG_FILE}${NC}"

# 设置PYTHONPATH以包含MCP_Client/src目录
export PYTHONPATH=$PYTHONPATH:$(pwd)/MCP_Client/src

# 启动后端服务
cd backend && python -m app.main 2>&1 | tee $LOG_FILE

# 如果服务意外退出，显示错误信息
if [ $? -ne 0 ]; then
    echo -e "${RED}服务异常退出，请检查日志文件${NC}"
    exit 1
fi 