# Echo 智能语音 AI-Agent 开放平台

## 📖 项目简介
Echo是一个基于Python(FastAPI)后端和React前端的智能语音AI-Agent开放平台，支持语音全流程交互、意图识别、工具调用等功能。系统可集成MCP服务和各类HTTP API，实现丰富的技能服务

## ✨ 主要特性
- **🎙️ 语音全流程交互**：支持语音输入、意图识别、语音合成输出
- **🛠️ 多种工具集成**：
  - MCP服务集成（浏览器自动化、语音合成、地图服务、区块链等）
  - HTTP工具支持（Dify平台、Coze平台、通用HTTP API）
- **🧠 意图识别与确认**：使用大语言模型(LLM)解析用户意图并生成确认提示
- **🔐 安全认证**：JWT身份验证与权限管理
- **💬 多轮对话管理**：会话状态跟踪与上下文保持
- **📊 日志与监控**：详细操作记录，便于审计与排查

## 🏗️ 技术栈
- **后端**：Python 3.9+, FastAPI, SQLAlchemy, Alembic, Pydantic
- **前端**：React, Material UI, Web Speech API
- **数据库**：MySQL / SQLite
- **AI服务**：兼容OpenAI API的LLM服务
- **认证**：JWT
- **部署**：Uvicorn, PM2

## 📁 项目结构
```
Demo_Echo_Backend/
├── backend/               # 后端服务
│   ├── alembic/           # 数据库迁移
│   ├── app/               # 应用主目录
│   │   ├── models/        # 数据库模型
│   │   ├── routers/       # API路由
│   │   ├── services/      # 业务逻辑
│   │   ├── utils/         # 工具函数
│   │   ├── config.py      # 配置管理
│   │   └── main.py        # 应用入口
│   ├── scripts/           # 管理脚本
│   ├── .env.example       # 环境变量示例
│   └── requirements.txt   # 依赖包列表
├── frontend/              # 前端项目（可选）
├── MCP_Client/            # MCP客户端
│   ├── config/            # MCP服务器配置
│   └── src/               # MCP客户端源码
├── MCP_server/            # MCP服务器（可选，用于Web3功能）
│   └── web3-mcp/          # Web3区块链MCP服务器
├── echo_ai_console.py     # 交互式控制台
└── complete_sync.py       # MCP工具同步脚本
```

---

## 🚀 快速开始

### 🎯 一键配置脚本（推荐）

**新用户推荐使用一键配置脚本**，无需手动执行复杂的配置步骤：

```bash
# 1. 克隆项目
git clone <repo_url>
cd Demo_Echo_Backend/Backend

# 2. 配置环境变量（重要！）
cp backend/.env.example backend/.env
vim backend/.env  # 编辑配置必要的环境变量

**必须配置的环境变量**：
```bash
# 数据库连接（选择其一）
DATABASE_URL=mysql+pymysql://root:your_password@127.0.0.1:3306/echo_ai_db
# 或 SQLite: DATABASE_URL=sqlite:///./echo_db.db

# LLM API配置
OPENAI_API_KEY=your-api-key
API_BASE=https://your-api-endpoint
LLM_MODEL=gpt-4o

# JWT密钥
JWT_SECRET_KEY=your-jwt-secret-key-here
等等
```

# 3. 运行一键配置脚本
chmod +x setup.sh
./setup.sh

# 4. 启动服务
./start-backend.sh start
```


### 🔧 统一虚拟环境架构

**重要说明**：本项目采用统一虚拟环境架构，所有Python组件（后端服务、MCP客户端、工具同步脚本等）共享同一个虚拟环境，位于项目根目录的`.venv`。

**统一环境的优势**：
- ✅ **简化依赖管理**：避免多个虚拟环境间的版本冲突
- ✅ **统一MCP SDK版本**：确保所有组件使用相同的MCP协议版本
- ✅ **降低维护成本**：只需管理一个虚拟环境和依赖列表
- ✅ **避免路径问题**：消除硬编码路径和环境检测逻辑

