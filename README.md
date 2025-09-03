# Echo 智能语音 AI-Agent 开放平台

## 📖 项目简介
Echo是一个基于Python(FastAPI)后端和React前端的智能语音AI-Agent开放平台，支持语音全流程交互、意图识别、工具调用等功能。系统可集成MCP服务和各类HTTP API，实现丰富的技能服务。

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
├── echo_ai_console.py     # 交互式控制台
└── complete_sync.py       # MCP工具同步脚本
```

---

## 🚀 快速开始

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

# 创建并激活Python虚拟环境
cd backend
python -m venv venv
source venv/bin/activate  # Linux/macOS
# Windows: venv\Scripts\activate

# 安装Python依赖
pip install -r requirements.txt
```

### 2️⃣ 数据库配置

#### 选项A：MySQL（推荐生产环境）
```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS echo_ai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
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

### 3️⃣ 数据库迁移
```bash
# 执行数据库迁移
alembic upgrade head

# 验证表创建（MySQL）
mysql -u root -p echo_ai_db -e "SHOW TABLES;"
# 或验证表创建（SQLite）
sqlite3 echo_db.db ".tables"
```

**预期输出：**
```
alembic_version  app_tools  apps  logs  sessions  tools  users
```

### 4️⃣ 创建测试账户

使用现有脚本创建控制台测试所需的用户账户：

```bash
# 创建三个测试账户（根据.env文件中的配置）
python scripts/create_admin.py devuser_5090 mryuWTGdMk developer
python scripts/create_admin.py testuser_5090 8lpcUY2BOt user  
python scripts/create_admin.py adminuser_5090 SAKMRtxCjT admin

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

### 5️⃣ MCP客户端配置
```bash
# 进入MCP客户端目录
cd ../MCP_Client

# 创建MCP虚拟环境（独立于后端）
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# Windows: .venv\Scripts\activate

# 安装MCP依赖
pip install openai python-dotenv loguru
pip install git+https://github.com/modelcontextprotocol/python-sdk.git

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
        "MINIMAX_MCP_BASE_PATH": "/path/to/outputs",
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
    },
    "web3-rpc": {
      "name": "Web3 区块链API",
      "description": "提供多链区块链服务（Solana等）",
      "command": "node",
      "args": [
        "/path/to/your/project/MCP_server/web3-mcp/build/index.js"
      ],
      "env": {
        "SOLANA_RPC_URL": "https://api.devnet.solana.com"
      },
      "enabled": false
    }
  }
}
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
        "/Users/your_username/path/to/MCP_server/web3-mcp/build/index.js"
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
# 返回后端目录
cd ../backend
source venv/bin/activate

# 同步MCP工具到数据库
python complete_sync.py
```

**预期输出：**
```
🚀 开始完整MCP工具同步...
📋 发现 4 个MCP服务器:
  - playwright: 启用 (Playwright浏览器)
  - minimax-mcp-js: 启用 (MiniMax API)
  - amap-maps: 启用 (高德地图API)
  - web3-rpc: 启用 (Web3 区块链API)

✅ 新增工具: 57
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

### 8️⃣ 启动后端服务
```bash
# 启动开发服务器
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000

# 或使用生产模式
uvicorn app.main:app --host 0.0.0.0 --port 3000
```

**预期输出：**
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:3000 (Press CTRL+C to quit)
```

### 9️⃣ 验证部署
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

## 🎯 一键部署脚本

如果你遇到任何问题，可以使用以下脚本进行一键部署验证：

```bash
#!/bin/bash
echo "🚀 Echo AI 项目一键部署验证脚本"

# 1. 环境检查
echo "🔍 1. 检查环境..."
python3 --version
node --version
mysql --version

# 2. 创建数据库
echo "🗄️ 2. 创建数据库..."
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS echo_ai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. 虚拟环境设置
echo "🐍 3. 设置Python虚拟环境..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. 数据库迁移
echo "📋 4. 执行数据库迁移..."
alembic upgrade head

# 5. 创建测试账户
echo "👤 5. 创建测试账户..."
python scripts/create_admin.py devuser_5090 mryuWTGdMk developer
python scripts/create_admin.py testuser_5090 8lpcUY2BOt user
python scripts/create_admin.py adminuser_5090 SAKMRtxCjT admin

# 6. MCP工具同步
echo "🔧 6. 同步MCP工具..."
python complete_sync.py

# 7. 启动验证
echo "✅ 7. 启动服务验证..."
uvicorn app.main:app --host 0.0.0.0 --port 3000 &
sleep 5
curl -f http://localhost:3000/health && echo "✅ 后端服务正常" || echo "❌ 后端服务异常"

echo "🎉 部署完成！访问 http://localhost:3000/docs 查看API文档"
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

项目现在具备完整的迁移性和鲁棒性，包含传统AI功能和Web3区块链操作能力，可以在新环境中顺利复现部署。无论是语音交互、网页自动化还是区块链操作，都能通过统一的对话界面进行控制。