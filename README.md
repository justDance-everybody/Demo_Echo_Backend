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
- **MCP代理**：MCPRouter (Go)

## 系统架构

```
┌─────────────────┐    HTTP API    ┌─────────────────┐    stdio    ┌─────────────────┐
│   Python Backend │ ◄─────────────► │   MCPRouter      │ ◄─────────► │   MCP Servers   │
│   (FastAPI)      │                │   (Go Proxy)     │             │   (Python/Node)  │
└─────────────────┘                └─────────────────┘             └─────────────────┘
```

### 组件说明

1. **Python Backend (FastAPI)**
   - 提供 HTTP API 接口
   - 处理用户认证和请求
   - 集成 MCPRouter 客户端
   - 管理工具执行流程

2. **MCPRouter (Go)**
   - 高性能 MCP 代理服务
   - 统一 HTTP API 接口
   - 管理 MCP 服务器连接
   - 提供工具发现和调用功能

3. **MCP Servers**
   - 实际的工具实现
   - 通过 stdio 与 MCPRouter 通信
   - 支持 Python 和 Node.js 实现

## 项目结构
```
project/
├── backend/               # 后端服务
│   ├── alembic/           # 数据库迁移
│   ├── app/               # 应用主目录
│   │   ├── clients/       # 第三方客户端封装
│   │   ├── controllers/   # 控制器
│   │   ├── models/        # 数据库模型
│   │   ├── routers/       # API路由
│   │   ├── schemas/       # 数据验证模型
│   │   ├── services/      # 业务逻辑
│   │   │   └── mcprouter_client.py  # MCPRouter客户端
│   │   ├── utils/         # 工具函数
│   │   ├── config.py      # 配置管理
│   │   └── main.py        # 应用入口
│   ├── logs/              # 日志文件
│   ├── scripts/           # 辅助脚本
│   ├── tests/             # 测试代码
│   ├── .env.example       # 环境变量示例
│   └── requirements.txt   # 依赖包列表
├── frontend/              # 前端项目
│   ├── public/            # 静态资源
│   ├── src/               # 源代码
│   │   ├── components/    # UI组件
│   │   ├── contexts/      # React上下文
│   │   ├── hooks/         # 自定义钩子
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API服务
│   │   ├── styles/        # 样式文件
│   │   └── utils/         # 工具函数
│   └── package.json       # 依赖配置
├── MCP_Client/            # MCP客户端（Python）
│   ├── config/            # MCP配置
│   │   └── mcp_servers.json  # MCP服务器配置
│   └── src/               # MCP客户端源码
├── mcprouter/             # MCPRouter服务（Go）
│   ├── cmd/               # 命令行入口
│   ├── handler/           # 请求处理器
│   ├── service/           # 业务逻辑
│   ├── model/             # 数据模型
│   ├── main.go            # 主程序
│   └── mcprouter_config.toml  # 配置文件
├── docs/                  # 项目文档
├── logs/                  # 项目日志
├── start-mcprouter.bat    # Windows启动脚本
├── start-mcprouter.sh     # Linux/macOS启动脚本
└── .env.example           # 环境变量示例
```

## 环境要求

### 系统要求
- Windows 10/11 或 Linux/macOS
- Python 3.9+
- Go 1.21+
- 8GB+ RAM
- 2GB+ 可用磁盘空间

### 必需的环境变量

```bash
# LLM 配置 (必需)
LLM_API_KEY=your-openai-api-key-here
LLM_MODEL=gpt-4o-mini
LLM_API_BASE=https://api.openai.com/v1  # 可选，默认OpenAI

# 数据库配置 (可选，默认使用SQLite)
DATABASE_URL=sqlite:///app.db

# JWT 配置 (可选，有默认值)
JWT_SECRET=your-super-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION=10080  # 7天

# 服务端口配置 (可选，有默认值)
PORT=8000
MCPROUTER_API_URL=http://127.0.0.1:8028
MCPROUTER_TIMEOUT=30.0
```

## 安装与配置

### 依赖环境
- Python 3.9+
- Node.js 16+
- Go 1.21+
- MySQL 5.7+ (可选，默认使用SQLite)
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

4. 配置环境变量
```bash
cp .env.example .env
# 编辑.env文件，设置数据库连接、API密钥等
```

5. 配置环境变量
```bash
# 编辑.env文件，设置必要的配置项
vim .env
```

主要配置项包括：数据库连接、LLM API密钥、JWT密钥等。详细配置说明请参考：[后端开发文档](docs/后端开发文档.md)

6. 数据库迁移
```bash
cd backend
alembic upgrade head
```

### 前端安装与配置
1. 进入前端目录
```bash
cd project/frontend
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
# 编辑.env文件，设置API路径等
```

### MCP_Client 配置
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

## MCPRouter 配置与启动

### 1. MCPRouter 配置文件

编辑 `mcprouter_config.toml` 文件：

```toml
[api]
host = "127.0.0.1"
port = 8028

[proxy]
host = "127.0.0.1"
port = 8026

[log]
level = "info"
file = "mcprouter.log"

[server]
timeout = 30
max_connections = 100
```

**重要端口说明：**
- **8028端口**：MCPRouter API服务器，提供HTTP API接口
- **8026端口**：MCPRouter代理服务器，处理MCP协议通信

### 2. MCP 服务器配置

编辑 `MCP_Client/config/mcp_servers.json`：

