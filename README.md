# Echo 智能语音 AI-Agent 开放平台

## 项目简介

Echo 是一个基于 Python FastAPI 后端的智能语音 AI-Agent 开放平台，支持语音全流程交互、意图识别、工具调用等功能。系统可集成 MCP 服务和各类 HTTP API，实现丰富的技能服务。

## 核心特性

- **🎙️ 语音全流程交互**：支持语音输入、意图识别、语音合成输出
- **🛠️ 多种工具集成**：
  - MCP 服务集成（Playwright浏览器自动化、MiniMax语音合成、高德地图、Web3区块链）
  - HTTP 工具支持（Dify平台、Coze平台、通用HTTP API）
- **🧠 意图识别与确认**：使用大语言模型解析用户意图并生成确认提示
- **🔒 安全认证**：JWT 身份验证与权限管理
- **💬 多轮对话管理**：会话状态跟踪与上下文保持
- **📊 日志与监控**：详细操作记录，便于审计与排查
- **🖥️ 交互式控制台**：内置测试和调试工具

## 技术栈

- **后端**：Python 3.9+, FastAPI, SQLAlchemy, Alembic, Pydantic
- **数据库**：MySQL 5.7+
- **AI服务**：兼容 OpenAI API 的 LLM 服务
- **认证**：JWT
- **MCP工具**：Playwright, MiniMax, 高德地图, Web3
- **部署**：Uvicorn, PM2

## 前置要求

- **Python 3.9+**
- **Node.js 16+** (用于MCP服务器)
- **MySQL 5.7+**
- **Git**

## 项目结构

```
Demo_Echo_Backend/
├── backend/                 # 后端服务
│   ├── alembic/            # 数据库迁移
│   ├── app/                # 应用主目录
│   │   ├── controllers/    # 控制器
│   │   ├── models/         # 数据库模型
│   │   ├── routers/        # API路由
│   │   ├── schemas/        # 数据验证模型
│   │   ├── services/       # 业务逻辑
│   │   ├── utils/          # 工具函数
│   │   └── main.py         # 应用入口
│   ├── logs/               # 日志文件
│   ├── requirements.txt    # Python依赖
│   └── .env.example        # 环境变量示例
├── MCP_Client/             # MCP客户端（使用主虚拟环境）
│   ├── config/            # MCP配置
│   │   ├── README.md      # 配置说明
│   │   ├── mcp_servers.json.example  # 配置模板
│   │   └── mcp_servers.json  # 实际配置（需手动创建）
│   ├── src/               # 源代码
│   │   ├── mcp/           # MCP协议实现
│   │   └── utils/         # 工具函数
│   ├── .env.example       # 环境变量模板
│   ├── .env               # 环境变量配置（需手动创建）
│   ├── mcp_client.py      # 主客户端脚本
│   ├── get_tools.py       # 工具获取脚本
│   └── standalone_tool_call.py  # 独立工具调用测试
├── MCP_server/            # MCP服务器
├── logs/                  # 项目日志
├── start-backend.sh       # 后端启动脚本
├── start-pm2.sh          # PM2启动脚本
├── echo_ai_console.py    # 交互式控制台
└── complete_sync.py      # MCP工具同步脚本
```

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd Demo_Echo_Backend
```

### 2. 准备 MySQL 数据库

创建 MySQL 数据库和用户：

```sql
-- 登录MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE echo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户并授权
CREATE USER 'echo_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON echo_db.* TO 'echo_user'@'localhost';
FLUSH PRIVILEGES;

-- 退出MySQL
EXIT;
```

### 3. 创建并配置 Python 虚拟环境

```bash
# 在项目根目录创建虚拟环境
python3 -m venv .venv

# 激活虚拟环境
source .venv/bin/activate  # Linux/macOS
# 或 Windows: .venv\Scripts\activate

# 升级pip
pip install --upgrade pip

# 安装后端依赖
pip install -r backend/requirements.txt
```

### 4. 安装 Node.js 依赖（MCP服务器）

```bash
# 安装项目级Node.js依赖
npm install

# 全局安装必要的MCP包（可选，项目已配置本地使用）
npm install -g @playwright/mcp minimax-mcp-js @amap/amap-maps-mcp-server
```

### 5. 配置环境变量

```bash
# 复制环境变量模板
cp backend/.env.example backend/.env

