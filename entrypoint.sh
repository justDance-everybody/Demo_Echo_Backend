#!/bin/bash

# ===========================================
# EchoAI Backend 启动脚本 (entrypoint.sh)
# ===========================================
# 简化版启动脚本，满足生产环境最低要求

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 确保在正确的目录
if [ ! -f "backend/.env" ]; then
    log_error "backend/.env 文件不存在，请确保在项目根目录运行此脚本"
    exit 1
fi

log_info "启动 EchoAI Backend..."

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    log_error "Python3 未安装"
    exit 1
fi

# 从.env文件读取虚拟环境路径
VIRTUAL_ENV_PATH=$(grep "^VIRTUAL_ENV_PATH=" backend/.env | cut -d'=' -f2)

# 检查虚拟环境
if [ ! -d "$VIRTUAL_ENV_PATH" ]; then
    log_info "创建Python虚拟环境: $VIRTUAL_ENV_PATH"
    python3 -m venv "$VIRTUAL_ENV_PATH"
fi

# 激活虚拟环境
log_info "激活虚拟环境: $VIRTUAL_ENV_PATH"
source "$VIRTUAL_ENV_PATH/bin/activate"

# 检查并安装Python依赖
check_and_install_dependencies() {
    local requirements_file="backend/requirements.txt"
    local venv_marker="backend/.venv_initialized"
    
    # 检查requirements.txt是否存在
    if [ ! -f "$requirements_file" ]; then
        log_error "requirements.txt 文件不存在: $requirements_file"
        exit 1
    fi
    
    # 检查是否需要重新安装依赖
    if [ ! -f "$venv_marker" ] || [ "$requirements_file" -nt "$venv_marker" ]; then
        log_info "检测到依赖变更或首次安装，开始安装Python依赖..."
        
        # 升级pip
        log_info "升级pip..."
        pip install --upgrade pip
        
        # 安装依赖
        log_info "安装Python依赖..."
        pip install -r "$requirements_file"
        
        # 创建标记文件
        touch "$venv_marker"
        log_success "Python依赖安装完成"
    else
        log_info "Python依赖已是最新，跳过安装"
    fi
}

# 执行依赖检查和安装
check_and_install_dependencies

# 检查环境配置文件
if [ -f "backend/.env.production" ]; then
    log_info "使用生产环境配置"
    set -a && source backend/.env.production && set +a
elif [ -f "backend/.env" ]; then
    log_info "使用默认环境配置"
    set -a && source backend/.env && set +a
else
    log_warning "未找到环境配置文件，使用默认配置"
fi

# 设置默认环境变量
export PYTHONPATH="${PYTHONPATH}:$(pwd)/backend"

# 从.env文件读取应用配置环境变量
if [ -f "backend/.env" ]; then
    # 读取APP_ENV配置
    if grep -q "^APP_ENV=" backend/.env; then
        APP_ENV_FROM_FILE=$(grep "^APP_ENV=" backend/.env | cut -d'=' -f2 | tr -d ' ')
        export APP_ENV="${APP_ENV_FROM_FILE:-production}"
    else
        export APP_ENV="${APP_ENV:-production}"
    fi
    
    # 读取APP_PORT配置
    if grep -q "^APP_PORT=" backend/.env; then
        APP_PORT_FROM_FILE=$(grep "^APP_PORT=" backend/.env | cut -d'=' -f2 | tr -d ' ')
        export APP_PORT="${APP_PORT_FROM_FILE:-3000}"
    else
        export APP_PORT="${APP_PORT:-3000}"
    fi
    
    # 读取APP_HOST配置
    if grep -q "^APP_HOST=" backend/.env; then
        APP_HOST_FROM_FILE=$(grep "^APP_HOST=" backend/.env | cut -d'=' -f2 | tr -d ' ')
        export APP_HOST="${APP_HOST_FROM_FILE:-0.0.0.0}"
    else
        export APP_HOST="${APP_HOST:-0.0.0.0}"
    fi
else
    # 如果.env文件不存在，使用默认值
    export APP_ENV="${APP_ENV:-production}"
    export APP_PORT="${APP_PORT:-3000}"
    export APP_HOST="${APP_HOST:-0.0.0.0}"
fi

# 数据库迁移
if command -v alembic &> /dev/null && [ -f "backend/alembic.ini" ]; then
    log_info "执行数据库迁移..."
    cd backend && alembic upgrade head && cd ..
else
    log_warning "跳过数据库迁移（alembic未配置）"
fi

# 健康检查函数
health_check() {
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:${APP_PORT}/health" > /dev/null 2>&1; then
            log_success "应用启动成功！"
            return 0
        fi
        
        if [ $attempt -eq 1 ]; then
            log_info "等待应用启动..."
        fi
        
        sleep 2
        ((attempt++))
    done
    
    log_warning "健康检查超时，但应用可能仍在启动中"
    return 1
}

