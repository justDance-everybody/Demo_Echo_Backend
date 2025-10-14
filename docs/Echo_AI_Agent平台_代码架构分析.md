# Echo AI-Agent 平台 - 代码架构分析

## 🏗️ 核心功能

**Echo** 是一个基于FastAPI的**智能语音AI-Agent开放平台**，核心功能：
- **🎙️ 语音全流程交互**：语音输入→意图识别→工具调用→语音输出
- **🛠️ 多工具集成**：支持MCP服务、HTTP工具（Dify/Coze/通用API）
- **🧠 智能意图识别**：使用LLM解析用户意图并生成确认提示
- **🔐 JWT身份认证**：基于角色的权限控制(user/developer/admin)
- **📊 开发者Portal**：支持第三方开发者上传和管理工具

## 🚀 启动方式

### 标准启动
```bash
cd Demo_Echo_Backend/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 3000
```

### 开发模式（热重载）
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

### 访问地址
- **API文档**: http://localhost:3000/docs
- **健康检查**: http://localhost:3000/health
- **API基础路径**: http://localhost:3000/api/v1

## 🏛️ 系统架构

### 分层架构图
```
┌─────────────────────────────────────────┐
│                前端层                    │
│          React + Web Speech API         │
└─────────────────────────────────────────┘
                    ↓ HTTP/WebSocket
┌─────────────────────────────────────────┐
│              API网关层                   │
│    FastAPI + CORS + 安全审计中间件       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│              路由层                      │
│  /intent /execute /tools /auth /dev     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│            控制器层                      │
│        请求验证 + 响应封装               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│            服务层                        │
│  IntentService ExecuteService等         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          工具执行层                      │
│     MCP Client    HTTP Client           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          数据持久层                      │
│       MySQL/SQLite + SQLAlchemy        │
└─────────────────────────────────────────┘
```

## 📁 核心目录结构

```
backend/app/
├── main.py                 # FastAPI应用入口
├── config.py              # 配置管理
├── routers/               # API路由层
│   ├── intent.py          # 意图识别接口
│   ├── execute.py         # 工具执行接口  
│   ├── tools.py           # 工具查询接口
│   ├── auth.py            # 认证接口
│   └── dev_tools.py       # 开发者工具管理
├── controllers/           # 控制器层
├── services/              # 业务逻辑层
│   ├── intent_service.py  # 意图解析服务
│   ├── execute_service.py # 工具执行服务
│   ├── mcp_manager.py     # MCP服务器管理
│   └── dev_tool_service.py# 开发者工具服务
├── models/                # 数据库模型
│   ├── user.py            # 用户模型
│   ├── tool.py            # 工具模型
│   ├── session.py         # 会话模型
│   └── log.py             # 日志模型
└── utils/                 # 工具类
    ├── db.py              # 数据库连接
    ├── security.py        # JWT认证
    └── openai_client.py   # LLM客户端
```

## 🔄 核心业务流程

### 1. 语音交互流程
```
用户语音输入 → STT转文本 → 意图识别(/intent/interpret) 
→ LLM分析 → 工具调用决策 → TTS播报确认 
→ 用户确认(/intent/confirm) → 工具执行(/execute) 
→ 结果总结 → TTS播报结果
```

### 2. 工具类型支持
- **MCP工具**: 通过MCP协议调用本地脚本(浏览器自动化、地图服务等)
- **HTTP工具**: 
  - Dify平台: `platform="dify"` + `api_key`
  - Coze平台: `platform="coze"` + `api_key` + `bot_id` 
  - 通用HTTP: `platform="generic"` + 自定义配置

## 🛡️ 安全特性

- **JWT认证**: 无状态token认证
- **角色权限**: user/developer/admin三级权限
- **审计日志**: SecurityAuditMiddleware记录所有API访问
- **CORS保护**: 可配置跨域访问策略

## 🔧 关键技术特点

1. **异步架构**: 全面使用AsyncSession支持高并发
2. **统一错误处理**: 集中的异常处理和错误响应
3. **会话管理**: 完整的会话状态跟踪(interpreting→waiting_confirm→executing→done)
4. **MCP服务器管理**: 自动启动监控多个MCP服务器
5. **开发者生态**: 支持第三方工具上传和管理

## 📊 数据库设计

