#!/bin/bash

# Echo AI前端一体化管理脚本
# 集成启动、监控、测试、构建等功能
# 用法: ./start-frontend.sh [command] [options]
#
# 主要功能:
# 1. 多模式启动: dev(开发,Mock), prod(生产), test(测试), mobile(移动端)
# 2. 进程管理: start, stop, restart, status
# 3. 开发工具: build, test, e2e, lint, deps
# 4. 监控工具: logs, monitor, health, cleanup
# 5. 环境管理: env, ports, reset
#
# 常用命令:
#   ./start-frontend.sh start dev    # 启动开发模式(Mock数据)
#   ./start-frontend.sh start prod   # 启动生产模式(真实后端)
#   ./start-frontend.sh status       # 查看服务状态
#   ./start-frontend.sh logs         # 查看日志
#   ./start-frontend.sh monitor      # 实时监控
#   ./start-frontend.sh health       # 健康检查
#   ./start-frontend.sh help         # 查看完整帮助
#
# 特性:
# - 智能端口分配(自动避免冲突)
# - 后端服务状态检查(启动前验证)
# - 结构化日志管理
# - 实时服务监控
# - 完整的环境重置
# - 多种测试支持

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # 无颜色

# 配置变量
FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"
LOG_DIR="$FRONTEND_DIR/logs"
PID_FILE="$LOG_DIR/frontend.pid"
DEFAULT_PORT=3001
DEV_PORT=3002
TEST_PORT=3003

# 后端配置
BACKEND_HOST="localhost"
BACKEND_PORT=8000
BACKEND_HEALTH_ENDPOINT="/health"
BACKEND_API_ENDPOINT="/api/v1/health"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 显示帮助信息
show_help() {
  echo -e "${BLUE}=====================================${NC}"
  echo -e "${BLUE}   Echo AI前端一体化管理工具        ${NC}"
  echo -e "${BLUE}=====================================${NC}"
  echo ""
  echo "用法: $0 [命令] [选项]"
  echo ""
  echo -e "${CYAN}核心命令:${NC}"
  echo "  start [mode]     启动前端服务"
  echo "    - prod         生产模式 (默认, 连接真实后端)"
  echo "    - dev          开发模式 (启用Mock)"
  echo "    - test         测试模式 (自动化测试)"
  echo "    - mobile       移动端优化模式"
  echo "  stop             停止所有前端服务"
  echo "  restart [mode]   重启服务"
  echo "  status           查看服务状态"
  echo ""
  echo -e "${CYAN}开发工具:${NC}"
  echo "  build            构建生产版本"
  echo "  test             运行单元测试"
  echo "  e2e              运行E2E测试"
  echo "  lint             代码检查"
  echo "  deps             安装/更新依赖"
  echo ""
  echo -e "${CYAN}监控工具:${NC}"
  echo "  logs [lines]     查看日志 (默认50行)"
  echo "  monitor          实时监控服务状态"
  echo "  health           健康检查"
  echo "  cleanup          清理临时文件和进程"
  echo ""
  echo -e "${CYAN}环境管理:${NC}"
  echo "  env [show|edit]  环境变量管理"
  echo "  ports            查看端口占用情况"
  echo "  reset            重置开发环境"
  echo ""
  echo -e "${YELLOW}示例:${NC}"
  echo "  $0 start prod    # 启动生产模式 (默认)"
  echo "  $0 start dev     # 启动开发模式 (Mock数据)"
  echo "  $0 test          # 运行测试"
  echo "  $0 monitor       # 实时监控"
  echo "  $0 logs 100      # 查看最近100行日志"
}

# 检查是否在正确目录
check_directory() {
  if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}错误: 未找到frontend目录${NC}"
    echo "请确保在项目根目录运行此脚本"
    exit 1
  fi
  cd "$FRONTEND_DIR"
}