# 编辑配置文件
vim backend/.env
```

**必须修改的配置项：**

```ini
# 数据库连接（必须修改）
DATABASE_URL=mysql+pymysql://echo_user:your_strong_password@localhost:3306/echo_db


# LLM配置（必须配置）
LLM_API_KEY=your-llm-api-key
LLM_MODEL=gpt-4o
LLM_API_BASE=https://api.openai.com/v1

# MCP脚本路径（根据实际路径修改）
MCP_SCRIPT_PATH=/path/to/your/project/MCP_Client/src/mcp_client.py
```

**可选配置项（有默认值）：**

```ini
# 应用配置
APP_NAME=FullVoiceAI
ENV=development
DEBUG=true
PORT=3000

# 区块链配置（如使用Web3功能）
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### 6. 数据库初始化

```bash
# 切换到后端目录
cd backend

# 运行数据库迁移
alembic upgrade head

# 返回项目根目录
cd ..
```

### 7. 启动服务

#### 方法一：使用启动脚本（推荐）

```bash
# 安全启动（自动检查环境、数据库、清理冲突进程）
./start-backend.sh safe-start
```

#### 方法二：手动启动

```bash
# 确保虚拟环境已激活
source .venv/bin/activate

# 启动后端服务
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

#### 方法三：使用 PM2（生产环境）

```bash
# 安装PM2
npm install -g pm2

# 使用PM2启动
./start-pm2.sh
```

### 8. 验证安装

启动成功后，访问以下地址验证：

- **后端服务**：http://localhost:3000
- **API文档**：http://localhost:3000/docs
- **健康检查**：http://localhost:3000/health
- **MCP状态**：http://localhost:3000/api/v1/mcp/health

## 交互式测试

项目提供了交互式控制台，方便测试各种功能：

```bash
# 启动交互式控制台（自动登录开发者账号）
python echo_ai_console.py
```

**测试示例：**
```
> 把"你好世界"文字转语音
> 访问github.com
> 查询北京今天的天气
```

**内置测试账号：**
- 开发者: `devuser_5090` / `mryuWTGdMk` (默认自动登录)
- 普通用户: `testuser_5090` / `8lpcUY2BOt`
- 管理员: `adminuser_5090` / `SAKMRtxCjT`

## MCP 工具配置

### 支持的 MCP 工具

1. **Playwright浏览器自动化**
   - 功能：网页访问、搜索、截图等
   - 测试：`"访问github.com"`, `"在百度搜索'人工智能'"`

2. **MiniMax语音合成**
   - 功能：文字转语音
   - 测试：`"把'你好世界'文字转语音"`
   - 配置：需要 MiniMax API Key

3. **高德地图**
   - 功能：地理位置查询、地址搜索
   - 测试：`"查询北京的地理位置"`
   - 配置：需要高德地图API Key

4. **Web3区块链**
   - 功能：区块链查询、转账等操作
   - 测试：`"查询SOL币价格"`
   - 配置：需要Solana RPC URL

### MCP_Client 详细配置

> **注意**：MCP_Client 使用与后端相同的虚拟环境，无需单独安装依赖。所有需要的包已在步骤3中安装。

#### 1. 配置 MCP_Client 环境变量

> **重要优化**：MCP_Client 会自动使用 `backend/.env` 中的 LLM 配置，避免重复配置。只有在需要不同配置时才需要单独设置。

```bash
cd MCP_Client

# 复制环境变量模板（可选）
cp .env.example .env

# 如需独立配置，编辑配置文件
vim .env
```

**环境变量说明：**

1. **LLM 配置（通常不需要设置）**：
   - MCP_Client 会自动使用 `backend/.env` 中的 `LLM_API_KEY`、`LLM_MODEL`、`LLM_API_BASE`
   - 只有在需要使用不同的 LLM 配置时才在 `MCP_Client/.env` 中设置

2. **MCP 专用配置**：
   ```ini
   # MCP 服务器配置文件路径
   MCP_SERVERS_PATH="config/mcp_servers.json"
   
   # 日志和调试配置
   LOG_LEVEL="INFO"
   DEBUG_MODE=false
   ```

#### 2. 配置 MCP 服务器

```bash
cd config

