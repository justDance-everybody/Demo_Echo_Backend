# Echo 智能语音 AI-Agent 开放平台

## 项目简介
Echo是一个基于Python(FastAPI)后端和React前端的智能语音AI-Agent开放平台，支持语音全流程交互、意图识别、工具调用等功能。系统可集成MCP服务和各类HTTP API，实现丰富的技能服务。

## 主要特性
- **语音全流程交互**：支持语音输入、意图识别、语音合成输出
- **多种工具集成**：
  - MCP服务集成（支持区块链、Web3等复杂场景）
  - HTTP工具支持（Dify平台、Coze平台、通用HTTP API）
- **意图识别与确认**：使用大语言模型(LLM)解析用户意图并生成确认提示
- **安全认证**：JWT身份验证与权限管理
- **多轮对话管理**：会话状态跟踪与上下文保持
- **日志与监控**：详细操作记录，便于审计与排查

## 技术栈
- **后端**：Python 3.9+, FastAPI, SQLAlchemy, Alembic, Pydantic
- **前端**：React, Material UI, Web Speech API
- **数据库**：MySQL
- **AI服务**：兼容OpenAI API的LLM服务
- **认证**：JWT
- **部署**：Uvicorn, PM2

## 项目结构
```
project/
├── .env                   # 统一环境变量配置 (被 .gitignore 忽略)
├── .env.example           # 环境变量配置模板
├── README.md              # 项目总览和详细说明
├── backend/               # 后端服务目录
│   ├── app/
│   │   ├── config.py      # 配置加载 (从根目录 .env 读取)
│   │   ├── main.py        # FastAPI 应用入口
│   │   └── ...            # 其他模块 (routers, services, models, utils)
│   ├── alembic/           # 数据库迁移工具
│   ├── requirements.txt   # Python依赖
│   └── start-backend.sh   # 后端启动脚本
├── MCP_Client/            # MCP客户端目录
│   ├── config/
│   │   └── mcp_servers.json # MCP服务器配置 (被 .gitignore 忽略)
│   ├── mcp_client.py      # MCP客户端核心逻辑
│   ├── standalone_tool_call.py # 独立工具调用脚本
│   └── ...                # 其他MCP相关文件
├── MCP_server/            # MCP服务器实现
└── docs/                  # 文档目录
    └── 后端开发文档.md
```

## 安装与配置

### 依赖环境
- Python 3.9+
- Node.js 16+
- MySQL 5.7+
- (推荐)虚拟环境管理工具：venv, uv等

### 后端安装与配置
1. 克隆仓库并进入后端目录
```bash
git clone <repo_url>
cd project/backend
```

2. 创建并激活虚拟环境
```bash
python -m venv venv
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate  # Windows
```

3. 安装依赖
```bash
pip install -r requirements.txt
```

## 🔧 **环境配置指南**

### 📄 **环境变量配置 (.env)**

在项目根目录创建 `.env` 文件，配置所有必要的环境变量：

```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑配置文件
vim .env
```

**核心配置项说明**：

```bash
# ==============================================
# Echo 智能语音 AI-Agent 开放平台 - 统一环境配置
# ==============================================

# 应用基础配置
APP_NAME="AI Assistant API"
VERSION="0.1.0"
API_PREFIX="/api/v1"
ENV="development"
DEBUG=True

# 服务器配置
HOST=0.0.0.0
PORT=3000

# 数据库配置 (MySQL) - 必填
DATABASE_URL="mysql+pymysql://用户名:密码@主机:端口/数据库名"
DATABASE_NAME="ai_assistant"

# LLM配置 (必填) - 支持 OpenAI 兼容接口
LLM_API_KEY="你的LLM服务API密钥"
LLM_API_BASE="https://api.openai.com/v1"  # 或其他兼容接口
LLM_MODEL="gpt-3.5-turbo"                 # 或其他模型
LLM_TIMEOUT=60
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=1000

# JWT认证配置 (会自动生成，也可手动设置)
JWT_SECRET="自动生成的安全密钥"
JWT_ALGORITHM="HS256"
JWT_EXPIRATION=10080

# 测试账号配置 (可选，用于测试)
TEST_DEVELOPER_USERNAME=""
TEST_DEVELOPER_PASSWORD=""
TEST_USER_USERNAME=""
TEST_USER_PASSWORD=""
TEST_ADMIN_USERNAME=""
TEST_ADMIN_PASSWORD=""
```