**关于Playwright修复**：
之前Playwright工具同步失败的根本原因是**MCP SDK版本不兼容**。旧版本的MCP SDK无法正确处理现代MCP服务器的协议握手，导致连接超时。通过统一使用最新版本的MCP SDK（`git+https://github.com/modelcontextprotocol/python-sdk.git`），所有MCP服务器（包括Playwright、MiniMax、高德地图、Web3等）都能正常工作。

### 📁 工作目录说明
本文档中的所有命令都基于以下目录结构，请确保在正确的目录下执行相应命令：

```
Demo_Echo_Backend/           ← 项目根目录
├── backend/                 ← 后端开发目录
├── MCP_Client/             ← MCP客户端目录  
└── MCP_server/             ← MCP服务器目录（可选）
```

**重要提示**：
- 🏠 **项目根目录**：执行 `python echo_ai_console.py` 等根级脚本
- 🐍 **backend目录**：执行后端相关命令（数据库迁移、启动服务等）
- 🔧 **MCP_Client目录**：配置MCP服务器和客户端
- 🌐 **MCP_server目录**：构建Web3等自定义MCP服务器

### 📋 环境要求
- **Python**: 3.9+
- **Node.js**: 16+ （用于MCP服务）
- **数据库**: MySQL 5.7+ 或 SQLite
- **操作系统**: macOS, Linux, Windows

### 1️⃣ 项目克隆与环境准备
```bash
# 克隆项目
git clone <repo_url>
cd Demo_Echo_Backend

# 创建统一的Python虚拟环境（项目根目录）
python -m venv .venv

# 激活虚拟环境（选择适合你操作系统的命令）
# Linux/macOS:
source .venv/bin/activate
# Windows Command Prompt:
# .venv\Scripts\activate.bat
# Windows PowerShell:
# .venv\Scripts\Activate.ps1

# 安装所有Python依赖（包括后端和MCP客户端）
cd Backend/backend
pip install -r requirements.txt

# 安装MCP SDK（重要：确保版本兼容性）
pip install git+https://github.com/modelcontextprotocol/python-sdk.git
```

### 2️⃣ 数据库配置

#### 选项A：MySQL（推荐生产环境）
```bash
# 创建数据库
MYSQL_PWD=$(echo $DATABASE_URL | sed 's/.*:\/\/.*:\(.*\)@.*/\1/') mysql -u root -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME:-echo_ai_db} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

#### 选项B：SQLite（开发测试）
```bash
# SQLite无需额外创建，会自动生成数据库文件
```

#### 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件（重要！）
vim .env
```

**核心配置项：**
```bash
# 数据库连接（选择其一）
# MySQL:
DATABASE_URL=mysql+pymysql://root:your_password@127.0.0.1:3306/echo_ai_db
# SQLite:
# DATABASE_URL=sqlite:///./echo_db.db

# LLM API配置
LLM_MODEL=gpt-4o
API_BASE=https://your-api-endpoint
OPENAI_API_KEY=your-api-key

# JWT密钥
JWT_SECRET_KEY=your-jwt-secret-key-here

# 测试账户（可选自定义）
TEST_DEVELOPER_USERNAME=devuser_5090
TEST_DEVELOPER_PASSWORD=mryuWTGdMk
TEST_USER_USERNAME=testuser_5090
TEST_USER_PASSWORD=8lpcUY2BOt
TEST_ADMIN_USERNAME=adminuser_5090
TEST_ADMIN_PASSWORD=SAKMRtxCjT
```

### 3️⃣ MCP服务器配置

在执行数据库迁移之前，需要先配置MCP服务器，以便后续的工具同步能够正常工作：