# 复制配置模板（如果不存在）
cp mcp_servers.json.example mcp_servers.json

# 编辑服务器配置
vim mcp_servers.json
```

**完整的 mcp_servers.json 配置示例：**

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
      "description": "提供MiniMax语音大语言模型接口",
      "command": "npx",
      "args": ["-y", "minimax-mcp-js"],
      "env": {
        "MINIMAX_API_KEY": "your_minimax_api_key_here",
        "MINIMAX_API_HOST": "https://api.minimax.chat",
        "MINIMAX_MCP_BASE_PATH": "/your/project/path/MCP_server/minimax-mcp-js/outputs",
        "MINIMAX_RESOURCE_MODE": "file"
      },
      "enabled": true
    },
    "amap-maps": {
      "name": "高德地图API",
      "description": "提供高德地图服务和位置信息",
      "command": "npx",
      "args": ["-y", "@amap/amap-maps-mcp-server"],
      "env": {
        "AMAP_MAPS_API_KEY": "your_amap_api_key_here"
      },
      "enabled": true
    },
    "web3-rpc": {
      "name": "Web3 区块链API",
      "description": "提供多链区块链服务",
      "command": "node",
      "args": ["/your/project/path/MCP_server/web3-mcp/build/index.js"],
      "env": {
        "SOLANA_RPC_URL": "https://api.mainnet-beta.solana.com"
      },
      "enabled": false
    }
  },
  "defaultServer": "null",
  "environmentVariables": {
    "MCP_SERVER_PORT": "3001",
    "MCP_SERVER_HOST": "0.0.0.0",
    "MCP_LOG_LEVEL": "INFO"
  },
  "connection": {
    "timeout": 120,
    "retry": {
      "attempts": 3,
      "delay": 2
    }
  }
}
```

#### 3. 重要配置说明

**API密钥获取：**

1. **MiniMax API**：
   - 访问：https://api.minimax.chat
   - 获取API密钥后填入 `MINIMAX_API_KEY`
   - 设置 `MINIMAX_RESOURCE_MODE: "file"` 避免OSS权限问题

2. **高德地图API**：
   - 访问：https://lbs.amap.com/dev
   - 获取API密钥后填入 `AMAP_MAPS_API_KEY`

3. **路径配置**：
   - `MINIMAX_MCP_BASE_PATH`：指向MiniMax输出目录的绝对路径
   - Web3服务器路径：根据实际部署位置调整

**安全注意事项：**

⚠️ **重要**：
- 永远不要将真实的API密钥提交到版本控制系统
- 使用 `.env.example` 作为模板，实际密钥保存在 `.env` 中
- 定期更换API密钥确保安全

### MCP 工具同步

```bash
# 同步所有MCP服务器的工具到数据库
python complete_sync.py
```

### MCP_Client 独立使用

```bash
# 确保主虚拟环境已激活
source .venv/bin/activate

cd MCP_Client

# 直接运行MCP客户端
python mcp_client.py

# 或使用配置文件中的服务器ID
python mcp_client.py --server-id minimax

# 获取工具列表
python get_tools.py

# 独立工具调用测试
python standalone_tool_call.py
```

## 服务管理

### 使用启动脚本管理

```bash
# 启动服务
./start-backend.sh start

# 停止服务
./start-backend.sh stop

# 重启服务
./start-backend.sh restart

# 查看状态
./start-backend.sh status

# 监控服务（自动重启）
./start-backend.sh monitor

# 强制清理
./start-backend.sh cleanup
```

### 系统服务安装（开机自启）

```bash
# 安装为系统服务
./start-backend.sh install-service

# 卸载系统服务
./start-backend.sh uninstall-service
```

## API 接口

### 核心端点

- **健康检查**: `GET /health`
- **API文档**: `GET /docs`
- **用户认证**: `POST /api/v1/auth/login`
- **意图解析**: `POST /api/v1/intent/parse`
- **工具执行**: `POST /api/v1/tools/execute`
- **MCP状态**: `GET /api/v1/mcp/health`

### 认证

使用JWT Bearer Token认证：

