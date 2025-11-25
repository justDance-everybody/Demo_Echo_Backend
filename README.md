# Echo 智能语音 AI-Agent 开放平台

## 📖 项目简介

Echo 是一个基于 Python (FastAPI) 的智能语音 AI-Agent 开放平台，支持语音全流程交互、意图识别、工具调用等功能。

### ✨ 主要特性

- **🎙️ 语音全流程交互**：支持语音输入、意图识别、语音合成输出
- **🛠️ 多种工具集成**：MCP 服务、HTTP API（Dify、Coze、自定义）
- **🧠 智能意图识别**：使用 LLM 解析用户意图并生成确认提示
- **🔐 安全认证**：JWT 身份验证与多角色权限管理
- **💬 多轮对话管理**：会话状态跟踪与上下文保持

### 🏗️ 技术栈

- **后端**: Python 3.9+, FastAPI, SQLAlchemy, Alembic
- **数据库**: MySQL / SQLite
- **AI 服务**: 兼容 OpenAI API 的 LLM
- **认证**: JWT
- **部署**: Uvicorn

### 📁 项目结构

```
Backend/
├── backend/                 # 后端服务
│   ├── alembic/            # 数据库迁移
│   ├── app/                # 应用主目录
│   │   ├── models/         # 数据库模型
│   │   ├── routers/        # API 路由
│   │   ├── services/       # 业务逻辑
│   │   ├── schemas/        # 数据验证
│   │   └── main.py         # 应用入口
│   └── .env.example        # 环境变量示例
├── MCP_Client/             # MCP 客户端
├── docs/                   # 文档目录
│   ├── 前后端对接与API规范.md
│   ├── 业务场景测试用例.md
│   ├── 生产部署指南.md    # 生产环境配置
│   └── 故障排查手册.md    # 常见问题解决
└── entrypoint.sh           # 服务管理脚本
```

---

## 🚀 快速开始

### 环境要求

- Python 3.9+
- MySQL 5.7+ 或 SQLite
- Node.js 16+ (用于 MCP 服务)

### 一键安装与启动

```bash
# 1. 克隆项目
git clone <repo_url>
cd Backend

# 2. 配置环境变量
# 入口脚本与后端代码统一从 Backend/.env 加载配置
cp backend/.env.example .env
vim .env  # 编辑必要的配置

# 必须配置的环境变量:
# DATABASE_URL=mysql+pymysql://root:password@localhost:3306/echo_ai_db  # 生产建议MySQL；开发默认SQLite
# LLM_API_KEY=your-llm-api-key
# LLM_API_BASE=https://your-llm-api-base   # 例如 OpenAI/SiliconFlow 等供应商
# LLM_MODEL=gpt-4o                           # 或 Qwen 等模型
# JWT_SECRET=your-secret-key
# APP_PORT=3000                              # 入口脚本可读取（未设置则默认3000）
# APP_HOST=0.0.0.0                           # 入口脚本可读取（未设置则默认0.0.0.0）

# 3. 运行安装脚本（创建虚拟环境、安装依赖、初始化数据库）
chmod +x setup.sh
./setup.sh

# 4. 启动服务
./entrypoint.sh start

# 5. 验证服务
curl http://localhost:3000/health
```

### 访问服务

- **API 文档**: http://localhost:3000/docs (Swagger UI)
- **健康检查**: http://localhost:3000/health
- **API 基础路径**: http://localhost:3000/api/v1

---

## 📡 API 接口概览

### 核心接口