```bash
# 进入MCP客户端目录（虚拟环境已在项目根目录激活）
cd ../MCP_Client

# 安装MCP客户端额外依赖（如果需要）
pip install openai python-dotenv loguru

# 配置MCP服务器（重要！）
vim config/mcp_servers.json
```

**MCP服务器配置示例：**
```json
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
```

### 4️⃣ 数据库迁移
```bash
# 返回后端目录
cd ../backend

# 执行数据库迁移
alembic upgrade head

# 验证表创建（MySQL）
mysql -u ${DB_USER} -p${DB_PASSWORD} -h ${DB_HOST} -P ${DB_PORT} ${DB_NAME} -e "SHOW TABLES;"
# 或验证表创建（SQLite）
sqlite3 echo_db.db ".tables"
```

**预期输出：**
```
alembic_version  app_tools  apps  logs  sessions  tools  users
```

### 5️⃣ 创建测试账户

使用现有脚本创建控制台测试所需的用户账户：

```bash
# 创建三个测试账户（根据.env文件中的配置）
source .env && python scripts/create_admin.py ${TEST_DEV_USERNAME} ${TEST_DEV_PASSWORD} ${TEST_DEV_ROLE}
source .env && python scripts/create_admin.py ${TEST_USER_USERNAME} ${TEST_USER_PASSWORD} ${TEST_USER_ROLE}
source .env && python scripts/create_admin.py ${TEST_ADMIN_USERNAME} ${TEST_ADMIN_PASSWORD} ${TEST_ADMIN_ROLE}
```
# 验证账户创建成功
python -c "
import sys, os
sys.path.append('.')
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker  
from app.models.user import User
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

users = db.query(User).all()
for user in users:
    print(f'用户: {user.username} | 角色: {user.role} | 活跃: {bool(user.is_active)}')
db.close()
"
```

**预期输出：**
```
已创建管理员用户 'devuser_5090'，ID: 1
操作成功完成，用户ID: 1，角色: developer
已创建管理员用户 'testuser_5090'，ID: 2
操作成功完成，用户ID: 2，角色: user
已创建管理员用户 'adminuser_5090'，ID: 3
操作成功完成，用户ID: 3，角色: admin

用户: devuser_5090 | 角色: UserRole.developer | 活跃: True
用户: testuser_5090 | 角色: UserRole.user | 活跃: True
用户: adminuser_5090 | 角色: UserRole.admin | 活跃: True
```

### 6️⃣ Web3区块链MCP服务器配置（可选）

如果需要Solana等区块链操作功能，可配置Web3 MCP服务器：

```bash
# 进入MCP_server目录
cd ../MCP_server

# 克隆web3-mcp项目
git clone https://github.com/strangelove-ventures/web3-mcp.git

# 进入项目目录并安装依赖
cd web3-mcp
npm install

# 创建环境配置文件
cp .env.example .env

# 编辑配置文件，启用需要的区块链（以Solana为例）
vim .env
```

**Web3 MCP环境配置示例：**
```bash
# 网络RPC配置
SOLANA_RPC_URL=https://api.devnet.solana.com

# 私钥配置（需要自行生成测试钱包）
SOLANA_PRIVATE_KEY=your_solana_private_key_base58

# 启用/禁用区块链工具
ENABLE_SOLANA_TOOLS=true
ENABLE_EVM_TOOLS=false
ENABLE_BITCOIN_TOOLS=false
ENABLE_LITECOIN_TOOLS=false
ENABLE_DOGECOIN_TOOLS=false
ENABLE_BITCOINCASH_TOOLS=false
ENABLE_THORCHAIN_TOOLS=false
ENABLE_RIPPLE_TOOLS=false
ENABLE_CARDANO_TOOLS=false
ENABLE_TON_TOOLS=false

# CoinGecko API Key
COINGECKO_API_KEY=CG-Z9ajuvwG1cheNJSByUgmvTgg
```

**生成Solana测试钱包：**
```bash
# 回到backend目录
cd ../../backend