```json
{
  "web3_server": {
    "script_path": "MCP_Client/src/mcp/servers/web3_server.py",
    "env": {
      "WEB3_PROVIDER_URI": "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
      "PRIVATE_KEY": "your-private-key-here"
    }
  },
  "playwright_server": {
    "script_path": "MCP_Client/src/mcp/servers/playwright_server.py",
    "env": {
      "BROWSER_TYPE": "chromium"
    }
  },
  "minimax_server": {
    "script_path": "MCP_Client/src/mcp/servers/minimax_server.py",
    "env": {
      "MINIMAX_API_KEY": "your-minimax-api-key"
    }
  }
}
```

### 3. 启动 MCPRouter 服务

#### Windows 启动
```bash
# 在项目根目录
start-mcprouter.bat
```

#### Linux/macOS 启动
```bash
# 在项目根目录
chmod +x start-mcprouter.sh
./start-mcprouter.sh
```

#### 手动启动
```bash
cd mcprouter
go run main.go
# 或使用编译后的二进制文件
./mcprouter
```

### 4. 验证 MCPRouter 状态

```bash
# 检查端口占用
netstat -an | grep ":8026\|:8028"

# 测试 API 服务器
curl http://localhost:8028/v1/list-servers

# 测试代理服务器
curl http://localhost:8026/health
```

## 启动服务

### 1. 启动 MCPRouter（必需）

```bash
# 在项目根目录
./start-mcprouter.sh  # Linux/macOS
# 或
start-mcprouter.bat   # Windows
```

**启动成功标志：**
- 端口8026和8028被占用
- 日志显示 "MCPRouter started successfully"
- API测试返回正常响应

### 2. 启动 Python 后端

```bash
cd backend
# 开发模式（自动重载）
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. 使用PM2启动（生产环境推荐）
```bash
# 安装PM2 (需要Node.js)
npm install -g pm2

# 使用项目根目录的启动脚本
cd project
pm2 start ecosystem.config.js
# 或使用start-pm2.sh脚本
./start-pm2.sh
```

### 4. 启动前端服务

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

# 查看帮助
./start-frontend.sh help
```

**核心特性：** 智能后端检测、自动端口分配、多模式启动、实时监控

### 5. 验证完整系统

```bash
# 1. 检查 MCPRouter 状态
curl http://localhost:8028/v1/list-servers

# 2. 检查后端健康状态
curl http://localhost:8000/health

# 3. 检查工具列表
curl http://localhost:8000/api/v1/tools/public

# 4. 测试意图解析（需要认证）
curl -X POST http://localhost:8000/api/v1/intent/interpret \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "你好"}'
```

## 故障排除

### 常见问题

#### 1. 端口被占用
**错误信息:** `Port 8026/8028 is already in use`

**解决方案:**
```bash
# Windows
netstat -ano | findstr ":8026\|:8028"
taskkill /f /pid <PID>

# Linux/macOS
lsof -i :8026,8028
kill -9 <PID>
```

#### 2. MCPRouter 启动失败
**检查项目：**
1. 确认Go环境已安装：`go version`
2. 检查配置文件：`mcprouter_config.toml`
3. 查看日志文件：`mcprouter.log`

#### 3. MCP 服务器连接失败
**检查项目：**
1. 确认MCP服务器脚本存在且可执行
2. 检查环境变量配置
3. 验证Python依赖是否完整

#### 4. 后端无法连接MCPRouter
**检查项目：**
1. 确认MCPRouter正在运行
2. 检查端口配置是否一致
3. 验证网络连接

### 日志查看

#### MCPRouter 日志
```bash
# 实时查看日志
tail -f mcprouter/mcprouter.log

# Windows
type mcprouter\mcprouter.log
```

#### Python 后端日志
```bash
# 查看实时日志
tail -f backend/logs/app.log
```

## 核心API接口

系统提供完整的RESTful API接口，支持意图解析、工具执行、用户认证等功能。

- **API基础路径**: `http://localhost:8000/api/v1`
- **API文档**: `http://localhost:8000/docs` (Swagger UI)
- **认证方式**: JWT Bearer Token
- **MCPRouter API**: `http://localhost:8028/v1/*`

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
- [前端开发文档](docs/前端开发文档.md) - 前端开发指南
- [MCPRouter使用指南](MCPROUTER_USAGE_GUIDE.md) - MCPRouter配置和使用

## 测试与调试

### 运行完整系统测试

```bash
cd MCPTEST
python test_mcprouter_system.py
```

### 运行快速状态检查

```bash
cd MCPTEST
python test_mcprouter_quick_status.py
```

### 测试工具端点

```bash
# 在项目根目录
python test_tools_endpoint.py
```

### 运行测试
```bash
cd backend
pytest
```

### API调试
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 贡献指南
- Fork本仓库
- 创建特性分支 (`git checkout -b feature/amazing-feature`)
- 提交更改 (`git commit -m 'Add some amazing feature'`)
- 推送分支 (`git push origin feature/amazing-feature`)
- 创建Pull Request

## 更新日志

### 2025-01-01
- 完善MCPRouter集成配置说明
- 添加详细的系统启动指南
- 更新故障排除和日志查看说明

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
- [前端开发文档](docs/前端开发文档.md) - 前端组件和开发规范
- [MCPRouter使用指南](MCPROUTER_USAGE_GUIDE.md) - MCPRouter详细配置和使用说明

---

> 文档更新时间：2025-01-01