# 检查依赖
check_dependencies() {
  # 只在明确需要时才安装依赖，避免每次启动都检查
  if [ ! -d "node_modules" ] && [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}🔍 未检测到node_modules和package-lock.json，正在安装依赖...${NC}"
    npm install
    if [ $? -ne 0 ]; then
      echo -e "${RED}❌ 依赖安装失败${NC}"
      exit 1
    fi
  elif [ ! -d "node_modules" ] && [ -f "package-lock.json" ]; then
    echo -e "${YELLOW}🔍 检测到package-lock.json但缺少node_modules，使用npm ci快速安装...${NC}"
    npm ci
    if [ $? -ne 0 ]; then
      echo -e "${RED}❌ 依赖安装失败${NC}"
      exit 1
    fi
  fi
}

# 查找并停止所有相关进程
stop_all_processes() {
  echo -e "${YELLOW}正在停止所有前端相关进程...${NC}"
  
  # 停止指定端口的进程
  for port in $DEFAULT_PORT $DEV_PORT $TEST_PORT; do
    local pids=$(lsof -i :$port -t 2>/dev/null)
    if [ -n "$pids" ]; then
      echo -e "停止端口 $port 上的进程: $pids"
      kill -9 $pids 2>/dev/null
    fi
  done
  
  # 停止React相关进程
  local react_pids=$(ps aux | grep -E "react-scripts|webpack|npm.*start" | grep -v grep | awk '{print $2}')
  if [ -n "$react_pids" ]; then
    echo -e "停止React相关进程: $react_pids"
    kill -9 $react_pids 2>/dev/null
  fi
  
  # 清理PID文件
  [ -f "$PID_FILE" ] && rm -f "$PID_FILE"
  
  sleep 2
  echo -e "${GREEN}✅ 所有进程已停止${NC}"
}

# 检查服务状态
check_status() {
  local port=${1:-$DEFAULT_PORT}
  local pid=$(lsof -i :$port -t 2>/dev/null)
  
  if [ -n "$pid" ]; then
    echo -e "${GREEN}✅ 前端服务正在运行${NC}"
    echo -e "端口: $port, PID: $pid"
    echo -e "访问地址: ${BLUE}http://localhost:$port${NC}"
    return 0
  else
    echo -e "${RED}❌ 前端服务未运行${NC}"
    return 1
  fi
}

# 获取可用端口
get_available_port() {
  local start_port=${1:-$DEFAULT_PORT}
  local port=$start_port
  
  while lsof -i :$port >/dev/null 2>&1; do
    port=$((port + 1))
  done
  
  echo $port
}

# 检查后端服务状态
check_backend_status() {
  local mode=${1:-prod}
  
  # 如果是dev模式且使用Mock数据，跳过后端检查
  if [ "$mode" = "dev" ]; then
    echo -e "${YELLOW}🔄 开发模式使用Mock数据，跳过后端检查${NC}"
    return 0
  fi
  
  echo -e "${BLUE}🔍 检查后端服务状态...${NC}"
  
  # 动态检测后端进程
  local backend_processes=$(ps aux | grep -E "(uvicorn.*app\.main|fastapi|python.*main\.py|start-backend)" | grep -v grep)
  
  if [ -z "$backend_processes" ]; then
    echo -e "${RED}❌ 未检测到后端服务进程${NC}"
    echo -e "${YELLOW}请先启动后端服务:${NC}"
    echo -e "  cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port <任意端口>"
    echo -e "  或使用: ./start-backend.sh"
    return 1
  fi
  
  echo -e "${GREEN}✅ 检测到后端服务进程${NC}"
  
  # 尝试动态检测后端监听的端口
  local backend_ports=$(netstat -tlnp 2>/dev/null | grep python | grep LISTEN | awk '{print $4}' | cut -d: -f2 | sort -u)
  
  if [ -z "$backend_ports" ]; then
    echo -e "${YELLOW}⚠️  后端进程运行中，但未检测到监听端口，可能正在启动中${NC}"
    return 0
  fi
  
  # 尝试在检测到的端口上进行健康检查
  local health_check_passed=false
  for port in $backend_ports; do
    echo -e "检测到后端监听端口: $port"
    
    # 尝试健康检查端点
    local health_url="http://${BACKEND_HOST}:${port}${BACKEND_HEALTH_ENDPOINT}"
    local api_url="http://${BACKEND_HOST}:${port}${BACKEND_API_ENDPOINT}"
    
    if curl -s --connect-timeout 2 --max-time 3 "$health_url" >/dev/null 2>&1; then
      echo -e "  ${GREEN}✅ 端口 $port 健康检查通过${NC}"
      health_check_passed=true
      break
    elif curl -s --connect-timeout 2 --max-time 3 "$api_url" >/dev/null 2>&1; then
      echo -e "  ${GREEN}✅ 端口 $port API端点响应正常${NC}"
      health_check_passed=true
      break
    else
      echo -e "  ${YELLOW}⚠️  端口 $port 暂未响应API请求${NC}"
    fi
  done
  
  if [ "$health_check_passed" = true ]; then
    echo -e "${GREEN}✅ 后端服务健康检查通过${NC}"
  else
    echo -e "${YELLOW}⚠️  后端服务进程运行中，但API暂未响应，继续启动前端${NC}"
  fi
  
  return 0
}