# 创建钱包生成脚本
cat > generate_solana_wallet.js << 'EOF'
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58').default;

console.log('🔑 正在生成Solana测试钱包...\n');

const keypair = Keypair.generate();
const publicKey = keypair.publicKey.toString();
const privateKeyBase58 = bs58.encode(keypair.secretKey);

console.log('✅ 钱包生成成功！');
console.log('=====================================');
console.log('🏠 钱包地址 (Public Key):');
console.log(publicKey);
console.log('\n🔐 私钥 (Base58格式 - 用于MCP配置):');
console.log(privateKeyBase58);
console.log('=====================================');
console.log('\n📋 下一步操作:');
console.log('1. 复制上面的私钥到MCP配置文件的 SOLANA_PRIVATE_KEY');
console.log('2. 访问 https://faucet.solana.com/ 为钱包充值测试SOL');
console.log('3. 在faucet页面粘贴钱包地址:', publicKey);
EOF

# 安装依赖并生成钱包
npm install @solana/web3.js bs58
node generate_solana_wallet.js
```

**构建Web3 MCP服务器：**
```bash
# 返回web3-mcp目录
cd ../MCP_server/web3-mcp

# 构建项目
npm run build

# 验证构建成功
ls -la build/index.js
```

**更新MCP配置文件：**
```bash
# 编辑MCP服务器配置
cd ../../MCP_Client
vim config/mcp_servers.json
```

在MCP配置文件中启用web3-rpc服务器：
```json
{
  "mcpServers": {
    "web3-rpc": {
      "name": "Web3 区块链API",
      "description": "提供多链区块链服务（Solana等）",
      "command": "node",
      "args": [
        "../MCP_server/web3-mcp/build/index.js"
      ],
      "env": {
        "SOLANA_RPC_URL": "https://api.devnet.solana.com"
      },
      "enabled": true
    }
  }
}
```

### 7️⃣ MCP工具同步
```bash
# 确保在后端目录且虚拟环境已激活
cd Backend/backend

# 同步MCP工具到数据库
python complete_sync.py
```

**预期输出（仅配置基础MCP服务器）：**
```
🚀 开始完整MCP工具同步...
📋 发现 3 个MCP服务器:
  - playwright: 启用 (Playwright浏览器)
  - minimax-mcp-js: 启用 (MiniMax API)
  - amap-maps: 启用 (高德地图API)

✅ 新增工具: 45
🔄 更新工具: 0  
❌ 失败工具: 0

📋 数据库中现有 45 个工具:
🎉 同步成功完成!
```

**预期输出（配置了Web3服务器）：**
```
🚀 开始完整MCP工具同步...
📋 发现 4 个MCP服务器:
  - playwright: 启用 (Playwright浏览器)
  - minimax-mcp-js: 启用 (MiniMax API)
  - amap-maps: 启用 (高德地图API)
  - web3-rpc: 启用 (Web3 区块链API)

✅ 新增工具: 60
🔄 更新工具: 0  
❌ 失败工具: 0

📋 数据库中现有 60 个工具:
🔧 web3-rpc (14 个工具):
  - getMyAddress: 获取我的钱包地址
  - getBalance: 查看SOL余额
  - transfer: 转账SOL
  - executeSwap: 执行代币交换
  - getSplTokenBalances: 查看SPL代币余额
  - getCoinGeckoPrices: 获取代币价格
  ... (其他区块链工具)

🎉 同步成功完成!
```

**可用的Web3区块链操作：**
- **钱包管理**：查看地址、余额、账户信息
- **代币操作**：转账SOL、查看SPL代币、执行代币交换
- **价格查询**：获取实时代币价格、搜索代币信息
- **跨链桥接**：支持多链资产桥接和查询

> **⚠️ 安全提示**：Web3 MCP服务器配置了真实的区块链私钥，请确保：
> - 仅在测试网络使用
> - 使用专门的测试钱包，不要使用主钱包
> - 妥善保管私钥，不要提交到代码仓库
> - 定期检查钱包余额和交易记录
```