```bash
# 登录获取token
curl -X POST "http://localhost:3000/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser_5090", "password": "8lpcUY2BOt"}'

# 使用token访问API
curl -H "Authorization: Bearer your_jwt_token" \
     "http://localhost:3000/api/v1/tools"
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   ```bash
   # 检查数据库服务
   sudo systemctl status mysql
   
   # 检查连接
   mysql -u echo_user -p echo_db
   ```

2. **端口被占用**
   ```bash
   # 查看端口占用
   lsof -i :3000
   
   # 强制清理
   ./start-backend.sh cleanup
   ```

3. **MCP工具调用失败**
   ```bash
   # 检查Node.js依赖
   npm list -g @playwright/mcp minimax-mcp-js @amap/amap-maps-mcp-server
   
   # 重新安装MCP包
   npm install -g @playwright/mcp minimax-mcp-js @amap/amap-maps-mcp-server
   
   # 检查MCP_Client配置
   cd MCP_Client
   python mcp_client.py --help
   ```

4. **MCP_Client配置问题**
   ```bash
   # 检查LLM配置优先级（MCP_Client会自动选择配置）
   source .venv/bin/activate
   cd MCP_Client
   python -c "
   import os
   from dotenv import load_dotenv
   
   # 检查配置文件存在情况
   mcp_env = os.path.exists('.env')
   backend_env = os.path.exists('../backend/.env')
   print(f'MCP_Client .env: {mcp_env}')
   print(f'Backend .env: {backend_env}')
   
   # 加载环境变量
   if mcp_env:
       load_dotenv('.env')
       print('使用MCP_Client配置')
   elif backend_env:
       load_dotenv('../backend/.env')
       print('使用后端配置')
   
   print(f'LLM_API_KEY: {\"已设置\" if os.getenv(\"LLM_API_KEY\") else \"未设置\"}')
   "
   
   # 检查服务器配置
   cat config/mcp_servers.json
   
   # 测试连接
   python get_tools.py
   ```

5. **后端虚拟环境问题**
   ```bash
   # 重新创建后端虚拟环境
   rm -rf .venv
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```

6. **API密钥问题**
   ```bash
   # 检查MiniMax API密钥
   curl -H "Authorization: Bearer YOUR_MINIMAX_KEY" \
        "https://api.minimax.chat/v1/models"
   
   # 检查OpenAI API密钥
   curl -H "Authorization: Bearer YOUR_OPENAI_KEY" \
        "https://api.openai.com/v1/models"
   ```

7. **路径配置问题**
   - 确保 `MINIMAX_MCP_BASE_PATH` 指向实际存在的目录
   - 检查 Web3 服务器路径是否正确
   - 确保 `MCP_SCRIPT_PATH` 在后端 `.env` 中指向正确的路径

### 日志查看

```bash
# 查看应用日志
tail -f logs/app.log

# 查看API日志
tail -f backend/logs/api.log

# 查看启动脚本日志
tail -f logs/backend_manager.log
```

### 调试模式

在交互式控制台中使用 `/debug` 命令切换调试模式，显示详细的HTTP请求/响应信息。

## 开发指南

### 添加新的工具

1. 在数据库中添加工具记录
2. 实现工具执行逻辑
3. 更新MCP配置（如果是MCP工具）
4. 运行同步脚本更新数据库

### API开发

参考现有的路由文件：
- `backend/app/routers/` - API路由定义
- `backend/app/controllers/` - 业务逻辑控制器
- `backend/app/services/` - 核心服务逻辑

### 数据库迁移

```bash
cd backend

# 生成新的迁移文件
alembic revision --autogenerate -m "描述变更"

# 应用迁移
alembic upgrade head

# 查看迁移历史
alembic history
```

## 部署说明

### 开发环境
- 使用 `./start-backend.sh safe-start`
- 启用调试模式和自动重载

### 生产环境
1. 设置环境变量 `ENV=production`
2. 使用 `./start-backend.sh install-service` 安装系统服务
3. 配置反向代理（Nginx等）
4. 设置防火墙规则
5. 定期备份数据库

## 许可证

[MIT](LICENSE)

## 支持

如果遇到问题，请：

1. 查看本文档的故障排除部分
2. 使用 `./start-backend.sh status` 检查服务状态
3. 查看日志文件获取详细错误信息
4. 使用交互式控制台测试功能