# 启动服务
start_service() {
  local mode=${1:-prod}
  local port
  local log_file
  local npm_script
  local env_vars=""
  
  # 检查端口冲突并自动清理
  echo -e "${CYAN}🔍 检查端口冲突...${NC}"
  local ports_in_use=()
  
  # 检查所有可能的前端端口
  for check_port in $DEFAULT_PORT $DEV_PORT $TEST_PORT; do
    local pid=$(lsof -i :$check_port -t 2>/dev/null)
    if [ -n "$pid" ]; then
      ports_in_use+=("$check_port")
      echo -e "${YELLOW}⚠️  检测到端口 $check_port 被占用 (PID: $pid)${NC}"
    fi
  done
  
  # 如果有端口冲突，自动清理
  if [ ${#ports_in_use[@]} -gt 0 ]; then
    echo -e "${YELLOW}🧹 自动清理现有前端服务...${NC}"
    stop_all_processes
    sleep 2
    
    # 再次检查是否清理成功
    for check_port in "${ports_in_use[@]}"; do
      local pid=$(lsof -i :$check_port -t 2>/dev/null)
      if [ -n "$pid" ]; then
        echo -e "${RED}❌ 端口 $check_port 仍被占用，强制终止进程 $pid${NC}"
        kill -9 $pid 2>/dev/null
      fi
    done
    echo -e "${GREEN}✅ 端口冲突已解决${NC}"
  else
    echo -e "${GREEN}✅ 无端口冲突${NC}"
  fi
  
  # 首先检查后端状态（除非是dev模式）
  if ! check_backend_status "$mode"; then
    echo -e "${RED}❌ 后端服务检查失败，无法启动前端服务${NC}"
    exit 1
  fi
  
  case $mode in
    "dev")
      port=$(get_available_port $DEV_PORT)
      npm_script="start:dev"
      env_vars="REACT_APP_USE_MOCKS=true"
      echo -e "${BLUE}🚀 启动开发模式 (Mock数据)${NC}"
      ;;
    "prod")
      port=$(get_available_port $DEFAULT_PORT)
      npm_script="start"
      env_vars="REACT_APP_USE_MOCKS=false"
      echo -e "${BLUE}🚀 启动生产模式 (真实后端)${NC}"
      ;;
    "test")
      port=$(get_available_port $TEST_PORT)
      npm_script="start"
      env_vars="REACT_APP_USE_MOCKS=true REACT_APP_TEST_MODE=true"
      echo -e "${BLUE}🚀 启动测试模式${NC}"
      ;;
    "mobile")
      port=$(get_available_port $DEFAULT_PORT)
      npm_script="start:mobile"
      env_vars="REACT_APP_USE_MOCKS=false"
      echo -e "${BLUE}🚀 启动移动端模式${NC}"
      ;;
    *)
      echo -e "${RED}错误: 未知的启动模式 '$mode'${NC}"
      echo "支持的模式: dev, prod, test, mobile"
      exit 1
      ;;
  esac
  
  log_file="$LOG_DIR/frontend_${mode}_$(date +%Y%m%d_%H%M%S).log"
  
  echo -e "端口: $port"
  echo -e "日志: $log_file"
  echo -e "模式: $mode"
  
  # 设置环境变量并启动
  export PORT=$port
  export BROWSER=none
  
  # 启动服务
  env $env_vars nohup npm run $npm_script > "$log_file" 2>&1 &
  local pid=$!
  
  # 保存PID
  echo "$pid:$port:$mode" > "$PID_FILE"
  
  echo -e "${YELLOW}等待服务启动...${NC}"
  
  # 等待服务启动
  local max_wait=30
  for i in $(seq 1 $max_wait); do
    if curl -s "http://localhost:$port" >/dev/null 2>&1; then
      echo -e "${GREEN}✅ 服务启动成功 (${i}秒)${NC}"
      echo -e "访问地址: ${BLUE}http://localhost:$port${NC}"
      return 0
    fi
    
    if [ $i -eq $max_wait ]; then
      echo -e "${RED}❌ 服务启动超时${NC}"
      echo -e "请查看日志: $log_file"
      tail -n 20 "$log_file"
      return 1
    fi
    
    sleep 1
  done
}