### 8️⃣ HTTP工具配置（可选）

系统支持集成外部HTTP API服务，包括Dify平台、Coze平台和通用HTTP API。通过数据库直接配置HTTP工具：

#### Dify平台配置
```sql
INSERT INTO tools (
  tool_id, name, type, description, endpoint, request_schema, 
  is_public, status, version, tags, download_count, created_at
) VALUES (
  'dify_chat_assistant',
  'Dify智能助手',
  'http',
  '基于Dify平台的智能对话助手',
  JSON_OBJECT(
    'platform', 'dify',
    'api_key', 'app-your_dify_api_key_here',
    'base_url', 'https://api.dify.ai/v1',
    'app_config', JSON_OBJECT('response_mode', 'blocking', 'timeout', 30)
  ),
  JSON_OBJECT(
    'type', 'object',
    'properties', JSON_OBJECT(
      'query', JSON_OBJECT('type', 'string', 'description', '用户的问题或请求')
    ),
    'required', JSON_ARRAY('query')
  ),
  1, 'active', '1.0.0', JSON_ARRAY('dify', 'chat', 'ai'), 0, NOW()
);
```

#### Coze平台配置
```sql
INSERT INTO tools (
  tool_id, name, type, description, endpoint, request_schema,
  is_public, status, version, tags, download_count, created_at
) VALUES (
  'coze_chat_assistant',
  'Coze智能助手',
  'http',
  '基于Coze平台的智能对话助手，支持多种AI模型',
  JSON_OBJECT(
    'platform', 'coze',
    'api_key', 'your_coze_api_key_here',
    'base_url', 'https://www.coze.cn/api/v3',
    'bot_id', 'your_bot_id_here',
    'user_id', 'default_user',
    'stream', false,
    'timeout', 30
  ),
  JSON_OBJECT(
    'type', 'object',
    'properties', JSON_OBJECT(
      'query', JSON_OBJECT('type', 'string', 'description', '用户的问题或请求'),
      'conversation_id', JSON_OBJECT('type', 'string', 'description', '会话ID（可选）', 'required', false)
    ),
    'required', JSON_ARRAY('query')
  ),
  1, 'active', '1.0.0', JSON_ARRAY('coze', 'chat', 'ai', 'bot'), 0, NOW()
);
```

#### 通用HTTP API配置
```sql
INSERT INTO tools (
  tool_id, name, type, description, endpoint, request_schema,
  is_public, status, version, tags, download_count, created_at
) VALUES (
  'generic_http_api',
  '通用HTTP API',
  'http',
  '支持自定义HTTP请求的通用API工具',
  JSON_OBJECT(
    'platform', 'generic',
    'base_url', 'https://your-api.example.com',
    'method', 'POST',
    'path', '/api/v1/chat',
    'headers', JSON_OBJECT(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer your_api_key_here'
    ),
    'timeout', 30
  ),
  JSON_OBJECT(
    'type', 'object',
    'properties', JSON_OBJECT(
      'message', JSON_OBJECT('type', 'string', 'description', '发送给API的消息'),
      'parameters', JSON_OBJECT('type', 'object', 'description', '额外参数（可选）', 'required', false)
    ),
    'required', JSON_ARRAY('message')
  ),
  1, 'active', '1.0.0', JSON_ARRAY('http', 'api', 'generic'), 0, NOW()
);
```

#### 执行配置
```bash
# 连接数据库执行SQL配置
# 先将上述SQL语句保存到文件，例如 http_tools_config.sql
mysql -u ${DB_USER} -p${DB_PASSWORD} -h ${DB_HOST} -P ${DB_PORT} ${DB_NAME} < http_tools_config.sql
# 或者直接在MySQL命令行中执行上述SQL语句
mysql -u ${DB_USER} -p${DB_PASSWORD} -h ${DB_HOST} -P ${DB_PORT} ${DB_NAME}
# 然后粘贴相应的INSERT语句
```