# 进程冲突检查和处理
check_existing_process() {
    local port="$1"
    local app_name="echoai-backend"
    
    # 检查端口是否被占用
    if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口 $port 已被占用"
        
        # 获取占用端口的进程信息
        local pid=$(lsof -Pi :"$port" -sTCP:LISTEN -t)
        local process_info=$(ps -p "$pid" -o pid,ppid,cmd --no-headers 2>/dev/null)
        
        if [ -n "$process_info" ]; then
            log_info "占用进程信息: $process_info"
            
            # 检查是否是同样的应用
            if echo "$process_info" | grep -q "uvicorn\|fastapi\|echoai"; then
                log_warning "检测到可能的 EchoAI 应用进程 (PID: $pid)"
                
                # 提供处理选项
                if [ "$FORCE_RESTART" = "true" ]; then
                    log_info "强制重启模式，终止现有进程..."
                    kill -TERM "$pid" 2>/dev/null || true
                    sleep 3
                    
                    # 如果进程仍然存在，强制杀死
                    if kill -0 "$pid" 2>/dev/null; then
                        log_warning "进程未响应 TERM 信号，使用 KILL 信号..."
                        kill -KILL "$pid" 2>/dev/null || true
                        sleep 1
                    fi
                    
                    log_success "现有进程已终止"
                else
                    log_error "检测到现有应用进程，请选择处理方式:"
                    echo "  1. 设置环境变量 FORCE_RESTART=true 强制重启"
                    echo "  2. 手动终止进程: kill $pid"
                    echo "  3. 使用不同端口启动"
                    exit 1
                fi
            else
                log_error "端口 $port 被其他应用占用，请使用不同端口或终止占用进程"
                exit 1
            fi
        fi
    fi
    
    # 检查是否有同名进程在运行
    local existing_pids=$(pgrep -f "uvicorn.*app" 2>/dev/null || true)
    if [ -n "$existing_pids" ]; then
        log_info "发现可能的 uvicorn 进程: $existing_pids"
        
        for pid in $existing_pids; do
            local cmd=$(ps -p "$pid" -o cmd --no-headers 2>/dev/null || true)
            if echo "$cmd" | grep -q "app.main:app\|main:app"; then
                log_warning "发现同名应用进程 (PID: $pid): $cmd"
                
                if [ "$FORCE_RESTART" = "true" ]; then
                    log_info "终止同名进程 $pid..."
                    kill -TERM "$pid" 2>/dev/null || true
                else
                    log_warning "建议设置 FORCE_RESTART=true 自动处理冲突进程"
                fi
            fi
        done
    fi
}

# 创建PID文件
create_pid_file() {
    local pid_dir="/tmp/echoai"
    local pid_file="$pid_dir/backend.pid"
    
    mkdir -p "$pid_dir"
    
    # 检查现有PID文件
    if [ -f "$pid_file" ]; then
        local old_pid=$(cat "$pid_file" 2>/dev/null || echo "")
        if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
            log_warning "发现PID文件中的活跃进程 (PID: $old_pid)"
            
            if [ "$FORCE_RESTART" = "true" ]; then
                log_info "终止PID文件中的进程..."
                kill -TERM "$old_pid" 2>/dev/null || true
                sleep 2
            else
                log_error "应用可能已在运行 (PID: $old_pid)，请检查或设置 FORCE_RESTART=true"
                exit 1
            fi
        fi
    fi
    
    # 写入当前进程PID（在后台进程中写入）
    echo "$$" > "$pid_file"
    log_info "PID文件已创建: $pid_file"
}

# 清理函数
cleanup() {
    local pid_file="/tmp/echoai/backend.pid"
    
    log_info "清理资源..."
    
    # 删除PID文件
    if [ -f "$pid_file" ]; then
        rm -f "$pid_file"
        log_info "PID文件已删除"
    fi
    
    # 终止子进程
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # 清理MCP服务器进程
    log_info "清理MCP服务器进程..."
    pkill -f "mcp-server\|playwright-mcp-server\|minimax-mcp\|amap-maps-mcp" 2>/dev/null || true
    
    # 清理uvicorn进程
    log_info "清理应用进程..."
    pkill -f "uvicorn.*echoai\|uvicorn.*main:app" 2>/dev/null || true
    
    # 等待进程完全终止
    sleep 2
    
    log_info "资源清理完成"
    exit 0
}

# 设置信号处理
trap cleanup SIGTERM SIGINT SIGQUIT

# 检查环境变量（默认启用自动重启模式）
export FORCE_RESTART="${FORCE_RESTART:-true}"

# 执行进程冲突检查
log_info "检查进程冲突..."
check_existing_process "$APP_PORT"

# 创建PID文件
create_pid_file

# 启动应用
log_info "启动FastAPI应用..."
log_info "访问地址: http://localhost:${APP_PORT}"
log_info "API文档: http://localhost:${APP_PORT}/docs"
log_info "进程管理: 设置 FORCE_RESTART=true 可自动处理冲突"

# 后台启动健康检查
(
    sleep 5
    health_check
) &

# 启动应用（根据实际入口文件调整）
if [ -f "backend/app/main.py" ]; then
    cd backend && exec python -m uvicorn app.main:app --host "$APP_HOST" --port "$APP_PORT"
elif [ -f "backend/main.py" ]; then
    cd backend && exec python -m uvicorn main:app --host "$APP_HOST" --port "$APP_PORT"
else
    log_error "未找到应用入口文件 (backend/app/main.py 或 backend/main.py)"
    cleanup
    exit 1
fi