# 运行测试
run_tests() {
  local test_type=${1:-unit}
  
  case $test_type in
    "unit")
      echo -e "${BLUE}🧪 运行单元测试${NC}"
      npm test -- --coverage --watchAll=false
      ;;
    "e2e")
      echo -e "${BLUE}🧪 运行E2E测试${NC}"
      # 确保服务运行
      if ! check_status >/dev/null 2>&1; then
        echo -e "${YELLOW}启动测试服务...${NC}"
        start_service test
        sleep 5
      fi
      npm run cy:run
      ;;
    "all")
      echo -e "${BLUE}🧪 运行所有测试${NC}"
      run_tests unit
      run_tests e2e
      ;;
    *)
      echo -e "${RED}错误: 未知的测试类型 '$test_type'${NC}"
      echo "支持的类型: unit, e2e, all"
      exit 1
      ;;
  esac
}

# 构建项目
build_project() {
  echo -e "${BLUE}🏗️  构建生产版本${NC}"
  npm run build
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 构建成功${NC}"
    echo -e "构建文件位于: ${BLUE}$FRONTEND_DIR/build${NC}"
  else
    echo -e "${RED}❌ 构建失败${NC}"
    exit 1
  fi
}

# 查看日志
view_logs() {
  local lines=${1:-50}
  local latest_log=$(ls -t "$LOG_DIR"/frontend_*.log 2>/dev/null | head -n1)
  
  if [ -n "$latest_log" ]; then
    echo -e "${BLUE}📋 最新日志 (最近${lines}行):${NC}"
    echo -e "文件: $latest_log"
    echo -e "${YELLOW}----------------------------------------${NC}"
    tail -n "$lines" "$latest_log"
  else
    echo -e "${YELLOW}⚠️  未找到日志文件${NC}"
  fi
}

