# Echo AI-Agent 数据库设计和MySQL设置指南

## 📊 数据库设计概览

Echo AI-Agent平台使用**关系型数据库设计**，支持SQLite和MySQL。数据库包含6个核心表，支撑用户管理、工具管理、会话跟踪和日志记录等功能。

## 🏗️ 数据库表结构

### 1. users - 用户表
**功能**: 存储用户账户信息和权限
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(128),
    email VARCHAR(120),
    full_name VARCHAR(120),
    role ENUM('user', 'developer', 'admin') DEFAULT 'user' NOT NULL,
    is_active SMALLINT DEFAULT 1,
    is_superuser SMALLINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);
```

**字段说明**:
- `id`: 用户唯一标识
- `username`: 用户名（唯一）
- `password_hash`: 密码哈希值
- `role`: 用户角色（普通用户/开发者/管理员）
- `is_active`: 账户是否激活

### 2. tools - 工具表
**功能**: 存储所有可用工具的定义和配置
```sql
CREATE TABLE tools (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    tool_id VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    type ENUM('mcp', 'http') NOT NULL,
    description VARCHAR(512),
    endpoint JSON NOT NULL,
    request_schema JSON NOT NULL,
    response_schema JSON,
    server_name VARCHAR(64),
    developer_id BIGINT,
    is_public BOOLEAN DEFAULT TRUE NOT NULL,
    status ENUM('active', 'inactive', 'pending') DEFAULT 'active' NOT NULL,
    version VARCHAR(32) DEFAULT '1.0.0' NOT NULL,
    tags JSON,
    download_count INTEGER DEFAULT 0 NOT NULL,
    rating FLOAT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (developer_id) REFERENCES users(id),
    UNIQUE KEY uq_tools_tool_id_server (tool_id, server_name)
);
```

**字段说明**:
- `tool_id`: 工具唯一标识
- `type`: 工具类型（MCP/HTTP）
- `endpoint`: 工具端点配置（JSON格式）
- `request_schema`: 请求参数JSON Schema
- `developer_id`: 工具创建者ID（外键）

### 3. sessions - 会话表
**功能**: 跟踪用户会话状态和生命周期
```sql
CREATE TABLE sessions (
    session_id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    status ENUM('interpreting', 'waiting_confirm', 'executing', 'done', 'error') 
           DEFAULT 'interpreting' NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**会话状态流程**:
```
interpreting → waiting_confirm → executing → done
     ↓              ↓              ↓         ↓
   error ←────────error ←────────error    完成
```

### 4. logs - 日志表
**功能**: 记录所有操作日志和错误信息
```sql
CREATE TABLE logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(36) NOT NULL,
    step VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);
```

### 5. apps - 应用表
**功能**: 存储开发者创建的应用定义
```sql
CREATE TABLE apps (
    app_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    version VARCHAR(32) DEFAULT '1.0.0' NOT NULL,
    developer_id BIGINT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE NOT NULL,
    status ENUM('draft', 'active', 'inactive', 'deployed') DEFAULT 'draft' NOT NULL,
    config JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (developer_id) REFERENCES users(id)
);
```

### 6. app_tools - 应用工具关联表
**功能**: 定义应用与工具的多对多关系
```sql
CREATE TABLE app_tools (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    app_id VARCHAR(50) NOT NULL,
    tool_id VARCHAR(64) NOT NULL,
    order_index INTEGER DEFAULT 0 NOT NULL,
    config JSON DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps(app_id),
    KEY ix_app_tools_app_id (app_id),
    KEY ix_app_tools_tool_id (tool_id)
);
```

## 🔗 表关系图

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│    users    │──────▶│    tools     │◄──────│    apps     │
│ (1)      (N)│       │              │       │             │
└─────────────┘       └──────────────┘       └─────────────┘
       │                                             │
       │ (1)                                     (N) │
       ▼                                             ▼
┌─────────────┐                              ┌─────────────┐
│  sessions   │                              │  app_tools  │
│ (1)      (N)│                              │             │
└─────────────┘                              └─────────────┘
       │
       │ (1)
       ▼
┌─────────────┐
│    logs     │
│             │
└─────────────┘
```

**关系说明**:
- User 1:N Tools (一个用户可以创建多个工具)
- User 1:N Apps (一个用户可以创建多个应用)
- User 1:N Sessions (一个用户可以有多个会话)
- Session 1:N Logs (一个会话可以有多条日志)
- App N:M Tools (通过app_tools表实现多对多关系)

## 🚀 MySQL数据库设置指南

### 步骤1: 安装MySQL
```bash
# Windows (使用MySQL Installer)
# 下载: https://dev.mysql.com/downloads/installer/

# macOS (使用Homebrew)
brew install mysql
brew services start mysql

# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
```

### 步骤2: 创建数据库和用户
```sql
-- 连接到MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE echo_ai_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 创建专用用户
CREATE USER 'echo_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- 授权
GRANT ALL PRIVILEGES ON echo_ai_db.* TO 'echo_user'@'localhost';
FLUSH PRIVILEGES;

-- 验证
SHOW DATABASES;
```

### 步骤3: 更新.env配置
将您的 `.env` 文件中的数据库配置更新为：

```bash
# 数据库配置 - MySQL
DATABASE_URL=mysql+pymysql://echo_user:your_secure_password@localhost:3306/echo_ai_db
DATABASE_NAME=echo_ai_db
```

### 步骤4: 安装Python MySQL驱动
```bash
# 在backend目录下
pip install pymysql aiomysql
```

### 步骤5: 运行数据库迁移
```bash
# 在backend目录下
# 1. 初始化Alembic (如果还未初始化)
alembic init alembic

# 2. 运行迁移创建所有表
alembic upgrade head

# 3. 验证表创建
mysql -u echo_user -p echo_ai_db -e "SHOW TABLES;"
```

**预期输出**:
```
+--------------------+
| Tables_in_echo_ai_db |
+--------------------+
| alembic_version    |
| app_tools          |
| apps               |
| logs               |
| sessions           |
| tools              |
| users              |
+--------------------+
```

## 🔧 数据库连接测试

### 测试脚本
创建 `test_db_connection.py` 文件：

```python
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings

async def test_connection():
    """测试数据库连接"""
    try:
        # 创建异步引擎
        engine = create_async_engine(
            settings.DATABASE_URL.replace("mysql+pymysql://", "mysql+aiomysql://"),
            echo=True
        )
        
        # 测试连接
        async with engine.connect() as conn:
            result = await conn.execute("SELECT 1 as test")
            print("✅ 数据库连接成功!")
            print(f"测试查询结果: {result.fetchone()}")
            
        await engine.dispose()
        
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
```

### 运行测试
```bash
cd Demo_Echo_Backend/backend
python test_db_connection.py
```

## 📝 初始数据示例

### 创建测试用户
```sql
-- 插入测试用户
INSERT INTO users (username, password_hash, email, role, is_active) VALUES
('admin', '$2b$12$example_hash', 'admin@echo.ai', 'admin', 1),
('developer', '$2b$12$example_hash', 'dev@echo.ai', 'developer', 1),
('testuser', '$2b$12$example_hash', 'user@echo.ai', 'user', 1);
```

### 创建示例工具
```sql
-- 插入示例HTTP工具
INSERT INTO tools (tool_id, name, type, description, endpoint, request_schema, response_schema, is_public, status) VALUES
('dify_chat', 'Dify智能助手', 'http', '基于Dify平台的AI对话助手', 
 '{"platform": "dify", "api_key": "your-key", "base_url": "https://api.dify.ai/v1"}',
 '{"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}',
 '{"type": "object", "properties": {"answer": {"type": "string"}}}',
 1, 'active');
```

## 🎯 数据库管理工具推荐

1. **phpMyAdmin**: Web界面管理
2. **MySQL Workbench**: 官方图形界面工具
3. **DBeaver**: 跨平台数据库工具
4. **Navicat**: 商业数据库管理工具

## ⚠️ 生产环境注意事项

1. **安全配置**:
   - 使用强密码
   - 限制数据库用户权限
   - 启用SSL连接

2. **性能优化**:
   - 配置合适的连接池大小
   - 添加必要的索引
   - 定期优化表

3. **备份策略**:
   - 设置自动备份
   - 定期测试恢复流程
   - 保留多个备份版本

4. **监控**:
   - 监控数据库性能
   - 设置慢查询日志
   - 监控磁盘使用情况

## 📚 相关文档

- [Alembic迁移文档](https://alembic.sqlalchemy.org/)
- [SQLAlchemy ORM文档](https://docs.sqlalchemy.org/)
- [MySQL官方文档](https://dev.mysql.com/doc/)

---

**文档版本**: v1.0  
**创建时间**: 2025-01-14  
**最后更新**: 2025-01-14  
**维护者**: 后端开发团队

完成MySQL设置后，重新启动应用即可使用MySQL数据库！🚀
