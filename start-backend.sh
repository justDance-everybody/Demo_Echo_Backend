#!/bin/bash
# AI Assistant Backend 一键启动脚本
# 集成服务监控、冲突处理、自动重启等功能
# 状态: ✅ 已修复 - 脚本可正常使用

# 启用严格错误处理
set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置参数
SERVICE_NAME="AI Assistant Backend"
BACKEND_DIR="$(pwd)/backend"

# 从.env文件读取端口配置，默认3000
env_file="$(pwd)/backend/.env"
if [ -f "$env_file" ]; then
    SERVICE_PORT=$(grep "^PORT=" "$env_file" | cut -d'=' -f2)
fi
if [ -z "$SERVICE_PORT" ]; then
    SERVICE_PORT=3000
fi

# 设置健康检查URL
HEALTH_CHECK_URL="http://localhost:${SERVICE_PORT}/health"

CHECK_INTERVAL=30
MAX_RESTART_ATTEMPTS=5
RESTART_DELAY=5
STARTUP_TIMEOUT=30
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_INTERVAL=2
LOG_DIR="$(pwd)/logs"
BACKEND_LOG_DIR="${BACKEND_DIR}/logs"
PID_FILE="${LOG_DIR}/backend.pid"
LOCK_FILE="${LOG_DIR}/backend.lock"
MAIN_LOG="${LOG_DIR}/backend_manager.log"
MAX_LOG_SIZE=10485760  # 10MB
MAX_LOG_FILES=5
CLEANUP_IN_PROGRESS=false
CURRENT_MODE=""

# 创建必要的目录
mkdir -p "$LOG_DIR" "$BACKEND_LOG_DIR"

# 验证环境
validate_environment() {
    # 检查Python版本
    if ! command -v python >/dev/null 2>&1; then
        log_message "ERROR" "Python未安装或不在PATH中"
        return 1
    fi
    
    local python_version=$(python --version 2>&1 | cut -d' ' -f2)
    local major_version=$(echo ${python_version} | cut -d'.' -f1)
    local minor_version=$(echo ${python_version} | cut -d'.' -f2)
    
    if [ "${major_version}" -lt 3 ] || ([ "${major_version}" -eq 3 ] && [ "${minor_version}" -lt 8 ]); then
        log_message "ERROR" "需要Python 3.8或更高版本，当前版本: ${python_version}"
        return 1
    fi
    
    # 检查后端目录
    if [ ! -d "$BACKEND_DIR" ]; then
        log_message "ERROR" "后端目录不存在: $BACKEND_DIR"
        return 1
    fi
    
    # 从.env文件读取虚拟环境路径
    local env_file="$(pwd)/backend/.env"
    if [ -f "$env_file" ]; then
        local venv_path=$(grep "^VIRTUAL_ENV_PATH=" "$env_file" | cut -d'=' -f2)
        if [ -z "$venv_path" ]; then
            log_message "ERROR" "未在.env文件中找到VIRTUAL_ENV_PATH配置"
            return 1
        fi
        
        log_message "INFO" "使用端口: $SERVICE_PORT"
    else
        log_message "ERROR" "backend/.env 文件不存在"
        return 1
    fi
    
    # 检查并激活虚拟环境
    if [ -z "${VIRTUAL_ENV:-}" ]; then
        if [ -f "$venv_path/bin/activate" ]; then
            log_message "INFO" "激活虚拟环境: $venv_path"
            source "$venv_path/bin/activate"
            if [ -z "${VIRTUAL_ENV:-}" ]; then
                log_message "ERROR" "虚拟环境激活失败"
                return 1
            fi
        else
            log_message "ERROR" "虚拟环境不存在: $venv_path"
            return 1
        fi
    fi
    
    # 检查端口范围
    if [ "${SERVICE_PORT}" -lt 1024 ] || [ "${SERVICE_PORT}" -gt 65535 ]; then
        log_message "ERROR" "端口号无效: ${SERVICE_PORT} (应在1024-65535范围内)"
        return 1
    fi
    
    return 0
}

# 日志轮转函数
rotate_log() {
    local log_file="$1"
    
    if [ -f "$log_file" ] && [ $(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo 0) -gt ${MAX_LOG_SIZE} ]; then
        # 轮转日志文件
        for i in $(seq $((${MAX_LOG_FILES}-1)) -1 1); do
            if [ -f "${log_file}.$i" ]; then
                mv "${log_file}.$i" "${log_file}.$((i+1))"
            fi
        done
        
        if [ -f "$log_file" ]; then
            mv "$log_file" "${log_file}.1"
        fi
        
        # 删除过期的日志文件
        if [ -f "${log_file}.$((MAX_LOG_FILES+1))" ]; then
            rm -f "${log_file}.$((MAX_LOG_FILES+1))"
        fi
    fi
}

# 日志函数
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local log_entry="[$timestamp] [$level] $message"
    
    # 轮转日志
    rotate_log "$MAIN_LOG"
    
    # 输出到控制台
    case $level in
        "SUCCESS") echo -e "${GREEN}✓${NC} $message" ;;
        "ERROR") echo -e "${RED}✗${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}⚠${NC} $message" ;;
        "INFO") echo -e "${BLUE}ℹ${NC} $message" ;;
        "DEBUG") echo -e "${PURPLE}🔍${NC} $message" ;;
        *) echo "$message" ;;
    esac
    
    # 写入日志文件
    echo "$log_entry" >> "$MAIN_LOG"
}

# 显示横幅
show_banner() {
    echo -e "${CYAN}"
    echo "======================================"
    echo "    AI Assistant Backend Manager      "
    echo "======================================"
    echo -e "${NC}"
}

