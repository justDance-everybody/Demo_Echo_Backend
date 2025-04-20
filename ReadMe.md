# 智能语音 AI-Agent 开放平台

## 项目简介
本项目是一个基于 Node.js + Express + React 的智能语音 AI-Agent 开放平台，支持语音全流程交互、MCP 服务集成、开发者与管理员管理等功能。

## 主要功能
- 语音转文字与语音合成
- 多轮对话与意图解析
- MCP 服务统一接入（如 MiniMax、Web3、地图等）
- 任务与日志管理
- 开发者服务提交与审核
- 管理员后台管理

## 技术栈
- 后端：Node.js + Express
- 前端：React + Ant Design/Material-UI
- 数据库：MySQL
- 语音/AI服务：MCP_Client（Python）

## 目录结构
```
project/
├── backend/         # 后端服务
├── frontend/        # 前端项目
├── MCP_Client/      # MCP 客户端（Python）
├── docs/            # 项目文档
├── ReadMe.md        # 项目说明
└── ...
```

## 安装与运行
### 依赖环境
- Node.js >= 18.x
- Python >= 3.9
- uv (Python包管理工具)
- MySQL 5.7+

### 后端启动
```bash
cd backend
npm install
npm start
```

### 前端启动
```bash
cd frontend
npm install
npm start
```

### MCP_Client 安装与配置
```bash
cd MCP_Client

# 创建虚拟环境
uv venv

# 激活虚拟环境 (Linux/macOS)
source .venv/bin/activate
# 或Windows:
# .venv\Scripts\activate

# 安装MCP SDK及依赖
uv pip install git+https://github.com/modelcontextprotocol/python-sdk.git
uv pip install openai python-dotenv

# 确保.env文件包含必要环境变量
# LLM_API_KEY, LLM_MODEL, LLM_API_BASE
```

### MCP_Client 单独启动（直接模式）
```bash
cd MCP_Client
# 启动并连接到指定MCP服务器
python src/mcp_client.py <path_to_server_script>

# 例如连接到MiniMax服务：
# python src/mcp_client.py "/usr/local/bin/npx minimax-mcp-js"
```

### 通过后端网关启动（推荐）
```bash
cd backend
NODE_ENV=development PORT=3002 \
MCP_CLIENT_PATH=/home/devbox/project/MCP_Client/src/mcp_client.py \
MCP_CONFIG_PATH=/home/devbox/project/MCP_Client/config \
MCP_PYTHON_PATH="python3" \
node src/app.js
```

## 架构设计

### 统一API架构【已实现】

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

3. **核心API端点**
   - `/api/v1/chat` - 处理用户文本查询
   - `/api/v1/voice` - 处理用户语音查询
   - `/api/v1/services` - 获取可用服务列表
   - `/api/v1/mcp/execute` - 直接执行MCP服务

4. **统一前端API客户端**
   - 封装所有API请求逻辑
   - 标准化的错误处理
   - 简化的接口调用方式

### MCP网关层【新增】

我们实现了一个MCP网关层，用于将前端请求路由到指定的MCP服务：

1. **网关功能**
   - 解析前端请求并通过MCP_client处理
   - 支持获取MCP服务器工具列表
   - 支持直接调用MCP服务器上的工具

2. **网关API端点**
   - `POST /api/v1/mcp/gateway/:serverId` - 通过指定MCP服务器处理请求
   - `GET /api/v1/mcp/tools/:serverId` - 获取指定MCP服务器的工具列表
   - `POST /api/v1/mcp/tool/:serverId/:toolName` - 在指定MCP服务器上执行指定工具

3. **工作原理**
   - 网关解析请求，确定需要调用的MCP服务器ID
   - 通过MCP_client处理请求，MCP_client负责与实际的MCP服务器通信
   - 网关不直接与MCP服务器通信，而是委托给MCP_client

4. **技术实现**
   - 使用Node.js子进程模块调用Python MCP_client
   - 通过临时文件传递请求和响应数据
   - 详细文档见 backend/docs/mcp-gateway.md

### AI网关层【计划中】
将实现一个智能网关层，通过大语言模型分析用户意图，路由到合适的服务。

### 服务路由层【计划中】
将实现动态服务调用和结果处理，实现多服务协同。

## 主要接口示例
- 语音上传：`POST /api/voice/upload`
- MCP 服务调用：`POST /api/mcp/execute`
- MCP 网关调用：`POST /api/v1/mcp/gateway/:serverId`
- 详细接口文档见 docs/后端开发文档.md

## 配置与环境变量
- 后端环境变量见 backend/.env.example
- MCP 服务配置见 MCP_Client/config/mcp_servers.json

## 贡献指南
- Fork 本仓库，提交 PR 前请确保代码和文档同步更新
- 详细贡献流程见 docs/CONTRIBUTING.md（如有）

## 常见问题
- 启动报错请检查 Node/Python 版本和依赖
- MCP 服务调用失败请查看 MCP_Client/README.md 中的故障排除部分
- 网关功能使用问题请查看 backend/docs/mcp-gateway.md

## 更新日志
### 2025-04-20
- 实现MCP网关功能，提供按名称路由的能力
- 添加直接工具调用和工具列表获取功能
- 完善网关功能文档和测试脚本

### 2025-04-19
- 实现统一API架构，规范前后端交互方式
- 添加标准化响应格式和错误处理
- 封装前端API客户端，简化API调用

## 联系方式
- 维护者邮箱：xxx@example.com
- 社区讨论：GitHub Issues 