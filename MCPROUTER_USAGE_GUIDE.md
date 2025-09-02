# MCPRouter 集成使用说明

## 概述

本项目实现了 MCPRouter 与 Python 后端的集成，提供了完整的 MCP (Model Context Protocol) 工具调用解决方案。

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

## 环境要求

### 系统要求
- Windows 10/11 或 Linux/macOS
- Python 3.8+
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
MCPROUTER_API_URL=http://127.0.0.1:8027
MCPROUTER_TIMEOUT=30.0
```

## 安装和配置

### 1. 克隆项目

```bash
git clone <repository-url>
cd Demo_Echo_Backend
```

### 2. 安装 Python 依赖

```bash
cd backend
pip install -r requirements.txt
```

### 3. 配置环境变量

创建 `.env` 文件：

```bash
# 在 backend 目录下创建 .env 文件
LLM_API_KEY=your-openai-api-key-here
LLM_MODEL=gpt-4o-mini
JWT_SECRET=your-super-secret-key-here
```

### 4. 初始化数据库

```bash
cd backend
python -c "from app.utils.db import init_db; init_db(); print('数据库初始化完成')"
```

### 5. 创建测试用户

```bash
cd backend
python scripts/create_admin.py testuser testpass123 user
```

## 启动服务

### 1. 启动 MCPRouter

**Windows:**
```bash
# 在项目根目录
start-mcprouter.bat
```

**Linux/macOS:**
```bash
# 在项目根目录
./start-mcprouter.sh
```

### 2. 启动 Python 后端

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. 验证服务状态

```bash
# 测试健康检查
curl http://localhost:8000/health

# 测试工具列表 (无需认证)
curl http://localhost:8000/api/v1/tools/public

# 测试 MCPRouter API
curl http://localhost:8027/v1/list-servers
```

## API 接口说明

### 认证接口

#### 用户登录
```http
POST /api/v1/auth/token
Content-Type: application/x-www-form-urlencoded

username=testuser&password=testpass123
```

#### 用户注册
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com"
}
```

### 工具接口

#### 获取工具列表 (需要认证)
```http
GET /api/v1/tools
Authorization: Bearer <your-jwt-token>
```

#### 获取工具列表 (无需认证，仅测试)
```http
GET /api/v1/tools/public
```

#### 执行工具
```http
POST /api/v1/execute
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "tool_id": "tool_name",
  "params": {
    "query": "Hello, world!"
  }
}
```

### 意图分析接口

#### 分析用户意图
```http
POST /api/v1/intent/interpret
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "query": "帮我查一下明天上海的天气"
}
```

#### 确认执行
```http
POST /api/v1/intent/confirm
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "intent_id": "intent_uuid",
  "confirmed": true
}
```

## 测试

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

## 故障排除

### 常见问题

#### 1. LLM_API_KEY 未配置
**错误信息:** `未配置LLM_API_KEY环境变量，请设置有效的API密钥`

**解决方案:**
```bash
# 设置环境变量
export LLM_API_KEY=your-api-key-here

# 或在 .env 文件中添加
echo "LLM_API_KEY=your-api-key-here" >> backend/.env
```

#### 2. 端口被占用
**错误信息:** `Port 8027 is already in use`

**解决方案:**
```bash
# Windows
taskkill /f /im mcprouter.exe

# Linux/macOS
pkill mcprouter
```

#### 3. 数据库连接失败
**错误信息:** `数据库连接失败`

**解决方案:**
```bash
# 重新初始化数据库
cd backend
python -c "from app.utils.db import init_db; init_db()"
```

#### 4. MCP 服务器启动失败
**错误信息:** `Failed to start MCP server`

**解决方案:**
1. 检查 MCP 服务器配置文件 `MCP_Client/config/mcp_servers.json`
2. 确保 MCP 服务器脚本存在且可执行
3. 检查环境变量配置

### 日志查看

#### Python 后端日志
```bash
# 查看实时日志
tail -f backend/logs/app.log
```

#### MCPRouter 日志
```bash
# Windows
type mcprouter.log

# Linux/macOS
tail -f mcprouter.log
```

## 配置说明

### MCP 服务器配置

编辑 `MCP_Client/config/mcp_servers.json`：

```json
{
  "server_name": {
    "script_path": "path/to/server.py",
    "env": {
      "API_KEY": "your-api-key",
      "OTHER_CONFIG": "value"
    }
  }
}
```

### MCPRouter 配置

编辑 `.env.toml`：

```toml
[api]
host = "127.0.0.1"
port = 8027

[proxy]
host = "127.0.0.1"
port = 8025
```

## 开发指南

### 添加新的 MCP 工具

1. 创建 MCP 服务器脚本
2. 在 `mcp_servers.json` 中注册服务器
3. 重启 MCPRouter 服务

### 扩展 API 接口

1. 在 `backend/app/routers/` 中添加新路由
2. 在 `backend/app/controllers/` 中添加控制器
3. 在 `backend/app/services/` 中添加业务逻辑

### 自定义 LLM 模型

1. 修改 `LLM_MODEL` 环境变量
2. 调整 `LLM_API_BASE` 以使用不同的 API 提供商
3. 更新系统提示词以适应新模型

## 性能优化

### 数据库优化
- 使用连接池
- 添加适当的索引
- 定期清理日志数据

### 缓存策略
- 缓存工具列表
- 缓存用户会话
- 使用 Redis 进行分布式缓存

### 并发处理
- 使用异步处理
- 实现请求队列
- 限制并发连接数

## 安全考虑

### API 安全
- 使用 HTTPS
- 实现速率限制
- 验证所有输入

### 数据安全
- 加密敏感数据
- 定期备份
- 访问控制

### 环境安全
- 保护 API 密钥
- 限制网络访问
- 监控异常活动

## 支持

如有问题，请：
1. 查看日志文件
2. 运行测试脚本
3. 检查配置文件
4. 提交 Issue 到项目仓库

---

*最后更新: 2025-01-01*
