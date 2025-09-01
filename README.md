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

### 交互式控制台测试
项目提供了交互式控制台工具，方便开发者测试和调试各种功能：

```bash
# 启动交互式控制台（会自动登录开发者账号）
python echo_ai_console.py
```

**控制台功能特性：**
- 🌐 **多语言支持**：中文/英文界面
- 🔐 **自动登录**：自动使用开发者账号登录
- 🐛 **详细调试**：默认开启调试模式，显示完整的HTTP请求/响应日志
- 📜 **命令历史**：支持上下箭头查看历史命令
- 🛠️ **工具测试**：可直接测试所有MCP和HTTP工具

**支持的命令：**
```bash
# 系统命令
/login <用户名> <密码>     # 登录
/logout                   # 登出
/whoami                   # 查看当前用户信息
/tools                    # 查看可用工具列表
/debug                    # 切换调试模式开/关
/help                     # 显示帮助信息
/quit 或 /exit           # 退出程序

# 自然语言交互（直接输入即可）
把"你好世界"文字转语音
访问github.com并截图
查询北京今天的天气
转账0.01个SOL到指定地址
```

**测试用账号：**
- 普通用户: `testuser_5090` / `8lpcUY2BOt`
- 开发者: `devuser_5090` / `mryuWTGdMk` (默认自动登录)
- 管理员: `adminuser_5090` / `SAKMRtxCjT`

### MCP工具同步与管理

**工具同步脚本：**
```bash
# 同步所有MCP服务器的工具到数据库
python complete_sync.py
```

**MCP服务器管理API：**
```bash
# 查看所有MCP服务器状态
curl http://localhost:3000/api/v1/mcp/status -H "Authorization: Bearer YOUR_TOKEN"

# 启动/停止/重启特定服务器
curl -X POST http://localhost:3000/api/v1/mcp/start/playwright -H "Authorization: Bearer ADMIN_TOKEN"
curl -X POST http://localhost:3000/api/v1/mcp/stop/playwright -H "Authorization: Bearer ADMIN_TOKEN"
curl -X POST http://localhost:3000/api/v1/mcp/restart/playwright -H "Authorization: Bearer ADMIN_TOKEN"
```

### 支持的MCP工具测试示例

**Playwright浏览器自动化：**
- `"打开谷歌网站"` - 在浏览器中导航到Google
- `"访问github.com并截图"` - 访问网站并生成截图
- `"在百度搜索'人工智能'"` - 执行搜索操作
- `"打开淘宝并滚动页面"` - 页面交互操作

**MiniMax文字转语音：**
- `"把'你好世界'文字转语音"` - 生成语音文件
- `"将'欢迎使用AI助手'转换为音频"` - 文字转音频

**高德地图API：**
- `"查询北京的地理位置"` - 获取城市坐标信息
- `"搜索上海市的详细信息"` - 地理位置查询

### 调试技巧

**开启详细日志：**
1. 在控制台中使用 `/debug` 命令切换调试模式
2. 调试模式会显示：
   - HTTP请求/响应的完整详情
   - MCP工具执行的完整过程
   - 意图解析和工具调用的中间步骤
   - 错误信息和异常堆栈

**查看日志文件：**
```bash
# 查看API服务日志
tail -f backend/logs/api.log

# 查看应用日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log
```

**常见问题排查：**

1. **MCP工具调用失败**：
   - 检查MCP服务器状态：`curl http://localhost:3000/api/v1/mcp/status`
   - 重启服务器：使用管理员token调用restart接口
   - 查看服务器日志：`tail -f backend/logs/api.log | grep -i mcp`

2. **浏览器自动化问题**：
   - Playwright默认headless模式，浏览器会快速打开关闭
   - 如需查看浏览器操作，修改MCP配置移除`--headless`参数
   - 单个操作限制：复合操作需要分步执行

3. **语音合成链接无效**：
   - 检查MiniMax配置中的`MINIMAX_RESOURCE_MODE`设置
   - `"url"`模式返回远程链接(可能有权限限制)
   - `"file"`模式生成本地文件(推荐)

### API调试工具

**Swagger UI界面：**
- 开发环境: http://localhost:3000/docs
- 提供完整的API文档和在线测试功能

**ReDoc文档：**
- 开发环境: http://localhost:3000/redoc  
- 提供更友好的API文档阅读体验

**单元测试：**
```bash
cd backend
pytest tests/ -v  # 运行所有测试
pytest tests/test_tools.py -v  # 运行特定测试文件
```

## 贡献指南
- Fork本仓库
- 创建特性分支 (`git checkout -b feature/amazing-feature`)
- 提交更改 (`git commit -m 'Add some amazing feature'`)
- 推送分支 (`git push origin feature/amazing-feature`)
- 创建Pull Request

## 更新日志

### 2025-08-29
- 🚀 **新增交互式控制台工具** (`echo_ai_console.py`)
  - 支持中文/英文双语界面
  - 自动登录开发者账号，即开即用
  - 详细调试模式，显示完整HTTP请求/响应过程
  - 支持自然语言直接交互测试所有工具
- 🛠️ **完善MCP服务器管理**
  - 添加MCP工具自动同步脚本 (`complete_sync.py`)
  - 实现MCP服务器状态监控和管理API
  - 支持动态启动/停止/重启MCP服务器
- 🔧 **优化工具配置和调试**
  - 修复MiniMax语音合成OSS权限问题
  - 优化Playwright浏览器自动化配置
  - 添加详细的错误诊断和排查指南
- 📚 **完善文档和测试用例**
  - 更新README添加完整的测试和调试指南
  - 提供丰富的MCP工具测试示例
  - 添加常见问题排查方法

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

> 文档更新时间：2025-08-29