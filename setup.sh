#!/bin/bash
# Echo AI 项目一键配置脚本
# 自动完成环境配置、依赖安装、数据库初始化等步骤

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

# 项目配置
PROJECT_NAME="Echo AI Assistant"
BACKEND_DIR="$(pwd)/backend"
MCP_CLIENT_DIR="$(pwd)/MCP_Client"
MCP_SERVER_DIR="$(pwd)/MCP_server"
ROOT_DIR="$(pwd)"

# 从.env文件读取虚拟环境路径
if [ -f "$BACKEND_DIR/.env" ]; then
    VENV_DIR=$(grep "^VIRTUAL_ENV_PATH=" "$BACKEND_DIR/.env" | cut -d'=' -f2)
    if [ -z "$VENV_DIR" ]; then
        log_message "ERROR" "未在.env文件中找到VIRTUAL_ENV_PATH配置"
        exit 1
    fi
else
    log_message "ERROR" "backend/.env 文件不存在"
    exit 1
fi

# 日志函数
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "SUCCESS") echo -e "${GREEN}✓${NC} $message" ;;
        "ERROR") echo -e "${RED}✗${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}⚠${NC} $message" ;;
        "INFO") echo -e "${BLUE}ℹ${NC} $message" ;;
        "DEBUG") echo -e "${PURPLE}🔍${NC} $message" ;;
        *) echo "$message" ;;
    esac
}

# 显示横幅
show_banner() {
    echo -e "${CYAN}"
    echo "======================================"
    echo "    Echo AI 项目一键配置脚本"
    echo "======================================"
    echo -e "${NC}"
    echo "本脚本将自动完成以下配置："
    echo "  1. 环境检查和依赖验证"
    echo "  2. Python虚拟环境创建"
    echo "  3. 依赖包安装"
    echo "  4. 数据库初始化"
    echo "  5. MCP服务器配置"
    echo "  6. 测试账户创建"
    echo "  7. 工具同步"
    echo ""
}

# 检查必要的环境变量
check_env_vars() {
    log_message "INFO" "检查环境变量配置..."
    
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        log_message "ERROR" "未找到环境配置文件: $BACKEND_DIR/.env"
        log_message "INFO" "请先复制 .env.example 到 .env 并配置必要的环境变量："
        echo "  cd $BACKEND_DIR"
        echo "  cp .env.example .env"
        echo "  vim .env  # 编辑配置文件"
        echo ""
        echo "必须配置的环境变量："
        echo "  - DATABASE_URL (数据库连接)"
        echo "  - OPENAI_API_KEY (LLM API密钥)"
        echo "  - JWT_SECRET_KEY (JWT密钥)"
        return 1
    fi
    
    # 检查关键环境变量
    source "$BACKEND_DIR/.env"
    
    local missing_vars=()
    
    if [ -z "${DATABASE_URL:-}" ]; then
        missing_vars+=("DATABASE_URL")
    fi
    
    if [ -z "${OPENAI_API_KEY:-}" ]; then
        missing_vars+=("OPENAI_API_KEY")
    fi
    
    if [ -z "${JWT_SECRET_KEY:-}" ]; then
        missing_vars+=("JWT_SECRET_KEY")
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_message "ERROR" "缺少必要的环境变量: ${missing_vars[*]}"
        log_message "INFO" "请编辑 $BACKEND_DIR/.env 文件并配置这些变量"
        return 1
    fi
    
    log_message "SUCCESS" "环境变量配置检查通过"
    return 0
}

