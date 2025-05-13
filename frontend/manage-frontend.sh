#!/bin/bash

# 前端服务管理脚本
# 用法: ./manage-frontend.sh [start|stop|restart|status]

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 显示帮助信息
show_help() {
  echo -e "${BLUE}全语音AI-Agent平台前端服务管理脚本${NC}"
  echo "用法: $0 [选项]"
  echo ""
  echo "选项:"
  echo "  start     启动前端服务"
  echo "  stop      停止前端服务"
  echo "  restart   重启前端服务"
  echo "  status    查看服务状态"
  echo "  help      显示此帮助信息"
  echo ""
  echo "示例:"
  echo "  $0 start    # 启动服务"
  echo "  $0 stop     # 停止服务"
}

# 检查服务状态
check_status() {
  REACT_PID=$(lsof -i :3000 -t 2>/dev/null)
  REACT_SCRIPTS_PIDS=$(ps aux | grep "react-scripts" | grep -v grep | awk '{print $2}')
  
  if [ -n "$REACT_PID" ]; then
    echo -e "${GREEN}✅ 前端服务正在运行${NC}"
    echo -e "端口: 3000, PID: ${REACT_PID}"
    return 0
  elif [ -n "$REACT_SCRIPTS_PIDS" ]; then
    echo -e "${YELLOW}⚠️  检测到React脚本进程，但端口3000未被占用${NC}"
    echo -e "进程列表: ${REACT_SCRIPTS_PIDS}"
    return 1
  else
    echo -e "${RED}❌ 前端服务未运行${NC}"
    return 2
  fi
}

# 停止服务
stop_service() {
  echo -e "${YELLOW}正在停止前端服务...${NC}"
  
  # 查找占用3000端口的进程
  REACT_PID=$(lsof -i :3000 -t 2>/dev/null)
  
  if [ -n "$REACT_PID" ]; then
    echo -e "找到运行在端口3000的服务，PID: ${REACT_PID}，正在关闭..."
    kill -9 $REACT_PID
    sleep 1
    echo -e "${GREEN}✅ 端口3000已释放${NC}"
  fi
  
  # 查找其他可能存在的React脚本进程
  REACT_SCRIPTS_PIDS=$(ps aux | grep "react-scripts" | grep -v grep | awk '{print $2}')
  
  if [ -n "$REACT_SCRIPTS_PIDS" ]; then
    echo -e "找到额外的React脚本进程，正在关闭..."
    for pid in $REACT_SCRIPTS_PIDS; do
      echo -e "关闭进程 PID: ${pid}"
      kill -9 $pid 2>/dev/null
    done
    echo -e "${GREEN}✅ 所有React相关进程已关闭${NC}"
  fi
  
  echo -e "${GREEN}前端服务已停止${NC}"
}

# 启动服务
start_service() {
  echo -e "${BLUE}=== 正在启动全语音AI-Agent平台（移动端界面）===${NC}"
  
  # 确保已安装依赖
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}未检测到node_modules，正在安装依赖...${NC}"
    npm install
  fi
  
  # 设置环境变量
  export PORT=3000 # 指定端口
  export REACT_APP_BROWSER=none # 阻止自动打开浏览器
  
  echo -e "${BLUE}正在启动前端服务，端口: 3000...${NC}"
  
  # 使用nohup确保进程在后台持续运行
  nohup npm run start:mobile > frontend.log 2>&1 &
  
  # 记录进程ID
  FRONTEND_PID=$!
  echo -e "启动的进程ID: ${FRONTEND_PID}"
  
  # 给服务一些启动时间
  echo -e "${YELLOW}等待服务启动 (5秒)...${NC}"
  sleep 5
  
  # 检查是否成功启动
  if check_status > /dev/null; then
    echo -e "${GREEN}✅ 前端服务已成功启动${NC}"
    echo -e "访问地址: ${BLUE}http://localhost:3000${NC}"
    echo -e "日志文件: ${YELLOW}$(pwd)/frontend.log${NC}"
  else
    echo -e "${RED}❌ 前端服务可能启动失败${NC}"
    echo -e "请查看日志文件: ${YELLOW}$(pwd)/frontend.log${NC}"
    echo -e "最近10行日志:"
    tail -n 10 frontend.log
  fi
}

# 主函数
main() {
  # 如果没有传参数，显示帮助信息
  if [ $# -eq 0 ]; then
    show_help
    exit 0
  fi
  
  case "$1" in
    start)
      # 检查服务是否已运行
      if check_status > /dev/null; then
        echo -e "${YELLOW}⚠️  前端服务已经在运行中${NC}"
        echo -e "如需重启，请使用: $0 restart"
      else
        start_service
      fi
      ;;
    stop)
      stop_service
      ;;
    restart)
      echo -e "${BLUE}正在重启前端服务...${NC}"
      stop_service
      sleep 2
      start_service
      ;;
    status)
      check_status
      ;;
    help)
      show_help
      ;;
    *)
      echo -e "${RED}错误: 未知的命令 '$1'${NC}"
      show_help
      exit 1
      ;;
  esac
}

# 执行主函数
main "$@" 