#### 配置参数说明

**Dify平台参数：**
- `api_key`: 从Dify应用设置中获取的API密钥
- `base_url`: Dify API基础URL（通常为 `https://api.dify.ai/v1`）
- `response_mode`: 响应模式，`blocking`为同步模式

**Coze平台参数：**
- `api_key`: 从Coze开发者控制台获取的API密钥
- `bot_id`: Coze机器人的唯一标识符
- `base_url`: Coze API基础URL（通常为 `https://www.coze.cn/api/v3`）

**通用HTTP API参数：**
- `method`: HTTP请求方法（GET, POST, PUT等）
- `path`: API端点路径
- `headers`: 请求头信息，包含认证信息
- `base_url`: API服务的基础URL

#### 验证HTTP工具配置
```bash
# 检查工具是否成功添加到数据库
mysql -u root -p echo_ai_db -e "SELECT tool_id, name, type FROM tools WHERE type='http';"

# 重启后端服务以加载新配置
# Ctrl+C停止当前服务，然后重启
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

### 9️⃣ 启动后端服务

**推荐使用启动脚本**（提供完整的生产级功能）：

```bash
# 启动服务（推荐）
./start-backend.sh start

# 其他启动选项
./start-backend.sh safe-start    # 安全启动（自动清理重复进程）
./start-backend.sh monitor       # 启动并监控服务（自动重启）
./start-backend.sh restart       # 重启服务
./start-backend.sh status        # 查看服务状态
./start-backend.sh stop          # 停止服务
```

**启动脚本功能特性**：
- ✅ **环境验证**：自动检查Python版本、依赖包、数据库连接
- ✅ **端口冲突处理**：智能检测和处理端口占用问题
- ✅ **进程管理**：安全的进程启动、停止和重启
- ✅ **健康检查**：实时监控服务状态和MCP服务器状态
- ✅ **日志管理**：自动日志轮转和错误追踪
- ✅ **系统服务**：支持安装为系统服务（开机自启动）

**传统启动方式**（仅开发测试）：
```bash
# 手动启动（不推荐生产环境）
cd backend
source ../.venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

**预期输出：**
```
✓ 环境验证通过
✓ 数据库连接检查通过  
✓ 后端服务启动成功！
ℹ 服务地址: http://localhost:3000
ℹ API文档: http://localhost:3000/docs
ℹ 健康检查: http://localhost:3000/health

=== MCP服务器启动状态 ===
MCP服务器总数: 3, 运行中: 3, 失败: 0
  ✓ playwright: 运行中 (重启次数: 0)
  ✓ minimax-mcp-js: 运行中 (重启次数: 0)
  ✓ amap-maps: 运行中 (重启次数: 0)
```

### 🔟 验证部署
```bash
# 验证API健康状态
curl http://localhost:3000/health

# 验证API文档
curl http://localhost:3000/docs

# 验证MCP工具状态
curl http://localhost:3000/api/v1/tools | jq '.[0:3]'
```

---

## 🖥️ 交互式控制台使用

### 启动控制台
```bash
# 返回项目根目录
cd ..

# 启动交互式控制台（自动登录开发者账号）
python echo_ai_console.py
```

### 测试功能
```bash
# 文字转语音测试
devuser_5090@echo-ai> 把"你好世界"文字转语音

# 网页访问测试
devuser_5090@echo-ai> 访问github.com

# 地图查询测试
devuser_5090@echo-ai> 查询北京今天的天气

# Web3区块链测试（如果已配置）
devuser_5090@echo-ai> 查看我的Solana钱包地址
devuser_5090@echo-ai> 查看我的SOL余额
devuser_5090@echo-ai> 获取SOL当前价格
devuser_5090@echo-ai> 查看我的SPL代币余额

# 退出控制台
devuser_5090@echo-ai> /quit
```

