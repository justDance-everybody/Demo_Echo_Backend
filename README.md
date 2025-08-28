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
├── backend/               # 后端服务
│   ├── alembic/           # 数据库迁移
│   ├── app/               # 应用主目录
│   │   ├── clients/       # 第三方客户端封装
│   │   ├── controllers/   # 控制器
│   │   ├── models/        # 数据库模型
│   │   ├── routers/       # API路由
│   │   ├── schemas/       # 数据验证模型
│   │   ├── services/      # 业务逻辑
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
│   └── src/               # MCP客户端源码
├── docs/                  # 项目文档
├── logs/                  # 项目日志
└── .env.example           # 环境变量示例
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

4. 配置环境变量（统一配置）
```bash
# 在项目根目录配置环境变量
cp .env.example .env
# 编辑根目录的.env文件，设置所有服务的配置
vim .env
```

**重要**：所有环境变量配置已统一到项目根目录的`.env`文件中，包括：
- 数据库连接配置
- LLM API密钥和模型配置  
- JWT认证配置
- MCP客户端配置
- 测试账号配置
- 第三方服务配置（OpenAI、Solana等）

详细配置说明请参考：[后端开发文档](docs/后端开发文档.md)

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

创建`MCP_Client/config/mcp_servers.json`文件，添加MCP服务器配置：

```json
{
  "mcpServers": {
    "minimax-mcp-js": {
      "name": "MiniMax API",
      "description": "提供MiniMax语音大语言模型接口",
      "command": "npx",
      "args": ["minimax-mcp-js"],
      "env": {
        "MINIMAX_API_KEY": "your_minimax_api_key_here"
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

## 启动服务

### 启动后端服务
```bash
cd backend
# 开发模式（自动重载）
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 3000
```

### 使用PM2启动（生产环境推荐）
```bash
# 安装PM2 (需要Node.js)
npm install -g pm2

# 使用项目根目录的启动脚本
cd project
pm2 start ecosystem.config.js
# 或使用start-pm2.sh脚本
./start-pm2.sh
```

### 启动前端服务

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

### 直接启动MCP_Client（可选）
```bash
cd MCP_Client
# 启动并连接到指定MCP服务器
python src/mcp/client/main.py <path_to_server_script>
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
- [前端开发文档](docs/前端开发文档.md) - 前端开发指南

## 测试与调试

### 运行测试
```bash
cd backend
pytest
```

### API调试
- Swagger UI: http://localhost:3000/docs
- ReDoc: http://localhost:3000/redoc

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
- [前端开发文档](docs/前端开发文档.md) - 前端组件和开发规范

---

> 文档更新时间：2025-05-14