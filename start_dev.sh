#!/bin/bash

###############################################################################
# Echo AI Backend 启动脚本
# 说明：从项目根目录启动后端服务，自动处理依赖和数据库初始化
###############################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Echo AI Backend 启动脚本 v1.0${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 检查虚拟环境
echo -e "${YELLOW}[1/5] 检查虚拟环境...${NC}"
if [ ! -f ".venv/bin/activate" ]; then
    if [ -d ".venv" ]; then
        echo -e "${RED}✗ 虚拟环境已损坏 (找不到 bin/activate)${NC}"
        echo -e "${YELLOW}正在重新创建虚拟环境...${NC}"
        rm -rf .venv
    else
        echo -e "${RED}✗ 虚拟环境不存在${NC}"
        echo -e "${YELLOW}正在创建虚拟环境...${NC}"
    fi
    python3 -m venv .venv
    echo -e "${GREEN}✓ 虚拟环境创建成功${NC}"
else
    echo -e "${GREEN}✓ 虚拟环境已存在${NC}"
fi

# 2. 激活虚拟环境
source .venv/bin/activate

# 3. 检查依赖
echo ""
echo -e "${YELLOW}[2/5] 检查Python依赖...${NC}"
if ! python -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}正在安装依赖（这可能需要几分钟）...${NC}"
    pip install -q -r backend/requirements.txt
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
else
    echo -e "${GREEN}✓ 依赖已安装${NC}"
fi

# 4. 检查配置文件
echo ""
echo -e "${YELLOW}[3/5] 检查配置文件...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ 配置文件 .env 不存在${NC}"
    echo -e "${YELLOW}提示：请复制 .env.example 并填写配置${NC}"
    echo -e "${YELLOW}  cp .env.example .env${NC}"
    exit 1
else
    echo -e "${GREEN}✓ 配置文件存在${NC}"
    # 检查关键配置
    if grep -q "^LLM_API_KEY=your" .env 2>/dev/null; then
        echo -e "${YELLOW}⚠ 警告：LLM_API_KEY 未配置，请修改 .env 文件${NC}"
    fi
fi

# 5. 初始化数据库
echo ""
echo -e "${YELLOW}[4/5] 检查数据库...${NC}"
# 无论是 SQLite 还是 MySQL，都直接运行迁移以确保 Schema 是最新的
echo -e "${YELLOW}正在检查并更新数据库结构...${NC}"
if alembic -c backend/alembic.ini upgrade head; then
    echo -e "${GREEN}✓ 数据库结构已更新${NC}"
else
    echo -e "${RED}✗ 数据库迁移失败${NC}"
    exit 1
fi

# 5. 初始化工具 (MCP & Dify)
echo ""
echo -e "${YELLOW}[4.5/5] 检查工具初始化...${NC}"
TOOL_INIT_MARKER="backend/.tools_initialized"
# 如果使用了 MySQL，建议清理一下旧的标记文件，或者您可以手动控制。
# 这里我们保留标记文件逻辑，但如果迁移成功，通常意味着可以尝试同步工具。

if [ ! -f "$TOOL_INIT_MARKER" ]; then
    echo -e "${YELLOW}首次启动，正在初始化工具（MCP同步 & Dify示例）...${NC}"
    
    # 确保PYTHONPATH包含backend目录，以便脚本能正确导入app模块
    export PYTHONPATH=$PYTHONPATH:$(pwd)/backend
    
    # 1. 同步MCP工具
    echo -e "${BLUE}正在同步MCP工具...${NC}"
    if python backend/scripts/sync_mcp_tools.py; then
        echo -e "${GREEN}✓ MCP工具同步完成${NC}"
    else
        echo -e "${RED}✗ MCP工具同步失败${NC}"
        # 不退出，继续尝试下一个
    fi
    
    # 2. 创建Dify示例工具
    echo -e "${BLUE}正在创建Dify示例工具...${NC}"
    if python backend/scripts/create_dify_tool.py; then
        echo -e "${GREEN}✓ Dify工具创建完成${NC}"
    else
        echo -e "${RED}✗ Dify工具创建失败${NC}"
    fi
    
    # 创建标记文件
    touch "$TOOL_INIT_MARKER"
    echo -e "${GREEN}✓ 工具初始化流程结束${NC}"
else
    echo -e "${GREEN}✓ 工具已初始化 (跳过)${NC}"
fi

# 6. 启动服务
echo ""
echo -e "${YELLOW}[5/5] 启动后端服务...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}启动命令：${NC}uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 3000"
echo -e "${GREEN}工作目录：${NC}$SCRIPT_DIR"
echo -e "${GREEN}访问地址：${NC}http://localhost:3000"
echo -e "${GREEN}API文档：${NC}http://localhost:3000/docs"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}提示：按 Ctrl+C 停止服务${NC}"
echo ""

# 启动服务（从根目录）
export PYTHONPATH=$PYTHONPATH:$(pwd)/backend
# 使用完整的模块路径 backend.app.main:app
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 3000