### 🌐 **MCP服务器配置 (mcp_servers.json)**

在 `MCP_Client/config/` 目录下创建 `mcp_servers.json` 文件：

```bash
# 1. 复制配置模板
cp MCP_Client/config/mcp_servers.json.example MCP_Client/config/mcp_servers.json

# 2. 编辑配置文件
vim MCP_Client/config/mcp_servers.json
```

**配置文件示例**：

```json
{
  "servers": {
    "amap-maps": {
      "command": "npx",
      "args": ["-y", "@amap/amap-maps-mcp-server"],
      "env": {
        "AMAP_MAPS_API_KEY": "你的高德地图API密钥"
      }
    },
    "minimax-mcp-js": {
      "command": "node",
      "args": ["/home/devbox/project/MCP_server/minimax-mcp-js/dist/index.js"],
      "env": {
        "MINIMAX_API_KEY": "你的MiniMax API密钥"
      }
    },
    "web3-mcp": {
      "command": "node",
      "args": ["/home/devbox/project/MCP_server/web3-mcp/dist/index.js"],
      "env": {
        "SOLANA_RPC_URL": "https://api.mainnet-beta.solana.com"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    }
  },
  "connection": {
    "timeout": 30,
    "retry": {
      "attempts": 3,
      "delay": 2
    }
  }
}
```