### 核心表结构
- **users**: 用户信息(username, role, contacts, wallets)
- **tools**: 工具定义(tool_id, type, endpoint, request_schema)  
- **sessions**: 会话状态(session_id, user_id, status)
- **logs**: 操作日志(session_id, step, status, message)

### 表关系
- User 1:N Tools (用户可以创建多个工具)
- User 1:N Sessions (用户可以有多个会话)
- Session 1:N Logs (每个会话有多条日志记录)

## 🚀 启动依赖检查

系统启动时自动执行：
1. **数据库连接**: 自动检查MySQL/SQLite连接
2. **MCP服务器**: 启动playwright、minimax等MCP服务
3. **配置验证**: 检查LLM_API_KEY等关键配置
4. **表结构**: 自动创建缺失的数据库表

## 📡 核心API接口

### 认证相关
- `POST /api/v1/auth/token` - 用户登录
- `POST /api/v1/auth/register` - 用户注册
- `GET /api/v1/auth/me` - 获取当前用户信息

### 意图处理
- `POST /api/v1/intent/interpret` - 意图解析
- `POST /api/v1/intent/confirm` - 确认执行

### 工具管理
- `GET /api/v1/tools` - 获取工具列表
- `POST /api/v1/execute` - 执行工具

### 开发者功能
- `GET /api/v1/dev/tools` - 获取开发者工具列表
- `POST /api/v1/dev/tools` - 创建工具
- `POST /api/v1/dev/upload` - 上传工具包
- `POST /api/v1/dev/tools/{id}/test` - 测试工具

### 系统监控
- `GET /health` - 健康检查
- `GET /api/v1/mcp/status` - MCP服务器状态

## 🔍 工具执行架构

### MCP工具执行流程
```
1. 用户请求 → IntentService解析
2. 识别MCP工具 → ExecuteService处理
3. MCPManager查找服务器 → MCP客户端连接
4. 执行工具 → 获取原始结果
5. LLM总结结果 → 返回TTS友好内容
```

### HTTP工具执行流程
```
1. 用户请求 → IntentService解析
2. 识别HTTP工具 → ExecuteService处理
3. 根据平台类型构建请求
4. 调用外部API → 获取响应
5. LLM总结结果 → 返回TTS友好内容
```

## 🎯 开发者工具生态

### 支持的工具包格式
1. **ZIP包**: 包含manifest.json的压缩包
2. **TAR包**: 支持.tar、.tar.gz、.tgz格式

### manifest.json示例
```json
{
  "name": "Dify智能助手",
  "version": "1.0.0",
  "description": "基于Dify平台的AI对话助手",
  "type": "http",
  "platform": "dify",
  "api_key": "app-your_dify_api_key_here",
  "base_url": "https://api.dify.ai/v1",
  "request_schema": {
    "type": "object",
    "properties": {
      "query": {"type": "string"}
    },
    "required": ["query"]
  }
}
```

## 🔧 配置管理

### 环境变量配置
```bash
# 数据库配置
DATABASE_URL=mysql+pymysql://user:pass@host:3306/dbname

# LLM配置
LLM_API_KEY=your-api-key
LLM_MODEL=gpt-4o
LLM_API_BASE=https://api.openai.com/v1

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRATION=10080  # 7天

# 服务配置
HOST=0.0.0.0
PORT=3000
DEBUG=true
```

## 📈 性能特性

1. **连接池管理**: SQLAlchemy连接池优化
2. **异步IO**: 全面异步处理提升并发能力
3. **请求缓存**: 工具列表等静态数据缓存
4. **超时控制**: MCP和HTTP调用都有超时保护
5. **错误重试**: 关键操作的自动重试机制

## 🛠️ 开发调试

### 日志系统
- 使用loguru进行结构化日志
- 支持文件轮转和日志级别配置
- 安全审计中间件记录API访问

### 测试支持
- 单元测试: pytest + asyncio
- API测试: FastAPI TestClient
- 集成测试: 完整的端到端测试

---

**文档版本**: v1.0  
**创建时间**: 2025-01-14  
**最后更新**: 2025-01-14  
**维护者**: 后端开发团队

## 📚 相关文档

- [后端开发文档](./后端开发文档.md)
- [产品需求文档PRD](./产品开发需求文档PRD.md)
- [前后端对接与API规范](./前后端对接与API规范.md)
- [MCP会话初始化问题Debug指南](./MCP_会话初始化问题_Debug指南.md)
