#!/bin/bash

# Backend服务管理脚本
# 功能：启动、停止、监控后端服务，支持多种部署方式
# 作者：AI Assistant
# 版本：2.0

# 获取脚本所在目录（相对路径基准）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"

# 服务配置
SERVICE_NAME="Backend API Service"
# 从.env文件读取配置（统一使用APP_前缀的变量）
if [ -f "${BACKEND_DIR}/backend/.env" ]; then
    # 读取APP_PORT配置
    if grep -q "^APP_PORT=" "${BACKEND_DIR}/backend/.env"; then
        APP_PORT_FROM_FILE=$(grep "^APP_PORT=" "${BACKEND_DIR}/backend/.env" | cut -d'=' -f2 | tr -d ' ')
        SERVICE_PORT="${APP_PORT_FROM_FILE:-3000}"
    else
        SERVICE_PORT=3000
    fi
    
    # 读取APP_HOST配置
    if grep -q "^APP_HOST=" "${BACKEND_DIR}/backend/.env"; then
        APP_HOST_FROM_FILE=$(grep "^APP_HOST=" "${BACKEND_DIR}/backend/.env" | cut -d'=' -f2 | tr -d ' ')
        SERVICE_HOST="${APP_HOST_FROM_FILE:-0.0.0.0}"
    else
        SERVICE_HOST="0.0.0.0"
    fi
else
    SERVICE_PORT=3000
    SERVICE_HOST="0.0.0.0"
fi
HEALTH_CHECK_URL="http://${SERVICE_HOST}:${SERVICE_PORT}/health"
CHECK_INTERVAL=30  # 检查间隔（秒）
MAX_RESTART_ATTEMPTS=5  # 最大重启尝试次数
RESTART_DELAY=10  # 重启延迟（秒）
VENV_PATH="${BACKEND_DIR}/.venv"
LOG_DIR="${BACKEND_DIR}/logs"
PID_FILE="${LOG_DIR}/backend.pid"
MONITOR_LOG="${LOG_DIR}/monitor.log"
SERVICE_LOG="${LOG_DIR}/service.log"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 日志函数
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$MONITOR_LOG"
}

# 检查服务是否运行
check_service_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # 进程存在
        else
            log_message "WARN" "PID文件存在但进程不存在，清理PID文件"
            rm -f "$PID_FILE"
            return 1  # 进程不存在
        fi
    else
        return 1  # PID文件不存在
    fi
}

# 健康检查
health_check() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$HEALTH_CHECK_URL" 2>/dev/null)
    if [ "$response" = "200" ]; then
        return 0  # 健康
    else
        log_message "ERROR" "健康检查失败，HTTP状态码: $response"
        return 1  # 不健康
    fi
}

# 启动服务
start_service() {
    log_message "INFO" "正在启动 $SERVICE_NAME..."
    
    cd "$BACKEND_DIR"
    
    # 检查虚拟环境
    if [ ! -d "$VENV_PATH" ]; then
        log_message "ERROR" "虚拟环境不存在: $VENV_PATH"
        return 1
    fi
    
    # 激活虚拟环境
    source "$VENV_PATH/bin/activate"
    
    # 切换到backend目录并启动服务
    cd backend
    nohup python -m uvicorn app.main:app --host 0.0.0.0 --port $SERVICE_PORT > "$SERVICE_LOG" 2>&1 &
    
    local pid=$!
    echo $pid > "$PID_FILE"
    
    log_message "INFO" "服务已启动，PID: $pid"
    
    # 等待服务启动
    sleep 5
    
    # 验证启动是否成功
    local attempts=0
    while [ $attempts -lt 12 ]; do  # 最多等待60秒
        if health_check; then
            log_message "INFO" "服务启动成功，健康检查通过"
            return 0
        fi
        sleep 5
        attempts=$((attempts + 1))
    done
    
    log_message "ERROR" "服务启动失败，健康检查超时"
    return 1
}