| 接口 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/health` | GET | 健康检查 | ❌ |
| `/api/v1/auth/token` | POST | 用户登录 | ❌ |
| `/api/v1/intent/interpret` | POST | 意图识别 | ✅ |
| `/api/v1/tools` | GET | 获取工具列表 | ✅ |
| `/api/v1/tools/execute` | POST | 工具执行 | ✅ |
| `/api/v1/dev/integrations` | GET/POST/PUT/DELETE | 开发者 API 集成 | ✅ (developer) |
| `/api/v1/mcp/status` | GET | MCP 服务器状态 | ✅ |

### /api/v1/intent/confirm 使用与播报口径

- 路径与鉴权：`POST /api/v1/intent/confirm`，需要 JWT；`session_id` 必填；`user_id` 由鉴权自动确定（无需在请求体传）。
- 请求体：
  - `session_id: string`
  - `user_input: string`（如“确认执行”、“取消”等，用于表达确认或拒绝）
- 响应模型（固定）：
  - `session_id: string`
  - `success: boolean`
  - `content: string | null`（成功时用于语音播报的纯正文）
  - `error: string | null`（失败/超时的原因简述）
- 播报规则（前端）：
  - 成功：仅播报 `content`。该字段为纯正文，不包含说明性前缀/道歉/技术细节或工具名称；多工具结果用换行分隔；区块链地址统一缩写（如 `0x123456…5678`）。
  - 失败/超时：仅播报 `error` 的简述版本（限制长度、去技术细节）。
- 行为说明：
  - 聚合层仅依赖各工具的 `data.tts_message` 生成 `content`；如缺失则统一用抽取与忠实改写补齐，避免直接返回第三方的 `answer/message/str(data)`。
  - 未确认/拒绝时，不执行工具，直接返回提示文本到 `content`（如“请重新告诉我您需要什么帮助”）。
- 示例：
  - 未确认/拒绝：`{"session_id":"s1","success":true,"content":"请重新告诉我您需要什么帮助","error":null}`
  - 成功（多工具）：`{"session_id":"s1","success":true,"content":"天气晴，22℃\n\n账户余额 123.45 USDT (地址 0x123456…5678)","error":null}`
  - 失败：`{"session_id":"s1","success":false,"content":null,"error":"执行过程中出现错误: …"}`
  - 超时：`{"session_id":"s1","success":false,"content":null,"error":"确认执行超时 (180秒)"}`

> 前端集成建议：只读取 `content` 或 `error` 进行播报，无需解析工具专属字段；使用 `session_id` 做会话关联即可。

### 📦 开发者 API 集成

第三方开发者可以通过表单方式集成 Dify/Coze 平台的 API 服务。

**字段要求**：
- **名称** (2-30字)：简洁明了，如 "心理咨询助手"、"天气查询工具"
- **描述** (20-200字)：必须包含 ①工具功能 ②适用场景 ③触发关键词示例

**优秀示例**：
```json
{
  "name": "心理咨询与情感陪伴助手",
  "description": "专业的心理咨询与情感支持工具。当用户表达负面情绪（如悲伤、焦虑、孤独）或需要情感支持时使用。适用场景：用户倾诉烦恼、寻求安慰、情绪低落等。",
  "type": "http",
  "endpoint": {
    "platform": "dify",
    "api_key": "app-xxx"
  }
}
```

**常见错误**：
- ❌ 名称: `Dify API` (技术术语) → ✅ `智能写作助手`
- ❌ 描述: `调用 Dify 接口` (无场景) → ✅ `AI 写作辅助工具。当用户需要写作帮助（如「帮我写邮件」、「润色文字」）时使用...`

**快速创建**：
```bash
curl -X POST "http://localhost:3000/api/v1/dev/integrations" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "您的工具名称",
    "description": "详细描述（必须20字以上，包含场景和关键词）",
    "type": "http",
    "endpoint": {"platform": "dify", "api_key": "app-xxx"}
  }'
```

> 💡 提示：高质量的描述能显著提升 AI 意图识别的准确率！

### 快速测试

```bash
# 健康检查
curl http://localhost:3000/health

# 用户登录（获取 token）
curl -X POST http://localhost:3000/api/v1/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=yourpassword"

# 获取工具列表
curl -H "Authorization: Bearer <your_token>" \
  http://localhost:3000/api/v1/tools
```

---

## 🛠️ 服务管理

### 使用管理脚本（推荐）

```bash
# 启动服务
./entrypoint.sh start

# 停止服务
./entrypoint.sh stop

# 重启服务
./entrypoint.sh restart

# 查看状态
./entrypoint.sh status

# 持续监控（自动重启）
./entrypoint.sh monitor
```

日志位置：后端与入口脚本日志位于 `Backend/logs/`；使用 `start`/`restart` 后，脚本会在前台实时输出服务与监控日志。

### 直接启动（开发模式）

```bash
cd backend
source ../.venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

---

## 🔧 常见问题

### 1. 数据库连接失败

```bash
# 检查 MySQL 服务状态
sudo systemctl status mysql

# 测试数据库连接
mysql -u root -p -e "SELECT VERSION();"

# 检查 .env 中的 DATABASE_URL 配置
cat .env | grep DATABASE_URL
```

### 2. 端口被占用

```bash
# 查看端口占用
lsof -i :3000

# 杀死占用进程
kill -9 $(lsof -t -i:3000)
```

### 3. MCP 工具同步失败

```bash
# 检查 Node.js 版本
node --version  # 需要 16+

# 重新安装 MCP 包
npm install -g @playwright/mcp minimax-mcp-js @amap/amap-maps-mcp-server

# 检查 MCP 配置
cat MCP_Client/config/mcp_servers.json
```

### 4. 虚拟环境问题

```bash
# 删除旧环境
rm -rf .venv

# 重新创建
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
pip install git+https://github.com/modelcontextprotocol/python-sdk.git
```

---

## 📚 详细文档

需要更多信息？查看完整文档：

- **[后端开发文档](./docs/后端开发文档.md)** - 详细的开发指南和配置说明
- **[前后端对接与API规范](./docs/前后端对接与API规范.md)** - API 接口详细说明（含 `/api/v1/intent/confirm` 使用、播报口径与地址缩写说明）
- **[业务场景测试用例](./docs/业务场景测试用例.md)** - 测试用例和验收标准
- **[生产部署指南](./docs/生产部署指南.md)** - systemd、supervisor、Docker 部署
- **[MCP 会话初始化问题 Debug 指南](./docs/MCP_会话初始化问题_Debug指南.md)**

---

## 🎯 快速链接

- **API 文档**: http://localhost:3000/docs
- **健康检查**: http://localhost:3000/health
- **GitHub**: [项目地址]
- **问题反馈**: [Issues]

---

## 📄 许可证

MIT License

---

**祝使用愉快！** 🎉