# 检查数据库连接
check_database_connection() {
    log_message "INFO" "检查数据库连接..."
    
    # 进入后端目录并激活虚拟环境
    cd "$BACKEND_DIR" || {
        log_message "ERROR" "无法进入后端目录: $BACKEND_DIR"
        return 1
    }
    
    # 检查虚拟环境
    if [ -z "$VIRTUAL_ENV" ]; then
        log_message "ERROR" "未检测到激活的虚拟环境，请先激活虚拟环境"
        return 1
    fi
    
    if [ ! -f "$VIRTUAL_ENV/bin/activate" ]; then
        log_message "ERROR" "虚拟环境路径无效: $VIRTUAL_ENV"
        return 1
    fi
    
    # 激活虚拟环境并测试数据库连接
    local db_check_result
    db_check_result=$(python -c "
import sys
sys.path.insert(0, '.')
try:
    from app.config import settings
    from sqlalchemy import create_engine, text
    from sqlalchemy.exc import OperationalError
    
    # 强制要求MySQL连接
    if not settings.DATABASE_URL.startswith('mysql'):
        print('ERROR: 数据库配置错误 - 必须使用MySQL数据库')
        sys.exit(1)
    
    # 测试数据库连接
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    with engine.connect() as conn:
        result = conn.execute(text('SELECT 1'))
        print('SUCCESS: 数据库连接正常')
except ImportError as e:
    print(f'ERROR: 缺少必要的Python包: {e}')
    sys.exit(1)
except OperationalError as e:
    print(f'ERROR: 数据库连接失败: {e}')
    sys.exit(1)
except Exception as e:
    print(f'ERROR: 数据库检查失败: {e}')
    sys.exit(1)
" 2>&1)
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$db_check_result" | grep -q "SUCCESS"; then
        log_message "SUCCESS" "数据库连接检查通过"
        return 0
    else
        log_message "ERROR" "数据库连接检查失败:"
        echo "$db_check_result" | while IFS= read -r line; do
            if [[ $line == ERROR:* ]]; then
                log_message "ERROR" "${line#ERROR: }"
            else
                echo "  $line"
            fi
        done
        log_message "INFO" "请检查以下配置:"
        log_message "INFO" "  1. 数据库服务是否正常运行"
        log_message "INFO" "  2. 数据库连接参数是否正确 (.env文件)"
        log_message "INFO" "  3. 网络连接是否正常"
        log_message "INFO" "  4. 数据库用户权限是否足够"
        return 1
    fi
}

# 并行检查依赖
check_dependencies() {
    log_message "INFO" "检查系统依赖..."
    
    local check_results=()
    local pids=()
    local temp_dir="$LOG_DIR/check_temp_$$"
    mkdir -p "$temp_dir"
    
    # 并行检查必要命令
    (
        local missing_commands=()
        local required_commands=("python3" "netstat" "lsof")
        for cmd in "${required_commands[@]}"; do
            if ! command -v "$cmd" &> /dev/null; then
                missing_commands+=("$cmd")
            fi
        done
        
        if [ ${#missing_commands[@]} -eq 0 ]; then
            echo "commands:ok" > "$temp_dir/commands"
        else
            echo "commands:error:缺少必要命令: ${missing_commands[*]}" > "$temp_dir/commands"
        fi
    ) &
    pids+=($!)
    
    # 并行检查目录和文件
    (
        local errors=()
        
        if [ ! -d "$BACKEND_DIR" ]; then
            errors+=("后端目录不存在: $BACKEND_DIR")
        fi
        
        if [ -z "$VIRTUAL_ENV" ] || [ ! -d "$VIRTUAL_ENV" ]; then
        errors+=("Python虚拟环境未激活或路径无效: $VIRTUAL_ENV")
        fi
        
        if [ ! -f "$BACKEND_DIR/app/main.py" ]; then
            errors+=("应用主文件不存在: $BACKEND_DIR/app/main.py")
        fi
        
        if [ ${#errors[@]} -eq 0 ]; then
            echo "files:ok" > "$temp_dir/files"
        else
            echo "files:error:${errors[*]}" > "$temp_dir/files"
        fi
        
        # 检查配置文件（警告级别）
        if [ ! -f "$BACKEND_DIR/.env" ]; then
            echo "config:warning:配置文件不存在: $BACKEND_DIR/.env，将使用默认配置" > "$temp_dir/config"
        else
            echo "config:ok" > "$temp_dir/config"
        fi
    ) &
    pids+=($!)
    
    # 并行检查网络工具
    (
        if command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1 || command -v nc >/dev/null 2>&1; then
            echo "network:ok" > "$temp_dir/network"
        else
            echo "network:warning:建议安装 curl、wget 或 nc 以获得更好的健康检查" > "$temp_dir/network"
        fi
    ) &
    pids+=($!)
    
    # 等待所有检查完成
    for pid in "${pids[@]}"; do
        wait $pid
    done
    
    # 收集结果
    local has_error=false
    for result_file in "$temp_dir"/*; do
        if [ -f "$result_file" ]; then
            local result=$(cat "$result_file")
            local check_name=$(basename "$result_file")
            local status=$(echo "$result" | cut -d: -f2)
            local message=$(echo "$result" | cut -d: -f3-)
            
            case $status in
                "error")
                    log_message "ERROR" "$message"
                    has_error=true
                    ;;
                "warning")
                    log_message "WARNING" "$message"
                    ;;
                "ok")
                    # 成功的检查不需要特别输出
                    ;;
            esac
        fi
    done
    
    # 检查Python包（需要串行执行）
    if [ -n "$VIRTUAL_ENV" ] && [ -f "$VIRTUAL_ENV/bin/activate" ]; then
        cd "$BACKEND_DIR" || return 1
        # 虚拟环境已激活，无需重复激活
        
        if ! python -c "import fastapi, uvicorn" 2>/dev/null; then
            log_message "ERROR" "缺少必要的Python包"
            log_message "INFO" "请运行: pip install -r requirements.txt"
            has_error=true
        fi
    fi
    
    # 清理临时目录
    rm -rf "$temp_dir"
    
    if [ "$has_error" = "true" ]; then
        log_message "ERROR" "依赖检查失败"
        return 1
    fi
    
    log_message "SUCCESS" "依赖检查通过"
    return 0
}

# 查找后端相关进程
find_backend_processes() {
    local processes=()
    
    # 查找uvicorn进程
    while IFS= read -r line; do
        if [ ! -z "$line" ]; then
            processes+=("$line")
        fi
    done < <(ps aux | grep -E "(uvicorn.*app\.main:app|python.*uvicorn.*${SERVICE_PORT:-3000})" | grep -v grep | awk '{print $2}')
    
    # 查找占用SERVICE_PORT端口的进程
    local port_pids=$(lsof -ti:$SERVICE_PORT 2>/dev/null || true)
    if [ ! -z "$port_pids" ]; then
        for pid in $port_pids; do
            if [[ ! " ${processes[@]} " =~ " ${pid} " ]]; then
                processes+=("$pid")
            fi
        done
    fi
    
    printf '%s\n' "${processes[@]}"
}

# 智能清理后端进程
cleanup_backend_processes() {
    log_message "INFO" "🔍 检查现有后端进程..."
    
    local processes=()
    while IFS= read -r pid; do
        if [ ! -z "$pid" ]; then
            processes+=("$pid")
        fi
    done < <(find_backend_processes)
    
    if [ ${#processes[@]} -eq 0 ]; then
        log_message "SUCCESS" "✅ 没有发现运行中的后端进程"
        return 0
    fi
    
    log_message "WARNING" "发现 ${#processes[@]} 个运行中的后端进程，正在清理..."
    
    local cleaned=0
    for pid in "${processes[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            local cmd=$(ps -p "$pid" -o cmd --no-headers 2>/dev/null || echo "未知命令")
            log_message "INFO" "停止进程 PID=$pid, CMD=$cmd"
            
            # 先尝试优雅停止
            if kill -TERM "$pid" 2>/dev/null; then
                # 等待进程结束
                local wait_time=0
                while [ $wait_time -lt 5 ] && kill -0 "$pid" 2>/dev/null; do
                    sleep 1
                    wait_time=$((wait_time + 1))
                done
                
                if kill -0 "$pid" 2>/dev/null; then
                    log_message "WARNING" "进程 $pid 未响应，强制杀死"
                    kill -KILL "$pid" 2>/dev/null || true
                    sleep 1
                fi
                
                cleaned=$((cleaned + 1))
                log_message "SUCCESS" "进程 $pid 已停止"
            else
                log_message "WARNING" "无法停止进程 $pid"
            fi
        fi
    done
    
    # 等待确保进程完全停止
    sleep 2
    
    log_message "SUCCESS" "✅ 已清理 $cleaned 个后端进程"
    return 0
}

# 检查端口冲突
check_port_conflict() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pid" ]; then
        log_message "WARNING" "端口 $port 被进程 $pid 占用"
        
        # 检查是否是我们的服务
        if [ -f "$PID_FILE" ] && [ "$(cat $PID_FILE 2>/dev/null)" = "$pid" ]; then
            log_message "INFO" "检测到已运行的后端服务 (PID: $pid)"
            return 2  # 返回2表示是我们的服务
        else
            log_message "ERROR" "端口被其他进程占用"
            return 1  # 返回1表示端口冲突
        fi
    fi
    
    return 0  # 返回0表示端口可用
}

# 强制清理端口
force_cleanup_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        log_message "INFO" "强制清理端口 $port 上的进程..."
        for pid in $pids; do
            log_message "INFO" "终止进程 $pid"
            kill -TERM "$pid" 2>/dev/null
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                log_message "WARNING" "强制杀死进程 $pid"
                kill -KILL "$pid" 2>/dev/null
            fi
        done
        sleep 1
    fi
}

# 检查服务健康状态
check_health() {
    local retries=${1:-1}
    local interval=${2:-1}
    
    for ((i=1; i<=retries; i++)); do
        if command -v curl >/dev/null 2>&1; then
            if curl -s --max-time 5 "$HEALTH_CHECK_URL" | grep -q '"status".*"ok"' 2>/dev/null; then
                return 0
            fi
        elif command -v wget >/dev/null 2>&1; then
            if wget -q --timeout=5 -O- "$HEALTH_CHECK_URL" | grep -q '"status".*"ok"' 2>/dev/null; then
                return 0
            fi
        else
            # 如果没有curl或wget，使用nc检查端口
            if nc -z localhost "$SERVICE_PORT" >/dev/null 2>&1; then
                return 0
            fi
        fi
        
        if [ $i -lt $retries ]; then
            sleep $interval
        fi
    done
    
    return 1
}

# 检查服务状态
check_service_status() {
    # 检查PID文件
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            # 进程存在，检查端口
            if netstat -tuln | grep -q ":$SERVICE_PORT "; then
                # 检查健康状态
                if check_health 1 1; then
                    return 0  # 服务正常运行
                else
                    return 1  # 服务异常
                fi
            else
                return 1  # 端口未监听
            fi
        else
            # 进程不存在，清理PID文件
            rm -f "$PID_FILE"
            return 1
        fi
    else
        return 1  # PID文件不存在
    fi
}

# 启动后端服务
start_backend_service() {
    log_message "INFO" "启动后端服务..."
    
    # 1. 首先清理现有进程
    cleanup_backend_processes
    
    # 检查锁文件
    if [ -f "$LOCK_FILE" ]; then
        local lock_pid=$(cat "$LOCK_FILE" 2>/dev/null)
        if kill -0 "$lock_pid" 2>/dev/null; then
            log_message "ERROR" "另一个启动进程正在运行 (PID: $lock_pid)"
            return 1
        else
            rm -f "$LOCK_FILE"
        fi
    fi
    
    # 创建锁文件
    echo $$ > "$LOCK_FILE"
    
    # 清理函数
    cleanup_on_exit() {
        rm -f "$LOCK_FILE"
    }
    trap cleanup_on_exit EXIT
    
    # 进入后端目录
    cd "$BACKEND_DIR" || {
        log_message "ERROR" "无法进入后端目录: $BACKEND_DIR"
        return 1
    }
    
    # 设置环境变量
    export PYTHONPATH="${PYTHONPATH:-}:$(pwd)/../MCP_Client/src"
    
    # 启动服务
    local log_file="$BACKEND_LOG_DIR/backend_$(date +%Y%m%d_%H%M%S).log"
    
    log_message "INFO" "启动命令: python -m uvicorn app.main:app --host 0.0.0.0 --port $SERVICE_PORT (使用虚拟环境: $VIRTUAL_ENV)"
    log_message "INFO" "日志文件: $log_file"
    
    # 使用安全的方式写入PID文件
    (
        flock -x 200
        nohup bash -c "
            # 动态检测并激活虚拟环境，然后在backend目录中启动服务
            if [ -n '$VIRTUAL_ENV' ]; then
                source '$VIRTUAL_ENV/bin/activate'
            else
                # 尝试常见的虚拟环境路径
                for venv_path in '/home/devbox/project/Backend/.venv' '/home/devbox/project/.venv' '$(pwd)/.venv' '$(pwd)/../.venv'; do
                    if [ -f \"\$venv_path/bin/activate\" ]; then
                        source \"\$venv_path/bin/activate\"
                        break
                    fi
                done
            fi
            cd '$BACKEND_DIR' && source '$VIRTUAL_ENV/bin/activate' && python -m uvicorn app.main:app --host 0.0.0.0 --port $SERVICE_PORT
        " > "$log_file" 2>&1 &
        
        local service_pid=$!
        echo "$service_pid" > "$PID_FILE"
        log_message "INFO" "服务已启动 (PID: $service_pid)，等待初始化..."
    ) 200>"$LOCK_FILE"
    
    # 等待服务启动并进行健康检查
    log_message "INFO" "等待服务启动..."
    local wait_time=0
    while [ $wait_time -lt $STARTUP_TIMEOUT ]; do
        if check_health $HEALTH_CHECK_RETRIES $HEALTH_CHECK_INTERVAL; then
            log_message "SUCCESS" "后端服务启动成功！"
            log_message "INFO" "服务地址: http://localhost:$SERVICE_PORT"
            log_message "INFO" "API文档: http://localhost:$SERVICE_PORT/docs"
            log_message "INFO" "健康检查: http://localhost:$SERVICE_PORT/health"
            
            # 显示MCP服务器启动状态
            echo -e "\n${BLUE}=== MCP服务器启动状态 ===${NC}"
            log_message "INFO" "正在检查MCP服务器状态..."
            
            # 等待几秒让MCP服务器有时间启动
            sleep 3
            
            local mcp_status_response=$(curl -s --max-time 10 "http://localhost:$SERVICE_PORT/api/v1/mcp/health" 2>/dev/null)
            if [ $? -eq 0 ] && [ ! -z "$mcp_status_response" ]; then
                local success=$(echo "$mcp_status_response" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d ' "')
                if [ "$success" = "true" ]; then
                    local total=$(echo "$mcp_status_response" | grep -o '"total":[0-9]*' | cut -d':' -f2)
                    local running=$(echo "$mcp_status_response" | grep -o '"running":[0-9]*' | cut -d':' -f2)
                    local failed=$(echo "$mcp_status_response" | grep -o '"failed":[0-9]*' | cut -d':' -f2)
                    
                    if [ ! -z "$total" ] && [ ! -z "$running" ] && [ ! -z "$failed" ]; then
                        echo -e "${CYAN}MCP服务器总数: $total, 运行中: ${GREEN}$running${NC}, 失败: ${RED}$failed${NC}"
                        
                        # 显示各个服务器状态
                        if command -v jq >/dev/null 2>&1; then
                            # 使用jq解析JSON
                            echo "$mcp_status_response" | jq -r '.data.servers | to_entries[] | "\(.key) \(.value.status) \(.value.restart_count)"' 2>/dev/null | while read server_name server_status restart_count; do
                                if [ "$server_status" = "running" ]; then
                                    echo -e "  ${GREEN}✓${NC} $server_name: 运行中 (重启次数: ${restart_count:-0})"
                                else
                                    echo -e "  ${RED}✗${NC} $server_name: 已停止 (重启次数: ${restart_count:-0})"
                                fi
                            done
                        else
                            # 备用解析方法（不依赖jq）
                            echo "$mcp_status_response" | grep -o '"[^"]*":{[^}]*"status":"[^"]*"[^}]*}' | while IFS= read -r server_block; do
                                local server_name=$(echo "$server_block" | sed 's/^"\([^"]*\)".*/\1/')
                                local server_status=$(echo "$server_block" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
                                local restart_count=$(echo "$server_block" | grep -o '"restart_count":[0-9]*' | sed 's/.*://')
                                
                                if [ "$server_status" = "running" ]; then
                                    echo -e "  ${GREEN}✓${NC} $server_name: 运行中 (重启次数: ${restart_count:-0})"
                                else
                                    echo -e "  ${RED}✗${NC} $server_name: 已停止 (重启次数: ${restart_count:-0})"
                                fi
                            done
                        fi
                    else
                        echo -e "${YELLOW}⚠ 无法解析MCP服务器状态信息${NC}"
                    fi
                else
                    echo -e "${RED}✗ MCP服务器状态API响应错误${NC}"
                fi
            else
                echo -e "${YELLOW}⚠ 暂时无法获取MCP服务器状态，请稍后使用 '$0 status' 查看${NC}"
            fi
            
            return 0
        fi
        
        sleep 2
        wait_time=$((wait_time + 2))
        echo -ne "\r${YELLOW}等待服务启动... (${wait_time}s/${STARTUP_TIMEOUT}s)${NC}"
    done
    
    echo  # 换行
    log_message "ERROR" "服务启动超时"
    
    # 检查启动日志
    if [ -f "$log_file" ]; then
        log_message "INFO" "最近的错误日志:"
        tail -10 "$log_file" | while read line; do
            echo -e "${RED}  $line${NC}"
        done
    fi
    
    # 清理失败的启动
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" 2>/dev/null
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                kill -KILL "$pid" 2>/dev/null
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    return 1
}

# 停止后端服务
stop_backend_service() {
    log_message "INFO" "停止后端服务..."
    
    # 使用智能清理功能停止所有相关进程
    cleanup_backend_processes
    
    # 清理PID文件和锁文件
    rm -f "$PID_FILE" "$LOCK_FILE"
    
    log_message "SUCCESS" "后端服务已停止"
}

# 重启服务
restart_backend_service() {
    log_message "INFO" "重启后端服务..."
    stop_backend_service
    sleep 2
    start_backend_service
}

# 安全启动模式（集成进程管理）
safe_start_backend() {
    log_message "INFO" "🚀 安全启动模式 - 自动检测并清理重复进程"
    
    # 1. 验证环境
    if ! validate_environment; then
        log_message "ERROR" "环境验证失败"
        return 1
    fi
    
    # 2. 检查依赖
    if ! check_dependencies; then
        log_message "ERROR" "依赖检查失败"
        return 1
    fi
    
    # 3. 检查数据库连接
    if ! check_database_connection; then
        log_message "ERROR" "数据库连接检查失败"
        return 1
    fi
    
    # 4. 启动服务（内部会自动清理进程）
    if start_backend_service; then
        echo ""
        log_message "SUCCESS" "✅ 后端服务启动成功！"
        log_message "INFO" "📍 服务地址: http://localhost:$SERVICE_PORT"
        log_message "INFO" "📖 API文档: http://localhost:$SERVICE_PORT/docs"
        log_message "INFO" "🔍 健康检查: http://localhost:$SERVICE_PORT/health"
        echo ""
        log_message "INFO" "管理命令:"
        log_message "INFO" "  停止服务: $0 stop"
        log_message "INFO" "  重启服务: $0 restart"
        log_message "INFO" "  查看状态: $0 status"
        log_message "INFO" "  监控服务: $0 monitor"
        
        # 显示MCP服务器启动状态
        echo -e "\n${BLUE}=== MCP服务器启动状态 ===${NC}"
        log_message "INFO" "正在检查MCP服务器状态..."
        
        # 等待几秒让MCP服务器有时间启动
        sleep 3
        
        local mcp_status_response=$(curl -s --max-time 10 "http://localhost:$SERVICE_PORT/api/v1/mcp/health" 2>/dev/null)
        if [ $? -eq 0 ] && [ ! -z "$mcp_status_response" ]; then
            local success=$(echo "$mcp_status_response" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d ' "')
            if [ "$success" = "true" ]; then
                local total=$(echo "$mcp_status_response" | grep -o '"total":[0-9]*' | cut -d':' -f2)
                local running=$(echo "$mcp_status_response" | grep -o '"running":[0-9]*' | cut -d':' -f2)
                local failed=$(echo "$mcp_status_response" | grep -o '"failed":[0-9]*' | cut -d':' -f2)
                
                if [ ! -z "$total" ] && [ ! -z "$running" ] && [ ! -z "$failed" ]; then
                    echo -e "${CYAN}MCP服务器总数: $total, 运行中: ${GREEN}$running${NC}, 失败: ${RED}$failed${NC}"
                    
                    # 显示各个服务器状态
                    if command -v jq >/dev/null 2>&1; then
                        # 使用jq解析JSON
                        echo "$mcp_status_response" | jq -r '.data.servers | to_entries[] | "\(.key) \(.value.status) \(.value.restart_count)"' 2>/dev/null | while read server_name server_status restart_count; do
                            if [ "$server_status" = "running" ]; then
                                echo -e "  ${GREEN}✓${NC} $server_name: 运行中 (重启次数: ${restart_count:-0})"
                            else
                                echo -e "  ${RED}✗${NC} $server_name: 已停止 (重启次数: ${restart_count:-0})"
                            fi
                        done
                    else
                        # 备用解析方法（不依赖jq）
                        echo "$mcp_status_response" | grep -o '"[^"]*":{[^}]*"status":"[^"]*"[^}]*}' | while IFS= read -r server_block; do
                            local server_name=$(echo "$server_block" | sed 's/^"\([^"]*\)".*/\1/')
                            local server_status=$(echo "$server_block" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
                            local restart_count=$(echo "$server_block" | grep -o '"restart_count":[0-9]*' | sed 's/.*://')
                            
                            if [ "$server_status" = "running" ]; then
                                echo -e "  ${GREEN}✓${NC} $server_name: 运行中 (重启次数: ${restart_count:-0})"
                            else
                                echo -e "  ${RED}✗${NC} $server_name: 已停止 (重启次数: ${restart_count:-0})"
                            fi
                        done
                    fi
                else
                    echo -e "${YELLOW}⚠ 无法解析MCP服务器状态信息${NC}"
                fi
            else
                echo -e "${RED}✗ MCP服务器状态API响应错误${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ 暂时无法获取MCP服务器状态，请稍后使用 '$0 status' 查看${NC}"
        fi
        
        return 0
    else
        log_message "ERROR" "❌ 后端服务启动失败，请检查日志"
        return 1
    fi
}

# 服务监控循环
monitor_service() {
    local restart_count=0
    local last_restart_time=0
    
    log_message "INFO" "开始监控后端服务"
    log_message "INFO" "监控间隔: ${CHECK_INTERVAL}秒"
    log_message "INFO" "最大重启次数: $MAX_RESTART_ATTEMPTS"
    
    # 确保服务首先启动
    if ! check_service_status; then
        log_message "INFO" "服务未运行，正在启动..."
        if ! start_backend_service; then
            log_message "ERROR" "初始启动失败，退出监控"
            return 1
        fi
    fi
    
    echo -e "\n${GREEN}监控已启动，按 Ctrl+C 停止监控${NC}\n"
    
    # 监控循环
    while true; do
        # 获取资源使用情况
        local cpu_usage="N/A"
        local mem_usage="N/A"
        local uptime="N/A"
        local connections="N/A"
        
        if [ -f "$PID_FILE" ]; then
            local pid=$(cat "$PID_FILE")
            if kill -0 "$pid" 2>/dev/null; then
                # 获取CPU和内存使用率
                if command -v ps >/dev/null 2>&1; then
                    local ps_output=$(ps -p "$pid" -o %cpu,%mem,etime --no-headers 2>/dev/null)
                    if [ -n "$ps_output" ]; then
                        cpu_usage=$(echo $ps_output | awk '{print $1"%"}')
                        mem_usage=$(echo $ps_output | awk '{print $2"%"}')
                        uptime=$(echo $ps_output | awk '{print $3}')
                    fi
                fi
                
                # 获取连接数
                if command -v netstat >/dev/null 2>&1; then
                    connections=$(netstat -an | grep ":$SERVICE_PORT " | grep ESTABLISHED | wc -l 2>/dev/null || echo "N/A")
                fi
            fi
        fi
        
        if check_health $HEALTH_CHECK_RETRIES $HEALTH_CHECK_INTERVAL; then
            echo -ne "\r${GREEN}✓${NC} 服务运行正常 $(date '+%H:%M:%S') | CPU: $cpu_usage | 内存: $mem_usage | 运行时间: $uptime | 连接数: $connections | 重启次数: $restart_count"
            restart_count=0  # 重置失败计数
        else
            echo -ne "\r${RED}✗${NC} 服务异常                                                                                        \n"
            log_message "WARNING" "检测到服务异常"
            
            local current_time=$(date +%s)
            
            # 检查重启频率（防止频繁重启）
            if [ $((current_time - last_restart_time)) -lt 60 ] && [ $restart_count -gt 0 ]; then
                log_message "WARNING" "重启过于频繁，等待更长时间..."
                sleep 30
            fi
            
            if [ $restart_count -lt $MAX_RESTART_ATTEMPTS ]; then
                restart_count=$((restart_count + 1))
                last_restart_time=$current_time
                
                log_message "INFO" "尝试重启服务 (第 $restart_count/$MAX_RESTART_ATTEMPTS 次)"
                
                if restart_backend_service; then
                    log_message "SUCCESS" "服务重启成功"
                else
                    log_message "ERROR" "服务重启失败"
                    sleep $RESTART_DELAY
                fi
            else
                log_message "CRITICAL" "达到最大重启次数，停止自动重启"
                echo -e "\n${RED}错误: 服务多次重启失败，请手动检查以下内容:${NC}"
                echo -e "${YELLOW}1. 检查后端日志: $BACKEND_LOG_DIR${NC}"
                echo -e "${YELLOW}2. 检查数据库连接${NC}"
                echo -e "${YELLOW}3. 检查端口占用情况${NC}"
                echo -e "${YELLOW}4. 检查虚拟环境和依赖${NC}"
                return 1
            fi
        fi
        
        sleep $CHECK_INTERVAL
    done
}

# 显示服务状态
show_status() {
    echo -e "\n${BLUE}=== 后端服务状态 ===${NC}"
    
    # 基本信息
    echo -e "${CYAN}服务名称:${NC} $SERVICE_NAME"
    echo -e "${CYAN}服务端口:${NC} $SERVICE_PORT"
    echo -e "${CYAN}后端目录:${NC} $BACKEND_DIR"
    echo -e "${CYAN}日志目录:${NC} $BACKEND_LOG_DIR"
    
    # 系统服务状态
    echo -e "\n${BLUE}=== 系统服务状态 ===${NC}"
    if check_systemd_available; then
        check_system_service
    else
        echo -e "${YELLOW}ℹ systemd不可用，无法使用系统服务功能${NC}"
    fi
    
    # 手动服务状态
    echo -e "\n${BLUE}=== 手动服务状态 ===${NC}"
    if check_service_status; then
        echo -e "${GREEN}✓ 手动服务: 运行正常${NC}"
        
        if [ -f "$PID_FILE" ]; then
            local pid=$(cat "$PID_FILE")
            echo -e "${CYAN}进程ID:${NC} $pid"
            
            # 显示进程信息
            local cpu_mem=$(ps -p "$pid" -o %cpu,%mem --no-headers 2>/dev/null)
            if [ ! -z "$cpu_mem" ]; then
                echo -e "${CYAN}CPU/内存:${NC} $cpu_mem"
            fi
            
            # 显示启动时间
            local start_time=$(ps -p "$pid" -o lstart --no-headers 2>/dev/null)
            if [ ! -z "$start_time" ]; then
                echo -e "${CYAN}启动时间:${NC} $start_time"
            fi
        fi
        
        # 健康检查
        local health_response=$(curl -s --max-time 5 "$HEALTH_CHECK_URL" 2>/dev/null)
        if [ ! -z "$health_response" ]; then
            echo -e "${GREEN}✓ 健康检查: 通过${NC}"
            echo -e "${CYAN}响应内容:${NC} $health_response"
        else
            echo -e "${YELLOW}⚠ 健康检查: 无响应${NC}"
        fi
    else
        echo -e "${RED}✗ 手动服务: 未运行或异常${NC}"
    fi
    
    # 端口状态
    echo -e "\n${BLUE}=== 网络状态 ===${NC}"
    if netstat -tuln | grep -q ":$SERVICE_PORT "; then
        echo -e "${GREEN}✓ 端口 $SERVICE_PORT: 已监听${NC}"
        
        # 显示监听详情
        local listen_info=$(netstat -tuln | grep ":$SERVICE_PORT ")
        if [ ! -z "$listen_info" ]; then
            echo -e "${CYAN}监听详情:${NC} $listen_info"
        fi
    else
        echo -e "${RED}✗ 端口 $SERVICE_PORT: 未监听${NC}"
    fi
    
    # 最近日志
    echo -e "\n${BLUE}=== 最近日志 (最后10行) ===${NC}"
    local latest_log=$(ls -t "$BACKEND_LOG_DIR"/backend_*.log 2>/dev/null | head -1)
    if [ ! -z "$latest_log" ] && [ -f "$latest_log" ]; then
        echo -e "${CYAN}手动服务日志:${NC} $latest_log"
        tail -10 "$latest_log" | while read line; do
            echo -e "${YELLOW}  $line${NC}"
        done
    else
        echo -e "${YELLOW}没有找到手动服务日志文件${NC}"
    fi
    
    # 系统服务日志
    local systemd_log="$BACKEND_LOG_DIR/systemd.log"
    if [ -f "$systemd_log" ]; then
        echo -e "\n${CYAN}系统服务日志:${NC} $systemd_log"
        tail -10 "$systemd_log" | while read line; do
            echo -e "${YELLOW}  $line${NC}"
        done
    fi
    
    # MCP服务器状态
    echo -e "\n${BLUE}=== MCP服务器状态 ===${NC}"
    if check_service_status; then
        # 尝试获取MCP服务器状态
        local mcp_status_response=$(curl -s --max-time 10 "http://localhost:$SERVICE_PORT/api/v1/mcp/health" 2>/dev/null)
        if [ $? -eq 0 ] && [ ! -z "$mcp_status_response" ]; then
            # 解析JSON响应（简单解析）
            local success=$(echo "$mcp_status_response" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d ' "')
            if [ "$success" = "true" ]; then
                echo -e "${GREEN}✓ MCP服务器状态API: 可访问${NC}"
                
                # 提取服务器统计信息
                local total=$(echo "$mcp_status_response" | grep -o '"total":[0-9]*' | cut -d':' -f2)
                local running=$(echo "$mcp_status_response" | grep -o '"running":[0-9]*' | cut -d':' -f2)
                local failed=$(echo "$mcp_status_response" | grep -o '"failed":[0-9]*' | cut -d':' -f2)
                local blacklisted=$(echo "$mcp_status_response" | grep -o '"blacklisted":[0-9]*' | cut -d':' -f2)
                
                if [ ! -z "$total" ] && [ ! -z "$running" ] && [ ! -z "$failed" ]; then
                    echo -e "${CYAN}服务器总数:${NC} $total"
                    echo -e "${GREEN}运行中:${NC} $running"
                    if [ "$failed" -gt 0 ]; then
                        echo -e "${RED}失败:${NC} $failed"
                    else
                        echo -e "${GREEN}失败:${NC} $failed"
                    fi
                    if [ ! -z "$blacklisted" ] && [ "$blacklisted" -gt 0 ]; then
                        echo -e "${YELLOW}已禁用:${NC} $blacklisted"
                    fi
                    
                    # 显示各个服务器的详细状态
                    echo -e "\n${CYAN}详细状态:${NC}"
                    # 使用更可靠的方法解析服务器状态
                    if command -v jq >/dev/null 2>&1; then
                        # 使用jq解析JSON
                        echo "$mcp_status_response" | jq -r '.data.servers | to_entries[] | "\(.key) \(.value.status) \(.value.restart_count)"' 2>/dev/null | while read server_name server_status restart_count; do
                            if [ "$server_status" = "running" ]; then
                                echo -e "  ${GREEN}✓${NC} $server_name: 运行中 (重启次数: ${restart_count:-0})"
                            else
                                echo -e "  ${RED}✗${NC} $server_name: 已停止 (重启次数: ${restart_count:-0})"
                            fi
                        done
                    else
                        # 备用解析方法（不依赖jq）
                        echo "$mcp_status_response" | grep -o '"[^"]*":{[^}]*"status":"[^"]*"[^}]*}' | while IFS= read -r server_block; do
                            local server_name=$(echo "$server_block" | sed 's/^"\([^"]*\)".*/\1/')
                            local server_status=$(echo "$server_block" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
                            local restart_count=$(echo "$server_block" | grep -o '"restart_count":[0-9]*' | sed 's/.*://')
                            
                            if [ "$server_status" = "running" ]; then
                                echo -e "  ${GREEN}✓${NC} $server_name: 运行中 (重启次数: ${restart_count:-0})"
                            else
                                echo -e "  ${RED}✗${NC} $server_name: 已停止 (重启次数: ${restart_count:-0})"
                            fi
                        done
                    fi
                else
                    echo -e "${YELLOW}⚠ 无法解析MCP服务器统计信息${NC}"
                fi
            else
                echo -e "${RED}✗ MCP服务器状态API: 响应错误${NC}"
                echo -e "${YELLOW}响应内容:${NC} $(echo "$mcp_status_response" | head -c 200)..."
            fi
        else
            echo -e "${RED}✗ MCP服务器状态API: 无法访问${NC}"
            echo -e "${YELLOW}提示: 请确保后端服务正常运行并且API端点可访问${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ 后端服务未运行，无法获取MCP服务器状态${NC}"
    fi
    
    # 重启建议
    echo -e "\n${BLUE}=== 重启自动恢复建议 ===${NC}"
    if check_systemd_available; then
        if systemctl list-unit-files | grep -q ai-assistant-backend 2>/dev/null; then
            if systemctl is-enabled --quiet ai-assistant-backend 2>/dev/null; then
                echo -e "${GREEN}✓ 系统服务已安装并启用，重启后将自动恢复${NC}"
            else
                echo -e "${YELLOW}⚠ 系统服务已安装但未启用，运行 '$0 install-service' 启用开机自启动${NC}"
            fi
        else
            echo -e "${RED}✗ 系统服务未安装，运行 '$0 install-service' 安装开机自启动${NC}"
        fi
    else
        echo -e "${YELLOW}ℹ systemd不可用，无法使用系统服务功能${NC}"
        echo -e "${YELLOW}ℹ 在容器环境中，请使用容器编排工具或手动启动方式${NC}"
    fi
}

# 检查systemd是否可用
check_systemd_available() {
    # 检查systemctl命令是否存在
    if ! command -v systemctl >/dev/null 2>&1; then
        return 1
    fi
    
    # 检查systemd是否作为init系统运行
    local system_state=$(systemctl is-system-running 2>/dev/null || echo "offline")
    if [[ "$system_state" != "running" && "$system_state" != "degraded" ]]; then
        return 1
    fi
    
    return 0
}

# 创建systemd服务文件
create_systemd_service() {
    if ! check_systemd_available; then
        log_message "ERROR" "systemd不可用，无法创建系统服务"
        return 1
    fi
    
    local service_file="/etc/systemd/system/ai-assistant-backend.service"
    local temp_service_file="$LOG_DIR/ai-assistant-backend.service"
    
    log_message "INFO" "创建systemd服务配置..."
    
    cat > "$temp_service_file" << EOF
[Unit]
Description=AI Assistant Backend Service
After=network.target mysql.service
Wants=network.target
Requires=mysql.service

[Service]
Type=simple
User=devbox
Group=devbox
WorkingDirectory=$BACKEND_DIR
Environment=PATH=$VIRTUAL_ENV/bin:/usr/local/bin:/usr/bin:/bin
Environment=PYTHONPATH=$BACKEND_DIR:$BACKEND_DIR/../MCP_Client/src
Environment=PYTHONUNBUFFERED=1
ExecStart=$VIRTUAL_ENV/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port $SERVICE_PORT
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
Restart=always
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

# 健康检查
ExecStartPost=/bin/sleep 5
ExecStartPost=/bin/bash -c 'for i in {1..30}; do curl -f http://localhost:$SERVICE_PORT/health && break || sleep 2; done'

# 日志配置
StandardOutput=append:$BACKEND_LOG_DIR/systemd.log
StandardError=append:$BACKEND_LOG_DIR/systemd_error.log
SyslogIdentifier=ai-assistant-backend

# 安全配置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=$BACKEND_DIR $LOG_DIR

[Install]
WantedBy=multi-user.target
EOF
    
    # 检查是否有sudo权限
    if sudo -n true 2>/dev/null; then
        sudo cp "$temp_service_file" "$service_file"
        sudo systemctl daemon-reload
        log_message "SUCCESS" "systemd服务文件已创建: $service_file"
        return 0
    else
        log_message "WARNING" "需要sudo权限来安装systemd服务"
        log_message "INFO" "临时服务文件已创建: $temp_service_file"
        log_message "INFO" "请手动执行以下命令完成安装:"
        echo -e "${YELLOW}  sudo cp $temp_service_file $service_file${NC}"
        echo -e "${YELLOW}  sudo systemctl daemon-reload${NC}"
        echo -e "${YELLOW}  sudo systemctl enable ai-assistant-backend${NC}"
        return 1
    fi
}

# 安装系统服务
install_system_service() {
    if ! check_systemd_available; then
        log_message "ERROR" "systemd不可用，无法安装系统服务"
        log_message "INFO" "在容器环境中，请使用手动启动方式或容器编排工具管理服务"
        return 1
    fi
    
    log_message "INFO" "安装系统服务以实现开机自启动..."
    
    # 创建systemd服务文件
    if create_systemd_service; then
        # 启用服务
        if sudo systemctl enable ai-assistant-backend 2>/dev/null; then
            log_message "SUCCESS" "系统服务已启用，将在开机时自动启动"
        else
            log_message "ERROR" "启用系统服务失败"
            return 1
        fi
        
        # 启动服务
        if sudo systemctl start ai-assistant-backend 2>/dev/null; then
            log_message "SUCCESS" "系统服务已启动"
        else
            log_message "ERROR" "启动系统服务失败"
            return 1
        fi
    else
        return 1
    fi
}

# 卸载系统服务
uninstall_system_service() {
    if ! check_systemd_available; then
        log_message "ERROR" "systemd不可用，无法卸载系统服务"
        return 1
    fi
    
    log_message "INFO" "卸载系统服务..."
    
    if sudo -n true 2>/dev/null; then
        # 停止服务
        sudo systemctl stop ai-assistant-backend 2>/dev/null || true
        
        # 禁用服务
        sudo systemctl disable ai-assistant-backend 2>/dev/null || true
        
        # 删除服务文件
        sudo rm -f /etc/systemd/system/ai-assistant-backend.service
        
        # 重新加载systemd
        sudo systemctl daemon-reload
        
        log_message "SUCCESS" "系统服务已卸载"
    else
        log_message "ERROR" "需要sudo权限来卸载系统服务"
        return 1
    fi
}

# 检查系统服务状态
check_system_service() {
    if ! check_systemd_available; then
        echo -e "${YELLOW}ℹ systemd不可用，无法使用系统服务功能${NC}"
        return 1
    fi
    
    if systemctl is-active --quiet ai-assistant-backend 2>/dev/null; then
        echo -e "${GREEN}✓ 系统服务: 运行中${NC}"
        
        if systemctl is-enabled --quiet ai-assistant-backend 2>/dev/null; then
            echo -e "${GREEN}✓ 开机自启: 已启用${NC}"
        else
            echo -e "${YELLOW}⚠ 开机自启: 未启用${NC}"
        fi
        
        # 显示服务详细信息
        local service_status=$(systemctl status ai-assistant-backend --no-pager -l 2>/dev/null | head -10)
        if [ ! -z "$service_status" ]; then
            echo -e "\n${CYAN}系统服务状态:${NC}"
            echo "$service_status" | while read line; do
                echo -e "${YELLOW}  $line${NC}"
            done
        fi
    else
        echo -e "${RED}✗ 系统服务: 未运行${NC}"
        
        if systemctl list-unit-files | grep -q ai-assistant-backend 2>/dev/null; then
            echo -e "${YELLOW}ℹ 服务已安装但未运行${NC}"
        else
            echo -e "${YELLOW}ℹ 系统服务未安装${NC}"
        fi
    fi
}

# 显示帮助信息
show_help() {
    echo -e "${CYAN}AI Assistant Backend Manager${NC}"
    echo ""
    echo "用法: $0 {start|stop|restart|monitor|status|cleanup|install-service|uninstall-service|help}"
    echo ""
    echo "基础命令:"
    echo -e "  ${GREEN}start${NC}      - 启动后端服务（包含数据库连接检查）"
    echo -e "  ${GREEN}safe-start${NC} - 安全启动（自动清理重复进程）"
    echo -e "  ${RED}stop${NC}       - 停止后端服务"
    echo -e "  ${YELLOW}restart${NC}    - 重启后端服务（包含数据库连接检查）"
    echo -e "  ${BLUE}monitor${NC}    - 启动服务监控（自动重启）"
    echo -e "  ${CYAN}status${NC}     - 显示服务状态和日志"
    echo -e "  ${PURPLE}cleanup${NC}    - 强制清理所有相关进程和文件"
    echo ""
    echo "系统服务命令:"
    echo -e "  ${GREEN}install-service${NC}   - 安装为系统服务（开机自启动）"
    echo -e "  ${RED}uninstall-service${NC} - 卸载系统服务"
    echo ""
    echo -e "  ${NC}help${NC}     - 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start                # 启动服务"
    echo "  $0 monitor              # 启动并监控服务"
    echo "  $0 install-service      # 安装为系统服务，实现开机自启动"
    echo "  $0 status               # 查看服务状态"
    echo ""
    echo "配置:"
    echo -e "  ${CYAN}服务端口:${NC} ${SERVICE_PORT:-3000}"
    echo -e "  ${CYAN}后端目录:${NC} $BACKEND_DIR"
    echo -e "  ${CYAN}日志目录:${NC} $LOG_DIR"
    echo -e "  ${CYAN}数据库:${NC} MySQL（强制要求）"
    echo ""
    echo "启动前检查项:"
    echo -e "  ${YELLOW}1. Python环境和依赖包${NC}"
    echo -e "  ${YELLOW}2. 必要的系统命令${NC}"
    echo -e "  ${YELLOW}3. 数据库连接可用性${NC}"
    echo -e "  ${YELLOW}4. 端口冲突检测${NC}"
    echo ""
    echo "数据库配置:"
    echo -e "  ${YELLOW}• 配置文件: $BACKEND_DIR/.env${NC}"
    echo -e "  ${YELLOW}• 必须使用MySQL数据库${NC}"
    echo -e "  ${YELLOW}• 启动前会自动检查连接${NC}"
    echo ""
    echo "系统重启自动恢复:"
    echo -e "  ${YELLOW}1. 运行 '$0 install-service' 安装系统服务${NC}"
    echo -e "  ${YELLOW}2. 系统重启后服务将自动启动${NC}"
    echo -e "  ${YELLOW}3. 使用 '$0 status' 检查服务状态${NC}"
}

# 强制清理
force_cleanup() {
    log_message "INFO" "执行强制清理..."
    
    # 停止服务（优雅方式）
    stop_backend_service
    
    # 清理PID文件中的进程
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_message "INFO" "尝试优雅终止进程: $pid"
            kill -TERM "$pid" 2>/dev/null
            
            # 等待进程优雅退出
            local wait_count=0
            while kill -0 "$pid" 2>/dev/null && [ $wait_count -lt 10 ]; do
                sleep 1
                wait_count=$((wait_count + 1))
            done
            
            # 如果进程仍在运行，强制终止
            if kill -0 "$pid" 2>/dev/null; then
                log_message "WARNING" "优雅终止失败，强制终止进程: $pid"
                kill -9 "$pid" 2>/dev/null
            else
                log_message "SUCCESS" "进程已优雅退出"
            fi
        fi
    fi
    
    # 清理所有相关文件
    rm -f "$PID_FILE" "$LOCK_FILE"
    
    # 清理可能的僵尸进程
    local zombie_pids=$(ps aux | grep "[u]vicorn.*app.main:app" | awk '{print $2}' 2>/dev/null)
    if [ ! -z "$zombie_pids" ]; then
        log_message "INFO" "清理僵尸进程: $zombie_pids"
        for zpid in $zombie_pids; do
            if kill -0 "$zpid" 2>/dev/null; then
                kill -TERM "$zpid" 2>/dev/null
                sleep 1
                if kill -0 "$zpid" 2>/dev/null; then
                    kill -KILL "$zpid" 2>/dev/null
                fi
            fi
        done
    fi
    
    # 清理端口（如果被占用）
    local port_pid=$(lsof -ti:$SERVICE_PORT 2>/dev/null)
    if [ -n "$port_pid" ]; then
        log_message "INFO" "清理端口 $SERVICE_PORT 上的进程: $port_pid"
        kill -TERM "$port_pid" 2>/dev/null
        sleep 2
        if kill -0 "$port_pid" 2>/dev/null; then
            kill -9 "$port_pid" 2>/dev/null
        fi
    fi
    
    # 清理旧日志文件（保留最近7天的）
    if [ -d "$LOG_DIR" ]; then
        find "$LOG_DIR" -name "*.log.*" -mtime +7 -delete 2>/dev/null || true
        find "$BACKEND_LOG_DIR" -name "backend_*.log" -mtime +7 -delete 2>/dev/null || true
    fi
    
    log_message "SUCCESS" "强制清理完成"
}

# 信号处理
handle_signal() {
    local signal=$1
    
    if [ "$CLEANUP_IN_PROGRESS" = "true" ]; then
        log_message "WARNING" "清理已在进行中，忽略信号 $signal"
        return
    fi
    
    CLEANUP_IN_PROGRESS=true
    
    case $signal in
        "TERM"|"INT")
            echo -e "\n${YELLOW}收到停止信号 ($signal)，正在优雅关闭...${NC}"
            if [ "$CURRENT_MODE" = "monitor" ]; then
                log_message "INFO" "停止监控，保持服务运行"
            else
                stop_backend_service
            fi
            ;;
        "HUP")
            log_message "INFO" "接收到重载信号 ($signal)，重启服务..."
            restart_backend_service
            CLEANUP_IN_PROGRESS=false
            return
            ;;
        *)
            log_message "WARNING" "接收到未知信号 ($signal)"
            ;;
    esac
    
    exit 0
}

# 主程序
main() {
    # 检查是否在项目根目录
    if [ ! -d "backend" ] || [ ! -f "backend/app/main.py" ]; then
        echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
        echo "当前目录: $(pwd)"
        echo "期望目录结构: ./backend/app/main.py"
        exit 1
    fi
    
    # 显示横幅
    show_banner
    
    # 设置信号处理
    trap 'handle_signal TERM' SIGTERM
    trap 'handle_signal INT' SIGINT
    trap 'handle_signal HUP' SIGHUP
    
    # 检查是否提供了参数
    if [ $# -eq 0 ]; then
        echo -e "${RED}错误: 请提供操作命令${NC}"
        echo ""
        show_help
        exit 1
    fi
    
    case "$1" in
        start)
            CURRENT_MODE="start"
            validate_environment || exit 1
            check_dependencies || exit 1
            check_database_connection || exit 1
            
            # 检查端口冲突
            check_port_conflict "$SERVICE_PORT"
            local port_status=$?
            
            if [ $port_status -eq 2 ]; then
                log_message "INFO" "服务已在运行，检查状态..."
                if check_service_status; then
                    log_message "SUCCESS" "服务运行正常，无需重新启动"
                    show_status
                    exit 0
                else
                    log_message "WARNING" "服务状态异常，重新启动..."
                    stop_backend_service
                fi
            elif [ $port_status -eq 1 ]; then
                echo -e "${YELLOW}端口 $SERVICE_PORT 被其他进程占用${NC}"
                read -p "是否强制清理端口？(y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    force_cleanup_port "$SERVICE_PORT"
                else
                    log_message "ERROR" "无法启动服务，端口被占用"
                    exit 1
                fi
            fi
            
            start_backend_service
            ;;
        safe-start)
            CURRENT_MODE="safe-start"
            safe_start_backend
            ;;
        stop)
            CURRENT_MODE="stop"
            stop_backend_service
            ;;
        restart)
            CURRENT_MODE="restart"
            validate_environment || exit 1
            check_dependencies || exit 1
            check_database_connection || exit 1
            restart_backend_service
            ;;
        monitor)
            CURRENT_MODE="monitor"
            validate_environment || exit 1
            check_dependencies || exit 1
            check_database_connection || exit 1
            monitor_service
            ;;
        status)
            show_status
            ;;
        cleanup)
            force_cleanup
            ;;
        install-service)
            validate_environment || exit 1
            check_dependencies || exit 1
            install_system_service
            ;;
        uninstall-service)
            uninstall_system_service
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}错误: 未知命令 '$1'${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主程序
main "$@"