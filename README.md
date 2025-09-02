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
    }
  }
}
```

### 6️⃣ MCP工具同步
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
📋 发现 3 个MCP服务器:
  - playwright: 启用 (Playwright浏览器)
  - minimax-mcp-js: 启用 (MiniMax API)
  - amap-maps: 启用 (高德地图API)

✅ 新增工具: 43
🔄 更新工具: 0  
❌ 失败工具: 0
🎉 同步成功完成!
```

### 7️⃣ 启动后端服务
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

### 8️⃣ 验证部署
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

项目现在具备完整的迁移性和鲁棒性，可以在新环境中顺利复现部署。