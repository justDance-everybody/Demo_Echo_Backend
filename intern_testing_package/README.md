# 实习生后端API测试包

## 概述
这个测试包为实习生提供了完整的后端API测试环境，包含所有核心功能的测试，同时保护生产环境的敏感信息。

## 测试目标
- 用户注册和认证系统
- 开发者工具提交和管理
- 意图解析和指令识别
- 工具执行和MCP服务器集成
- API接口稳定性和性能

## 快速开始

### 1. 环境准备

确保你的本地系统已安装：
- Docker 和 Docker Compose
- Python 3.8+
- Git

### 2. 获取测试包

将整个 `intern_testing_package` 文件夹下载到你的本地环境中。

### 3. 运行测试

```bash
# 进入测试包目录
cd intern_testing_package

# 启动测试环境（脚本会自动处理权限）
bash start_testing.sh

# 运行自动化测试
python test_runner.py

# 停止测试环境
bash stop_testing.sh
```

### 4. 手动启动（可选）

如果需要手动控制各个组件：

```bash
# 安装依赖
pip install -r requirements.txt

# 启动测试数据库
docker-compose up -d mysql

# 运行数据库迁移
cd backend && alembic upgrade head

# 启动后端服务
python -m uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload
```

### 5. 运行测试
```bash
# 运行所有API测试
python test_runner.py

# 运行特定模块测试
python test_runner.py --module auth
python test_runner.py --module tools
python test_runner.py --module intent
```

### 3. 测试覆盖范围

#### 认证模块测试
- 用户注册 (`POST /api/v1/auth/register`)
- 用户登录 (`POST /api/v1/auth/token`)
- 获取用户信息 (`GET /api/v1/auth/me`)
- JWT令牌验证
- 角色权限控制

#### 意图解析测试
- 文本意图解析 (`POST /api/v1/intent/interpret`)
- 意图确认执行 (`POST /api/v1/intent/confirm`)
- 多轮对话处理
- 错误指令处理

#### 工具管理测试
- 获取工具列表 (`GET /api/v1/tools`)
- 工具执行 (`POST /api/v1/execute`)
- 开发者工具管理 (`GET/POST/PUT/DELETE /api/v1/dev/tools`)
- 工具包上传和解析

#### MCP服务器测试
- MCP服务器状态 (`GET /api/v1/mcp/status`)
- MCP工具调用
- 服务器连接稳定性

#### 系统监控测试
- 健康检查 (`GET /health`)
- API文档访问 (`GET /docs`)
- 错误处理和日志记录

## 安全保护措施

### 环境隔离
- 在你的本地环境中运行，与生产环境完全隔离
- 使用独立的本地测试数据库
- 所有测试数据都是预设的模拟数据

### 敏感信息保护
- 生产数据库连接信息已替换为本地测试配置
- API密钥使用测试专用密钥（无法访问生产服务）
- 所有生产环境配置和密钥已移除

### 代码保护
- 提供完整功能代码用于本地测试和调试
- 核心业务逻辑保持完整以确保测试有效性
- 通过环境变量严格控制测试模式，无法连接生产环境

## 测试数据

### 测试用户
```json
{
  "username": "testuser",
  "password": "testpass123",
  "email": "test@example.com",
  "role": "user"
}

{
  "username": "developer",
  "password": "devpass123",
  "email": "dev@example.com",
  "role": "developer"
}
```

### 测试工具
- 天气查询工具
- 计算器工具
- 文本处理工具
- HTTP API工具示例

## 调试指南

### 日志查看
```bash
# 查看应用日志
tail -f backend/logs/app.log

# 查看错误日志
tail -f backend/logs/error.log
```

### 数据库调试
```bash
# 连接测试数据库
mysql -h localhost -u testuser -p testdb

# 查看表结构
SHOW TABLES;
DESCRIBE users;
DESCRIBE tools;
```

### API调试
- 使用Postman集合：`postman_collection.json`
- 在线API文档：`http://localhost:3000/docs`
- 测试脚本：`scripts/api_test.py`

## 常见问题

### Q: 数据库连接失败
A: 检查Docker容器是否启动，确认数据库配置正确

### Q: API返回401错误
A: 检查JWT令牌是否有效，确认用户已正确登录

### Q: MCP工具调用失败
A: 检查MCP服务器状态，确认配置文件正确

### Q: 测试数据不一致
A: 重置测试数据库：`python scripts/reset_test_data.py`

## 提交测试结果

### Bug报告
1. 在`bug_reports/`目录下创建报告文件
2. 使用模板：`bug_report_template.md`
3. 包含复现步骤、错误日志、修复建议

### 性能测试
1. 运行性能测试：`python scripts/performance_test.py`
2. 生成报告：`reports/performance_report.html`
3. 分析瓶颈和优化建议

### 代码改进
1. 创建功能分支：`git checkout -b fix/issue-description`
2. 提交代码修改
3. 创建Pull Request

## 联系方式
如有问题，请联系项目负责人或在项目Issue中提出。