# 实时监控
monitor_service() {
  echo -e "${BLUE}📊 实时监控前端服务 (按Ctrl+C退出)${NC}"
  echo -e "${YELLOW}----------------------------------------${NC}"
  
  while true; do
    clear
    echo -e "${BLUE}Echo AI前端服务监控 - $(date)${NC}"
    echo -e "${YELLOW}========================================${NC}"
    
    # 服务状态
    check_status
    echo ""
    
    # 端口占用情况
    echo -e "${CYAN}端口占用情况:${NC}"
    for port in $DEFAULT_PORT $DEV_PORT $TEST_PORT; do
      local pid=$(lsof -i :$port -t 2>/dev/null)
      if [ -n "$pid" ]; then
        echo -e "  端口 $port: ${GREEN}占用${NC} (PID: $pid)"
      else
        echo -e "  端口 $port: ${RED}空闲${NC}"
      fi
    done
    echo ""
    
    # 系统资源
    echo -e "${CYAN}系统资源:${NC}"
    echo -e "  CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    echo -e "  内存: $(free -h | awk '/^Mem:/ {print $3"/"$2}')"
    echo ""
    
    # 最新日志
    echo -e "${CYAN}最新日志 (最近5行):${NC}"
    local latest_log=$(ls -t "$LOG_DIR"/frontend_*.log 2>/dev/null | head -n1)
    if [ -n "$latest_log" ]; then
      tail -n 5 "$latest_log" | sed 's/^/  /'
    else
      echo -e "  ${YELLOW}无日志文件${NC}"
    fi
    
    sleep 5
  done
}

# 健康检查
health_check() {
  echo -e "${BLUE}🏥 前端服务健康检查${NC}"
  echo -e "${YELLOW}----------------------------------------${NC}"
  
  local issues=0
  
  # 检查Node.js版本
  echo -e "${CYAN}Node.js版本:${NC} $(node -v)"
  
  # 检查npm版本
  echo -e "${CYAN}npm版本:${NC} $(npm -v)"
  
  # 检查依赖
  if [ -d "node_modules" ]; then
    echo -e "${CYAN}依赖状态:${NC} ${GREEN}已安装${NC}"
  else
    echo -e "${CYAN}依赖状态:${NC} ${RED}未安装${NC}"
    issues=$((issues + 1))
  fi
  
  # 检查后端服务状态
  echo -e "${CYAN}后端服务:${NC}"
  if check_backend_status "prod" >/dev/null 2>&1; then
    echo -e "  ${GREEN}✅ 后端服务正常${NC}"
  else
    echo -e "  ${RED}❌ 后端服务异常${NC}"
    issues=$((issues + 1))
  fi
  
  # 检查前端服务状态
  if check_status >/dev/null 2>&1; then
    echo -e "${CYAN}前端服务:${NC} ${GREEN}运行中${NC}"
  else
    echo -e "${CYAN}前端服务:${NC} ${RED}未运行${NC}"
    issues=$((issues + 1))
  fi
  
  # 检查磁盘空间
  local disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
  if [ "$disk_usage" -gt 90 ]; then
    echo -e "${CYAN}磁盘空间:${NC} ${RED}${disk_usage}% (警告)${NC}"
    issues=$((issues + 1))
  else
    echo -e "${CYAN}磁盘空间:${NC} ${GREEN}${disk_usage}%${NC}"
  fi
  
  echo -e "${YELLOW}----------------------------------------${NC}"
  if [ $issues -eq 0 ]; then
    echo -e "${GREEN}✅ 健康检查通过${NC}"
  else
    echo -e "${RED}❌ 发现 $issues 个问题${NC}"
  fi
}

# 清理环境
cleanup_environment() {
  echo -e "${BLUE}🧹 清理开发环境${NC}"
  
  # 停止所有进程
  stop_all_processes
  
  # 清理日志文件 (保留最近10个)
  echo -e "清理旧日志文件..."
  ls -t "$LOG_DIR"/frontend_*.log 2>/dev/null | tail -n +11 | xargs rm -f
  
  # 清理临时文件
  echo -e "清理临时文件..."
  rm -rf "$FRONTEND_DIR/.tmp" "$FRONTEND_DIR/build" 2>/dev/null
  
  echo -e "${GREEN}✅ 清理完成${NC}"
}

