# AI 意图识别系统

基于大型语言模型的高级意图识别和分析系统，能够从用户的自然语言输入中提取意图和实体，生成推荐工具列表。

## 项目特点

- 基于 FastAPI 构建的高性能 API
- 利用 OpenAI GPT-4 进行意图分析和实体提取
- 支持 MCP (Multi-Chain Protocol) 工具集成
- 提供完整的意图处理流程
- 非阻塞异步处理

## 系统架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  客户端请求  │────▶│  控制器层   │────▶│   服务层    │────▶│   模型层    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                          │                   │
                          │                   │
                          ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   工具层    │     │  第三方服务  │
                    └─────────────┘     └─────────────┘
```

## 快速开始

### 环境配置

1. 克隆仓库:

```bash
git clone <repository-url>
cd ai-intent-recognition
```

2. 创建虚拟环境:

```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# 或者
.venv\Scripts\activate  # Windows
```

3. 安装依赖:

```bash
pip install -r backend/requirements.txt
```

4. 配置环境变量:

```bash
cp backend/env.example backend/.env
# 编辑 .env 文件，设置相关配置
```

### 运行应用

```bash
cd backend
python -m app.main
```

应用将在 http://localhost:8000 上运行，API 文档可在 http://localhost:8000/docs 查看。

### API使用

#### 意图识别

```bash
curl -X POST "http://localhost:8000/api/v1/intent/process" \
     -H "Content-Type: application/json" \
     -d '{"query": "明天上海会下雨吗", "session_id": "test-session"}'
```

## 开发指南

### 添加新功能

1. 在 `app/routers` 目录下创建新的路由模块
2. 在 `app/controllers` 目录下创建对应的控制器
3. 在 `app/services` 目录下添加业务逻辑
4. 在 `app/schemas` 目录下定义数据模型
5. 在 `app/main.py` 中注册新路由

### 测试

运行测试:

```bash
cd backend
pytest
```

## 技术栈

- **FastAPI**: Web框架
- **Pydantic**: 数据验证
- **SQLAlchemy**: ORM
- **OpenAI API**: 意图分析
- **Uvicorn**: ASGI服务器
- **Loguru**: 日志管理

## 贡献

欢迎提交Issue和Pull Request！

## 许可

MIT 