**获取API密钥**：
- **高德地图API**: [https://console.amap.com](https://console.amap.com) 注册申请
- **MiniMax API**: [https://www.minimaxi.com](https://www.minimaxi.com) 申请开发者账号

4. 数据库迁移
```bash
cd backend
alembic upgrade head
```

### MCP_Client 配置

MCP客户端是一个轻量级的Python工具，用于连接和调用各种MCP（Model Context Protocol）服务。它作为我们智能语音AI平台的一个核心组件，处理与各种AI模型和服务的通信。

#### 主要功能
- 连接到MCP服务器（如MiniMax、Web3、地图服务等）
- 代理API请求到相应的MCP服务
- 提供统一的接口供主应用程序调用
- 支持直接模式和服务模式两种运行方式

#### 安装和配置

1. 进入MCP_Client目录
```bash
cd project/MCP_Client
```

2. 创建并激活虚拟环境
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# 或
.venv\Scripts\activate  # Windows
```

3. 安装依赖
```bash
pip install openai python-dotenv
pip install git+https://github.com/modelcontextprotocol/python-sdk.git
```

#### MCP服务器配置

创建`MCP_Client/config/mcp_servers.json`文件（参考前面的详细配置示例）。

**注意**：`mcp_servers.json`文件包含敏感的API密钥，已被添加到`.gitignore`中，需要手动创建和配置。

#### 使用方式

**直接模式（测试用）**：
```bash
# 连接到指定MCP服务器
python MCP_Client/mcp_client.py --server-name amap-maps

# 或使用独立工具调用脚本
python MCP_Client/standalone_tool_call.py amap-maps maps_weather '{"city": "深圳"}'
```

**服务模式（通过后端API）**：
MCP_Client由主应用程序的后端通过内部API调用，无需手动启动。

#### 代码结构
```
MCP_Client/
├── config/               # 配置文件
│   ├── mcp_servers.json  # MCP服务器配置（需手动创建）
│   └── .gitignore        # 忽略敏感配置文件
├── mcp_client.py         # 主客户端实现
├── standalone_tool_call.py # 独立工具调用脚本
└── .venv/               # Python虚拟环境
```

#### 故障排除

**常见问题**：
1. **连接失败** - 检查MCP服务器路径和NPM包安装
2. **API密钥错误** - 确认mcp_servers.json中的API密钥正确
3. **会话初始化失败** - 查看日志，可能需要使用独立调用模式
4. **模块找不到** - 确认虚拟环境已激活且依赖已安装

## 🚀 **项目启动指南**

### 方法一：使用启动脚本（推荐）

项目提供了便捷的启动脚本，可以快速启动和管理服务：

```bash
# 启动后端服务
./start-backend.sh

# 停止后端服务  
./start-backend.sh stop

# 查看后端服务状态
./start-backend.sh status

# 重启后端服务
./start-backend.sh restart

# 查看后端日志
./start-backend.sh logs
```

### 方法二：手动启动

```bash
# 1. 确保配置文件已设置
cp .env.example .env
vim .env  # 配置数据库、LLM等必要参数

# 2. 运行数据库迁移
cd backend
alembic upgrade head

# 3. 启动后端服务
# 开发模式（自动重载）
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 3000
```

### 方法三：启动前端服务（可选）

```bash
# 开发模式（Mock数据，无需后端）
./start-frontend.sh start dev

# 生产模式（自动检测后端进程）
./start-frontend.sh start prod

# 查看状态和日志
./start-frontend.sh status
./start-frontend.sh logs

# 停止服务
./start-frontend.sh stop
```

### 方法四：验证服务状态

```bash
# 检查后端健康状态
curl http://localhost:3000/health

# 查看API文档
open http://localhost:3000/docs
```

### 🎯 **测试脚本使用指南 (echo_ai_console.py)**

项目提供了交互式测试控制台，可以模拟完整的用户交互流程：

#### 基本使用

```bash
# 启动测试控制台
python3 echo_ai_console.py
```

#### 典型测试流程

**1. 启动控制台并自动登录**
```bash
$ python3 echo_ai_console.py

🌐 Language Selection / 语言选择
1. 中文 (Chinese)  
2. English
请选择语言 (1/2): 1

🚀 欢迎使用 Echo AI 交互式控制台!
ℹ️ 正在检查服务状态...
✅ 服务器连接正常
ℹ️ 正在自动登录开发者账号...
✅ 登录成功! 欢迎 devuser_5090 (developer)
✅ 已自动登录为开发者，您可以直接输入指令进行交互
💡 提示: 直接输入自然语言指令即可，如 '你好' 或 '深圳今天天气怎么样'
💡 输入 /help 查看更多命令，输入 /quit 退出程序

devuser_5090@echo-ai> 
```

**2. 测试天气查询功能**
```bash
devuser_5090@echo-ai> 深圳的天气

ℹ️ 正在处理您的请求...
🤖 我需要为您查询深圳的天气信息。是否继续？
请确认 (是/否): 是

ℹ️ 正在执行...
🤖 深圳今天天气：多云，温度25°C，湿度65%，东南风3级。
```

**3. 测试其他MCP功能**
```bash
devuser_5090@echo-ai> 北京天安门的坐标
devuser_5090@echo-ai> 深圳到重庆的距离
devuser_5090@echo-ai> 转账0.001个SOL到指定地址
```

#### 可用命令

```bash
# 系统命令
/help                    # 显示帮助信息
/login <用户名> <密码>    # 手动登录
/logout                  # 登出
/whoami                  # 查看当前用户信息
/tools                   # 查看可用工具列表
/debug                   # 切换调试模式
/quit 或 /exit          # 退出程序



#### 调试模式

测试脚本默认开启调试模式，会显示详细的HTTP请求/响应日志：

```bash
devuser_5090@echo-ai> /debug
✅ 调试模式已关闭
ℹ️ 不再显示详细日志

devuser_5090@echo-ai> /debug  
✅ 调试模式已开启
ℹ️ 现在将显示详细的HTTP请求/响应日志和MCP工具执行过程
```



## 核心API接口

系统提供完整的RESTful API接口，支持意图解析、工具执行、用户认证等功能。

- **API基础路径**: `http://localhost:3000/api/v1`
- **API文档**: `http://localhost:3000/docs` (Swagger UI)
- **认证方式**: JWT Bearer Token

详细的API接口说明请参考：[前后端对接与API规范](docs/前后端对接与API规范.md)

## 支持的工具类型

系统支持两种主要类型的工具：

### 1. MCP工具
MCP (Model Context Protocol) 工具是基于自定义协议的脚本工具，能够执行区块链相关操作和其他复杂任务。

- 要求配置 `server_name` 字段，指向对应的MCP服务器
- 支持完整的参数传递和结果解析
- 集成了多种MCP服务器，如Playwright、MiniMax API、地图API和Web3区块链API

### 2. HTTP工具
HTTP工具允许系统调用外部HTTP API来执行操作。目前支持以下平台类型：

#### a. Dify
- 调用Dify平台上的AI应用
- 支持conversation_id管理
- 响应通过LLM总结，生成适合语音播报的内容

#### b. Coze
- 调用Coze平台上的机器人
- 要求在配置中提供bot_id
- 响应同样经过LLM总结处理

#### c. 通用HTTP
- 支持配置和调用任意HTTP API
- 支持GET, POST, PUT, PATCH, DELETE等多种HTTP方法
- 灵活配置头信息、认证方式（Bearer、ApiKey、Basic）
- 支持响应结果路径提取（使用result_path字段）
- 支持URL参数格式化和有效载荷配置
- 对响应结果进行LLM总结处理，生成简洁易懂的语音反馈

## 统一API架构

本项目采用了统一的API架构，提高了代码可维护性和一致性：

1. **统一API入口**
   - 所有API请求通过统一的路由处理
   - 标准化的请求/响应格式
   - 版本化API设计 (如 `/api/v1/...`)

2. **标准响应格式**
   ```json
   {
     "status": "success|error|waiting",
     "data": { /* 响应数据 */ },
     "message": "操作结果描述",
     "timestamp": "2023-04-19T12:34:56.789Z"
   }
   ```

## 开发指南

详细的开发指南请参考：
- [后端开发文档](docs/后端开发文档.md) - 后端开发者专用
- [前后端对接与API规范](docs/前后端对接与API规范.md) - 前端开发者必读

## 🔍 **测试与调试**

### 运行测试
```bash
cd backend
pytest
```

### API调试
- **Swagger UI**: http://localhost:3000/docs
- **ReDoc**: http://localhost:3000/redoc

### 🛠️ **故障排除**

#### 常见启动问题

**1. 数据库连接失败**
```bash
# 错误：sqlalchemy.exc.OperationalError
# 解决：检查DATABASE_URL配置和MySQL服务状态
systemctl status mysql
mysql -u root -p  # 测试数据库连接
```

**2. LLM API连接失败**
```bash
# 错误：httpx.ConnectError或API认证失败
# 解决：验证LLM配置
curl -H "Authorization: Bearer YOUR_API_KEY" YOUR_LLM_API_BASE/models
```

**3. MCP服务器连接超时**
```bash
# 错误：连接到MCP服务器'amap-maps'失败
# 解决：
1. 检查Node.js和npm是否安装
   node --version && npm --version

2. 安装必要的MCP包
   npm install -g @amap/amap-maps-mcp-server

3. 验证API密钥
   检查 MCP_Client/config/mcp_servers.json 中的API密钥

4. 手动测试MCP连接
   cd MCP_Client
   python3 standalone_tool_call.py amap-maps maps_weather '{"city": "深圳"}'
```

**4. 端口占用问题**
```bash
# 检查端口占用
lsof -i :3000

# 终止占用进程
kill -9 PID
```

#### 测试脚本调试

**启用详细日志**：
```bash
# 在测试脚本中按 /debug 切换调试模式
devuser_5090@echo-ai> /debug
✅ 调试模式已开启
```

**常见测试问题**：

1. **自动登录失败**
   - 检查后端服务是否正常运行
   - 验证测试账号配置是否正确

2. **意图解析失败**
   - 检查LLM服务是否正常
   - 查看调试日志中的HTTP请求详情

3. **工具执行失败**
   - 检查MCP服务器配置
   - 验证API密钥的有效性

#### 日志分析

**后端日志位置**：
```bash
# 应用日志
tail -f backend/logs/app.log

# uvicorn日志（如果使用PM2）
pm2 logs backend

# 系统日志
journalctl -u your-service-name -f
```

**MCP客户端日志**：
```bash
# 独立调用测试
cd MCP_Client
python3 standalone_tool_call.py amap-maps maps_weather '{"city": "深圳"}' 2>&1 | tee debug.log
```

#### 性能监控

**检查系统资源**：
```bash
# CPU和内存使用
htop

# 磁盘空间
df -h

# 网络连接
netstat -tlnp | grep :3000
```

## 贡献指南
- Fork本仓库
- 创建特性分支 (`git checkout -b feature/amazing-feature`)
- 提交更改 (`git commit -m 'Add some amazing feature'`)
- 推送分支 (`git push origin feature/amazing-feature`)
- 创建Pull Request

## 更新日志

### 2025-05-14
- 实现通用HTTP API工具支持，包括多种HTTP方法、认证方式和结果处理
- 完善Dify和Coze平台工具的LLM结果总结功能
- 添加单元测试覆盖工具执行服务

### 2025-04-30
- 实现意图识别和工具执行的核心功能
- 完成MCP客户端集成，支持多种操作
- 添加基础认证系统

## 文档导航

- [前后端对接与API规范](docs/前后端对接与API规范.md) - API接口详细说明和调用示例
- [后端开发文档](docs/后端开发文档.md) - 后端架构、服务和开发指南

---

> 文档更新时间：2025-08-14