---

## 🛠️ 生产环境部署

### 系统服务安装

**安装为系统服务**（推荐生产环境）：

```bash
# 安装系统服务（开机自启动）
./start-backend.sh install-service

# 查看服务状态
sudo systemctl status echo-ai-backend

# 手动控制服务
sudo systemctl start echo-ai-backend
sudo systemctl stop echo-ai-backend
sudo systemctl restart echo-ai-backend

# 卸载系统服务
./start-backend.sh uninstall-service
```

### 服务监控和维护

**实时监控**：
```bash
# 启动监控模式（自动重启异常服务）
./start-backend.sh monitor

# 查看详细状态
./start-backend.sh status

# 强制清理（解决进程冲突）
./start-backend.sh cleanup
```

**日志管理**：
```bash
# 查看实时日志
tail -f logs/backend_manager.log

# 查看服务日志
tail -f backend/logs/backend_*.log

# 日志自动轮转（10MB，保留5个文件）
# 启动脚本会自动管理日志轮转
```

**性能监控**：
- CPU和内存使用率实时显示
- 网络连接数统计
- 服务重启次数追踪
- MCP服务器状态监控

## 🔧 常见问题排查

### 📋 1. 数据库连接问题
```bash
# 检查MySQL服务状态
sudo systemctl status mysql

# 测试数据库连接
mysql -u root -p -e "SELECT VERSION();"

# 检查数据库是否存在
mysql -u root -p -e "SHOW DATABASES LIKE 'echo_ai_db';"
```

### 📋 2. 数据库迁移失败
```bash
# 重置迁移状态
alembic stamp head

# 查看当前迁移状态
alembic current

# 重新执行迁移
alembic upgrade head
```

### 📋 3. MCP工具同步失败
```bash
# 检查Node.js和npm版本
node --version && npm --version

# 重新安装MCP包
npm install -g @playwright/mcp minimax-mcp-js @amap/amap-maps-mcp-server

# 检查MCP配置文件
cat MCP_Client/config/mcp_servers.json
```

### 📋 4. API密钥配置问题
```bash
# 验证OpenAI API密钥
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# 验证MiniMax API密钥  
curl -H "Authorization: Bearer $MINIMAX_API_KEY" \
     https://api.minimax.chat/v1/models
```

### 📋 5. 端口占用问题
```bash
# 检查端口占用
lsof -i :3000

# 杀死占用进程
sudo kill -9 $(lsof -t -i:3000)
```

### 📋 6. Web3区块链功能问题
```bash
# 检查web3-mcp服务器构建
ls -la MCP_server/web3-mcp/build/index.js

# 验证Solana钱包地址格式
echo "钱包地址应该是44个字符的Base58编码"

# 测试Solana RPC连接
curl -X POST https://api.devnet.solana.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'

# 检查私钥格式（应该是Base58格式）
echo "私钥应该是Base58编码，约87-88个字符"

# 验证web3-mcp环境变量
cd MCP_server/web3-mcp && cat .env | grep SOLANA
```

---

## 🎯 启动脚本详细说明

### 启动脚本功能概览

<mcfile name="start-backend.sh" path="/home/devbox/project/Backend/start-backend.sh"></mcfile> 提供了完整的后端服务管理功能：

**基础命令**：
```bash
./start-backend.sh start          # 启动服务（包含完整检查）
./start-backend.sh safe-start     # 安全启动（自动清理重复进程）
./start-backend.sh stop           # 停止服务
./start-backend.sh restart        # 重启服务
./start-backend.sh status         # 显示服务状态和日志
./start-backend.sh monitor        # 启动监控模式（自动重启）
./start-backend.sh cleanup        # 强制清理所有相关进程
```