# 检查系统环境
check_system_requirements() {
    log_message "INFO" "检查系统环境..."
    
    # 检查Python版本
    if ! command -v python3 >/dev/null 2>&1; then
        log_message "ERROR" "Python3未安装，请先安装Python 3.9+"
        return 1
    fi
    
    local python_version=$(python3 --version 2>&1 | cut -d' ' -f2)
    local major_version=$(echo ${python_version} | cut -d'.' -f1)
    local minor_version=$(echo ${python_version} | cut -d'.' -f2)
    
    if [ "${major_version}" -lt 3 ] || ([ "${major_version}" -eq 3 ] && [ "${minor_version}" -lt 9 ]); then
        log_message "ERROR" "需要Python 3.9或更高版本，当前版本: ${python_version}"
        return 1
    fi
    
    log_message "SUCCESS" "Python版本检查通过: ${python_version}"
    
    # 检查Node.js版本
    if ! command -v node >/dev/null 2>&1; then
        log_message "ERROR" "Node.js未安装，请先安装Node.js 16+"
        return 1
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local node_major=$(echo ${node_version} | cut -d'.' -f1)
    
    if [ "${node_major}" -lt 16 ]; then
        log_message "ERROR" "需要Node.js 16或更高版本，当前版本: ${node_version}"
        return 1
    fi
    
    log_message "SUCCESS" "Node.js版本检查通过: ${node_version}"
    
    # 检查MySQL（如果配置了MySQL）
    if echo "${DATABASE_URL:-}" | grep -q "mysql"; then
        if ! command -v mysql >/dev/null 2>&1; then
            log_message "WARNING" "MySQL客户端未安装，可能影响数据库操作"
        else
            log_message "SUCCESS" "MySQL客户端已安装"
        fi
    fi
    
    return 0
}

# 创建Python虚拟环境
setup_python_venv() {
    log_message "INFO" "设置Python虚拟环境..."
    
    if [ -d "$VENV_DIR" ]; then
        log_message "INFO" "虚拟环境已存在，跳过创建"
    else
        log_message "INFO" "创建虚拟环境: $VENV_DIR"
        python3 -m venv "$VENV_DIR"
        log_message "SUCCESS" "虚拟环境创建成功"
    fi
    
    # 激活虚拟环境
    source "$VENV_DIR/bin/activate"
    
    # 升级pip
    log_message "INFO" "升级pip..."
    pip install --upgrade pip
    
    log_message "SUCCESS" "虚拟环境设置完成"
    return 0
}

# 安装Python依赖
install_python_dependencies() {
    log_message "INFO" "安装Python依赖包..."
    
    cd "$BACKEND_DIR"
    
    # 激活虚拟环境
    source "$VENV_DIR/bin/activate"
    
    # 安装后端依赖
    log_message "INFO" "安装后端依赖..."
    pip install -r requirements.txt
    
    # 安装MCP SDK
    log_message "INFO" "安装MCP SDK..."
    pip install git+https://github.com/modelcontextprotocol/python-sdk.git
    
    # 安装MCP客户端依赖
    log_message "INFO" "安装MCP客户端依赖..."
    pip install openai python-dotenv loguru
    
    log_message "SUCCESS" "Python依赖安装完成"
    
    cd "$ROOT_DIR"
    return 0
}

# 安装Node.js依赖
install_node_dependencies() {
    log_message "INFO" "安装Node.js依赖..."
    
    # 安装全局MCP包
    log_message "INFO" "安装MCP服务器包..."
    npm install -g @playwright/mcp@latest minimax-mcp-js @amap/amap-maps-mcp-server
    
    log_message "SUCCESS" "Node.js依赖安装完成"
    return 0
}

# 配置MCP服务器
setup_mcp_servers() {
    log_message "INFO" "配置MCP服务器..."
    
    cd "$MCP_CLIENT_DIR"
    
    # 创建配置目录
    mkdir -p config
    
    # 创建MCP服务器配置文件
    cat > config/mcp_servers.json << 'EOF'
{
  "mcpServers": {
    "playwright": {
      "name": "Playwright浏览器",
      "description": "提供Web浏览和自动化功能",
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "enabled": true
    },
    "minimax-mcp-js": {
      "name": "MiniMax API",
      "description": "提供语音合成功能",
      "command": "npx",
      "args": ["-y", "minimax-mcp-js"],
      "env": {
        "MINIMAX_API_KEY": "your_minimax_api_key_here",
        "MINIMAX_API_HOST": "https://api.minimax.chat",
        "MINIMAX_MCP_BASE_PATH": "./outputs",
        "MINIMAX_RESOURCE_MODE": "file"
      },
      "enabled": true
    },
    "amap-maps": {
      "name": "高德地图API",
      "description": "提供地图和天气服务",
      "command": "npx",
      "args": ["-y", "@amap/amap-maps-mcp-server"],
      "env": {
        "AMAP_MAPS_API_KEY": "your_amap_api_key_here"
      },
      "enabled": true
    }
  }
}
EOF
    
    log_message "SUCCESS" "MCP服务器配置完成"
    log_message "WARNING" "请编辑 $MCP_CLIENT_DIR/config/mcp_servers.json 配置API密钥"
    
    cd "$ROOT_DIR"
    return 0
}