# 环境变量管理
manage_env() {
  local action=${1:-show}
  local env_file="$FRONTEND_DIR/.env"
  
  case $action in
    "show")
      echo -e "${BLUE}📋 当前环境变量:${NC}"
      if [ -f "$env_file" ]; then
        cat "$env_file"
      else
        echo -e "${YELLOW}⚠️  .env文件不存在${NC}"
      fi
      ;;
    "edit")
      echo -e "${BLUE}✏️  编辑环境变量${NC}"
      ${EDITOR:-nano} "$env_file"
      ;;
    *)
      echo -e "${RED}错误: 未知的环境变量操作 '$action'${NC}"
      echo "支持的操作: show, edit"
      exit 1
      ;;
  esac
}

# 查看端口占用
check_ports() {
  echo -e "${BLUE}🔌 端口占用情况${NC}"
  echo -e "${YELLOW}----------------------------------------${NC}"
  
  for port in $DEFAULT_PORT $DEV_PORT $TEST_PORT; do
    local pid=$(lsof -i :$port -t 2>/dev/null)
    if [ -n "$pid" ]; then
      local cmd=$(ps -p $pid -o comm= 2>/dev/null)
      echo -e "端口 $port: ${GREEN}占用${NC} (PID: $pid, 命令: $cmd)"
    else
      echo -e "端口 $port: ${RED}空闲${NC}"
    fi
  done
}

# 重置开发环境
reset_environment() {
  echo -e "${YELLOW}⚠️  这将重置整个开发环境，包括:${NC}"
  echo -e "  - 停止所有服务"
  echo -e "  - 删除node_modules"
  echo -e "  - 清理所有日志"
  echo -e "  - 重新安装依赖"
  echo ""
  read -p "确定要继续吗? (y/N): " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🔄 重置开发环境${NC}"
    
    # 停止服务
    stop_all_processes
    
    # 删除node_modules
    echo -e "删除node_modules..."
    rm -rf "$FRONTEND_DIR/node_modules"
    
    # 清理日志
    echo -e "清理日志文件..."
    rm -rf "$LOG_DIR"/*
    
    # 重新安装依赖
    echo -e "重新安装依赖..."
    npm install
    
    echo -e "${GREEN}✅ 环境重置完成${NC}"
  else
    echo -e "${YELLOW}操作已取消${NC}"
  fi
}

# 主函数
main() {
  # 检查目录
  check_directory
  
  # 如果没有参数，显示帮助
  if [ $# -eq 0 ]; then
    show_help
    exit 0
  fi
  
  local command=$1
  shift
  
  case $command in
    "start")
      check_dependencies
      local mode=${1:-prod}
      if check_status >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  服务已在运行，使用 restart 重启${NC}"
      else
        start_service "$mode"
      fi
      ;;
    "stop")
      stop_all_processes
      ;;
    "restart")
      local mode=${1:-prod}
      echo -e "${BLUE}🔄 重启服务${NC}"
      stop_all_processes
      sleep 2
      check_dependencies
      start_service "$mode"
      ;;
    "status")
      check_status
      ;;
    "build")
      check_dependencies
      build_project
      ;;
    "test")
      check_dependencies
      local test_type=${1:-unit}
      run_tests "$test_type"
      ;;
    "e2e")
      check_dependencies
      run_tests "e2e"
      ;;
    "lint")
      echo -e "${BLUE}🔍 代码检查${NC}"
      npm run lint 2>/dev/null || echo -e "${YELLOW}⚠️  未配置lint脚本${NC}"
      ;;
    "deps")
      echo -e "${BLUE}📦 安装/更新依赖${NC}"
      npm install
      ;;
    "logs")
      local lines=${1:-50}
      view_logs "$lines"
      ;;
    "monitor")
      monitor_service
      ;;
    "health")
      health_check
      ;;
    "cleanup")
      cleanup_environment
      ;;
    "env")
      local action=${1:-show}
      manage_env "$action"
      ;;
    "ports")
      check_ports
      ;;
    "reset")
      reset_environment
      ;;
    "help")
      show_help
      ;;
    *)
      echo -e "${RED}错误: 未知命令 '$command'${NC}"
      echo -e "使用 '$0 help' 查看帮助信息"
      exit 1
      ;;
  esac
}

# 执行主函数
main "$@"