**系统服务命令**：
```bash
./start-backend.sh install-service    # 安装为系统服务
./start-backend.sh uninstall-service  # 卸载系统服务
```

### 启动前自动检查项

启动脚本会自动执行以下检查，确保服务稳定运行：

1. **环境验证**：
   - Python版本检查（需要3.8+）
   - 虚拟环境存在性验证
   - 必要系统命令检查
   - 端口范围验证

2. **依赖检查**：
   - Python包依赖验证
   - 系统工具可用性检查
   - 配置文件存在性验证

3. **数据库连接检查**：
   - 强制要求MySQL数据库
   - 连接参数验证
   - 数据库权限检查

4. **端口冲突处理**：
   - 智能检测端口占用
   - 区分自有服务和外部进程
   - 提供交互式冲突解决

### 服务监控功能

**实时状态显示**：
- 服务运行状态（PID、端口、健康检查）
- 系统资源使用（CPU、内存）
- 网络连接统计
- 服务运行时间和重启次数
- MCP服务器状态详情

**自动重启机制**：
- 健康检查失败自动重启
- 最大重启次数限制
- 重启间隔控制
- 失败日志记录

### 日志管理

**自动日志轮转**：
- 日志文件大小限制（10MB）
- 保留历史文件数量（5个）
- 按时间戳命名日志文件
- 自动清理过期日志

**日志位置**：
```bash
logs/backend_manager.log          # 启动脚本日志
backend/logs/backend_*.log        # 服务运行日志
```

---

## 📚 总结

此次完整的项目复现流程包含以下关键步骤：

1. **✅ 环境准备**：Python 3.9+、MySQL、Node.js环境配置
2. **✅ 数据库初始化**：创建数据库、执行Alembic迁移、创建必要表结构
3. **✅ 用户账户管理**：使用脚本创建developer、user、admin三种角色测试账户
4. **✅ MCP服务集成**：配置Playwright、MiniMax、高德地图等外部服务
5. **✅ 工具同步验证**：确保所有MCP工具正确同步到数据库
6. **✅ 服务启动测试**：验证后端API、交互式控制台功能完整性

**关键修复的问题：**
- 数据库迁移脚本sessions表缺少status字段
- Tool模型主键类型不一致导致的外键约束失败
- MCP工具同步流程和配置文件管理
- Web3 MCP服务器配置和Solana区块链集成

**新增功能特性：**
- ✅ Web3区块链操作支持（Solana转账、代币交换、余额查询）
- ✅ 多链区块链工具集成（支持Solana、以太坊等多个区块链）
- ✅ 实时代币价格查询和市场数据获取
- ✅ 跨链桥接和去中心化金融(DeFi)操作
- ✅ 完整的区块链钱包管理和安全保护

## 📋 部署方式对比

| 部署方式 | 适用场景 | 优势 | 劣势 |
|---------|---------|------|------|
| **一键配置脚本** | 新用户、快速部署 | 全自动配置、零错误 | 需要预先配置环境变量 |
| **启动脚本** | 生产环境、日常运维 | 完整监控、自动重启 | 需要手动配置依赖 |
| **手动启动** | 开发调试 | 灵活控制、实时日志 | 缺少监控和错误处理 |
| **系统服务** | 生产服务器 | 开机自启、系统集成 | 需要root权限 |

## 🎉 总结

项目现在具备完整的迁移性和鲁棒性，包含传统AI功能和Web3区块链操作能力，可以在新环境中顺利复现部署。无论是语音交互、网页自动化还是区块链操作，都能通过统一的对话界面进行控制。

**推荐部署流程**：
1. 🚀 **新用户**：使用一键配置脚本 `./setup.sh`
2. 🛠️ **日常运维**：使用启动脚本 `./start-backend.sh`
3. 🏭 **生产环境**：安装系统服务 `./start-backend.sh install-service`
4. 🔍 **问题排查**：查看详细日志和状态信息