# 初始化数据库
setup_database() {
    log_message "INFO" "初始化数据库..."
    
    cd "$BACKEND_DIR"
    
    # 激活虚拟环境
    source "$VENV_DIR/bin/activate"
    
    # 检查数据库连接
    log_message "INFO" "检查数据库连接..."
    python3 -c "
import sys
sys.path.insert(0, '.')
try:
    from app.config import settings
    from sqlalchemy import create_engine, text
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    with engine.connect() as conn:
        result = conn.execute(text('SELECT 1'))
        print('数据库连接成功')
except Exception as e:
    print(f'数据库连接失败: {e}')
    sys.exit(1)
"
    
    if [ $? -ne 0 ]; then
        log_message "ERROR" "数据库连接失败，请检查DATABASE_URL配置"
        return 1
    fi
    
    log_message "SUCCESS" "数据库连接检查通过"
    
    # 执行数据库迁移
    log_message "INFO" "执行数据库迁移..."
    alembic upgrade head
    
    if [ $? -eq 0 ]; then
        log_message "SUCCESS" "数据库迁移完成"
    else
        log_message "ERROR" "数据库迁移失败"
        return 1
    fi
    
    cd "$ROOT_DIR"
    return 0
}

# 创建测试账户
create_test_accounts() {
    log_message "INFO" "创建测试账户..."
    
    cd "$BACKEND_DIR"
    
    # 激活虚拟环境
    source "$VENV_DIR/bin/activate"
    
    # 从环境变量读取测试账户配置
    source .env
    
    # ========== 创建测试账户部分已禁用 ==========
    # 原因: scripts/create_admin.py 不存在
    # 替代方案: 使用 backend/create_test_users.py 脚本手动创建测试账号
    # 
    # 使用方法:
    #   cd backend && python create_test_users.py
    #
    # 测试账号信息:
    #   - 普通用户: testuser_5090 / 8lpcUY2BOt
    #   - 开发者: devuser_5090 / mryuWTGdMk
    #   - 管理员: adminuser_5090 / SAKMRtxCjT
    # ========== 以下代码已注释 ==========
    
    # local accounts=(
    #     "${TEST_DEVELOPER_USERNAME:-devuser_5090} ${TEST_DEVELOPER_PASSWORD:-mryuWTGdMk} developer"
    #     "${TEST_USER_USERNAME:-testuser_5090} ${TEST_USER_PASSWORD:-8lpcUY2BOt} user"
    #     "${TEST_ADMIN_USERNAME:-adminuser_5090} ${TEST_ADMIN_PASSWORD:-SAKMRtxCjT} admin"
    # )
    # 
    # for account in "${accounts[@]}"; do
    #     read -r username password role <<< "$account"
    #     log_message "INFO" "创建 $role 账户: $username"
    #     
    #     python scripts/create_admin.py "$username" "$password" "$role" 2>/dev/null
    #     
    #     if [ $? -eq 0 ]; then
    #         log_message "SUCCESS" "账户 $username 创建成功"
    #     else
    #         log_message "WARNING" "账户 $username 可能已存在"
    #     fi
    # done
    
    log_message "INFO" "测试账户需要手动创建，请运行: cd backend && python create_test_users.py"
    
    cd "$ROOT_DIR"
    return 0
}