# 停止服务
stop_service() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        log_message "INFO" "正在停止服务，PID: $pid"
        
        # 优雅停止
        kill -TERM "$pid" 2>/dev/null
        sleep 5
        
        # 强制停止
        if ps -p "$pid" > /dev/null 2>&1; then
            log_message "WARN" "优雅停止失败，强制终止进程"
            kill -KILL "$pid" 2>/dev/null
        fi
        
        rm -f "$PID_FILE"
        log_message "INFO" "服务已停止"
    else
        log_message "INFO" "服务未运行"
    fi
}

# 重启服务
restart_service() {
    log_message "INFO" "重启服务..."
    stop_service
    sleep "$RESTART_DELAY"
    start_service
}

# 监控主循环
monitor_loop() {
    local restart_count=0
    local last_restart_time=0
    
    log_message "INFO" "开始监控 $SERVICE_NAME (检查间隔: ${CHECK_INTERVAL}秒)"
    
    while true; do
        local current_time=$(date +%s)
        
        # 检查服务状态
        if check_service_running; then
            if health_check; then
                # 服务正常运行
                if [ $restart_count -gt 0 ]; then
                    log_message "INFO" "服务恢复正常，重置重启计数器"
                    restart_count=0
                fi
            else
                # 健康检查失败
                log_message "ERROR" "服务健康检查失败"
                
                # 检查是否超过最大重启次数
                if [ $restart_count -ge $MAX_RESTART_ATTEMPTS ]; then
                    local time_since_last_restart=$((current_time - last_restart_time))
                    if [ $time_since_last_restart -lt 300 ]; then  # 5分钟内
                        log_message "ERROR" "达到最大重启次数限制，等待5分钟后重置计数器"
                        sleep 300
                        restart_count=0
                    fi
                fi
                
                if [ $restart_count -lt $MAX_RESTART_ATTEMPTS ]; then
                    restart_count=$((restart_count + 1))
                    last_restart_time=$current_time
                    log_message "WARN" "尝试重启服务 (第 $restart_count 次)"
                    restart_service
                fi
            fi
        else
            # 服务未运行
            log_message "ERROR" "服务进程不存在"
            
            if [ $restart_count -lt $MAX_RESTART_ATTEMPTS ]; then
                restart_count=$((restart_count + 1))
                last_restart_time=$current_time
                log_message "WARN" "尝试启动服务 (第 $restart_count 次)"
                start_service
            fi
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# 生成systemd服务文件
generate_systemd_service() {
    local service_file="${BACKEND_DIR}/backend/backend-api.service"
    
    cat > "$service_file" << EOF
[Unit]
Description=Backend API Service
After=network.target
Wants=network.target

[Service]
Type=simple
User=$(whoami)
Group=$(id -gn)
WorkingDirectory=%h/project/Backend
Environment=SERVICE_PORT=${SERVICE_PORT}
Environment=SERVICE_HOST=${SERVICE_HOST}
Environment=PYTHONPATH=%h/project/Backend/backend
Environment=PATH=%h/project/Backend/backend/.venv/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=%h/project/Backend/monitor_service.sh monitor
ExecStop=%h/project/Backend/monitor_service.sh stop
Restart=always
RestartSec=10
TimeoutStartSec=60
TimeoutStopSec=30
StandardOutput=append:%h/project/Backend/logs/systemd.log
StandardError=append:%h/project/Backend/logs/systemd-error.log
KillMode=mixed
KillSignal=SIGTERM
LimitNOFILE=65536
LimitNPROC=4096
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF
    
    echo "systemd服务文件已生成: $service_file"
    echo "注意: 此配置使用 %h (用户主目录) 作为相对路径基准"
    echo "如需部署到其他位置，请手动修改配置文件中的路径"
    echo "安装命令: sudo cp $service_file /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable backend-api"
}

# 生成supervisor配置文件
generate_supervisor_config() {
    local config_file="${BACKEND_DIR}/backend/backend-api.conf"
    
    cat > "$config_file" << EOF
[program:backend-api]
command=%(here)s/../monitor_service.sh monitor
directory=%(here)s/..
user=$(whoami)
group=$(id -gn)
autostart=true
autorestart=true
startsecs=10
startretries=3
killasgroup=true
stopasgroup=true
stopsignal=TERM
stopwaitsecs=30
stdout_logfile=%(here)s/../logs/supervisor-stdout.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=5
stderr_logfile=%(here)s/../logs/supervisor-stderr.log
stderr_logfile_maxbytes=50MB
stderr_logfile_backups=5
environment=SERVICE_PORT=${SERVICE_PORT},SERVICE_HOST=${SERVICE_HOST},PYTHONPATH=%(here)s/../backend,PATH="%(here)s/../backend/.venv/bin:/usr/local/bin:/usr/bin:/bin"
priority=999
redirect_stderr=false
EOF
    
    echo "supervisor配置文件已生成: $config_file"
    echo "注意: 此配置使用 %(here)s 作为相对路径基准（配置文件所在目录）"
    echo "使用命令: sudo cp $config_file /etc/supervisor/conf.d/ && sudo supervisorctl reread && sudo supervisorctl update"
}

# 信号处理
trap 'log_message "INFO" "收到停止信号，正在关闭监控..."; stop_service; exit 0' SIGTERM SIGINT

# 主函数
main() {
    case "${1:-help}" in
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        status)
            if check_service_running; then
                if health_check; then
                    echo "服务正在运行且健康"
                    exit 0
                else
                    echo "服务正在运行但不健康"
                    exit 1
                fi
            else
                echo "服务未运行"
                exit 1
            fi
            ;;
        monitor)
            monitor_loop
            ;;
        systemd)
            generate_systemd_service
            ;;
        supervisor)
            generate_supervisor_config
            ;;
        install)
            echo "选择安装方式:"
            echo "1. systemd (推荐，适用于现代Linux系统)"
            echo "2. supervisor (适用于用户级进程管理)"
            echo "3. 手动运行"
            read -p "请选择 [1-3]: " choice
            case $choice in
                1)
                    generate_systemd_service
                    echo "请运行以下命令完成安装:"
                    echo "sudo cp ${BACKEND_DIR}/scripts/backend-api.service /etc/systemd/system/"
                    echo "sudo systemctl daemon-reload"
                    echo "sudo systemctl enable backend-api"
                    echo "sudo systemctl start backend-api"
                    ;;
                2)
                    generate_supervisor_config
                    echo "请运行以下命令完成安装:"
                    echo "sudo cp ${BACKEND_DIR}/scripts/backend-api.conf /etc/supervisor/conf.d/"
                    echo "sudo supervisorctl reread"
                    echo "sudo supervisorctl update"
                    echo "sudo supervisorctl start backend-api"
                    ;;
                3)
                    echo "手动运行命令:"
                    echo "启动: ./monitor_service.sh start"
                    echo "监控: ./monitor_service.sh monitor"
                    echo "停止: ./monitor_service.sh stop"
                    ;;
                *)
                    echo "无效选择"
                    exit 1
                    ;;
            esac
            ;;
        help|*)
            echo "Backend服务管理脚本 v2.0"
            echo ""
            echo "用法: $0 {start|stop|restart|status|monitor|systemd|supervisor|install|help}"
            echo ""
            echo "基本命令:"
            echo "  start     - 启动服务"
            echo "  stop      - 停止服务"
            echo "  restart   - 重启服务"
            echo "  status    - 检查服务状态"
            echo "  monitor   - 开始监控服务（持续运行）"
            echo ""
            echo "部署命令:"
            echo "  systemd    - 生成systemd服务文件"
            echo "  supervisor - 生成supervisor配置文件"
            echo "  install    - 交互式安装向导"
            echo ""
            echo "帮助:"
            echo "  help      - 显示此帮助信息"
            echo ""
            echo "特性:"
            echo "  - 使用相对路径，支持任意位置部署"
            echo "  - 自动健康检查和故障恢复"
            echo "  - 支持systemd和supervisor部署"
            echo "  - 完整的日志记录"
            if [ "${1:-help}" != "help" ]; then
                exit 1
            fi
            ;;
    esac
}

# 执行主函数
main "$@"