# 同步MCP工具
sync_mcp_tools() {
    log_message "INFO" "同步MCP工具到数据库..."
    
    cd "$BACKEND_DIR"
    
    # 激活虚拟环境
    source "$VENV_DIR/bin/activate"
    
    # 执行工具同步
    python complete_sync.py
    
    if [ $? -eq 0 ]; then
        log_message "SUCCESS" "MCP工具同步完成"
    else
        log_message "ERROR" "MCP工具同步失败"
        return 1
    fi
    
    cd "$ROOT_DIR"
    return 0
}

# 验证安装
verify_installation() {
    log_message "INFO" "验证安装结果..."
    
    cd "$BACKEND_DIR"
    
    # 激活虚拟环境
    source "$VENV_DIR/bin/activate"
    
    # 检查数据库表
    log_message "INFO" "检查数据库表..."
    python3 -c "
import sys
sys.path.insert(0, '.')
from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    if 'mysql' in settings.DATABASE_URL:
        result = conn.execute(text('SHOW TABLES'))
    else:
        result = conn.execute(text(\"SELECT name FROM sqlite_master WHERE type='table'\"))
    
    tables = [row[0] for row in result]
    expected_tables = ['users', 'tools', 'sessions', 'logs', 'apps', 'app_tools']
    
    missing_tables = [t for t in expected_tables if t not in tables]
    if missing_tables:
        print(f'缺少数据库表: {missing_tables}')
        sys.exit(1)
    else:
        print(f'数据库表检查通过，共 {len(tables)} 个表')
"
    
    if [ $? -ne 0 ]; then
        log_message "ERROR" "数据库表验证失败"
        return 1
    fi
    
    log_message "SUCCESS" "数据库表验证通过"
    
    # 检查用户账户
    log_message "INFO" "检查用户账户..."
    python3 -c "
import sys
sys.path.insert(0, '.')
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

users = db.query(User).all()
print(f'用户账户数量: {len(users)}')
for user in users:
    print(f'  - {user.username} ({user.role})')

db.close()
"
    
    log_message "SUCCESS" "用户账户验证通过"
    
    # 检查工具数量
    log_message "INFO" "检查MCP工具..."
    python3 -c "
import sys
sys.path.insert(0, '.')
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.tool import Tool
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

tools = db.query(Tool).all()
print(f'MCP工具数量: {len(tools)}')

db.close()
"
    
    log_message "SUCCESS" "MCP工具验证通过"
    
    cd "$ROOT_DIR"
    return 0
}

# 显示完成信息
show_completion_info() {
    echo -e "\n${GREEN}🎉 Echo AI 项目配置完成！${NC}\n"
    
    echo "接下来你可以："
    echo ""
    echo -e "${CYAN}1. 启动后端服务：${NC}"
    echo "   cd Backend"
    echo "   ./start-backend.sh start"
    echo ""
    echo -e "${CYAN}2. 查看服务状态：${NC}"
    echo "   ./start-backend.sh status"
    echo ""
    echo -e "${CYAN}3. 启动交互式控制台：${NC}"
    echo "   cd .."
    echo "   python echo_ai_console.py"
    echo ""
    echo -e "${CYAN}4. 访问API文档：${NC}"
    echo "   http://localhost:${SERVICE_PORT:-3000}/docs"
    echo ""
    echo -e "${YELLOW}注意事项：${NC}"
    echo "  • 请编辑 MCP_Client/config/mcp_servers.json 配置API密钥"
    echo "  • 如需Web3功能，请参考README配置web3-mcp服务器"
    echo "  • 生产环境部署请使用 ./start-backend.sh install-service"
    echo ""
}

# 主函数
main() {
    show_banner
    
    # 检查是否在正确的目录
    if [ ! -f "start-backend.sh" ] || [ ! -d "backend" ]; then
        log_message "ERROR" "请在Backend目录下运行此脚本"
        exit 1
    fi
    
    # 执行配置步骤
    check_env_vars || exit 1
    check_system_requirements || exit 1
    setup_python_venv || exit 1
    install_python_dependencies || exit 1
    install_node_dependencies || exit 1
    setup_mcp_servers || exit 1
    setup_database || exit 1
    create_test_accounts || exit 1
    sync_mcp_tools || exit 1
    verify_installation || exit 1
    
    show_completion_info
}

# 运行主程序
main "$@"