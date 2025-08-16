# MCP客户端 (MCP_Client)

MCP客户端是一个轻量级的Python工具，用于连接和调用各种MCP（Model Context Protocol）服务。它作为我们智能语音AI平台的一个核心组件，处理与各种AI模型和服务的通信。

## 主要功能

- 连接到MCP服务器（如MiniMax、Web3、地图服务等）
- 代理API请求到相应的MCP服务
- 提供统一的接口供主应用程序调用
- 支持直接模式和服务模式两种运行方式

## 依赖环境

- Python >= 3.9
- [uv](https://github.com/astral-sh/uv) - 推荐的Python包管理工具

## 安装

### 1. 克隆仓库（如果尚未克隆）

```bash
git clone https://github.com/your-org/your-repo.git
cd your-repo/MCP_Client
```

### 2. 创建虚拟环境

使用uv（推荐）:
```bash
uv venv
```

或使用传统方式:
```bash
python -m venv .venv
```

### 3. 激活虚拟环境

在Linux/macOS:
```bash
source .venv/bin/activate
```

在Windows:
```bash
.venv\Scripts\activate
```

### 4. 安装依赖

使用uv（推荐）:
```bash
uv pip install git+https://github.com/modelcontextprotocol/python-sdk.git
uv pip install openai python-dotenv
```

或使用传统方式:
```bash
pip install git+https://github.com/modelcontextprotocol/python-sdk.git
pip install openai python-dotenv
```

## 配置

### 1. 环境变量

创建`.env`文件（可从`.env.example`复制）:

```bash
cp .env.example .env
```

编辑`.env`文件，填写必要的配置:

```
# 必要配置
LLM_API_KEY=your_api_key_here  # 您的API密钥
LLM_MODEL=gpt-4o               # 使用的模型
LLM_API_BASE=https://api.openai.com/v1  # API基础URL
LLM_PROVIDER=openai            # 提供商名称
```

### 2. MCP服务器配置

编辑`config/mcp_servers.json`文件，添加或修改MCP服务器配置:

```json
{
  "mcpServers": {
    "minimax": {
      "name": "MiniMax服务",
      "path": "npx minimax-mcp-js",
      "description": "提供MiniMax模型API访问"
    },
    "web3": {
      "name": "Web3服务",
      "path": "npx @modelcontextprotocol/web3-mcp-js",
      "description": "提供区块链和加密货币操作"
    }
  }
}
```

## 使用方式

### 直接模式

在直接模式下，MCP_Client直接连接到指定的MCP服务器，适合测试或单独使用:

```bash
# 格式
python src/mcp_client.py <mcp_server_path>

# 例如，连接到MiniMax服务
python src/mcp_client.py "npx minimax-mcp-js"

# 或使用配置文件中定义的服务ID
python src/mcp_client.py --server-id minimax
```

### 服务模式（通过后端API网关）

在服务模式下，MCP_Client由主应用程序的后端通过API网关调用:

```bash
# 启动后端，配置指向MCP_Client
cd ../backend
NODE_ENV=development PORT=3002 \
MCP_CLIENT_PATH=/home/devbox/project/MCP_Client/src/mcp_client.py \
MCP_CONFIG_PATH=/home/devbox/project/MCP_Client/config \
MCP_PYTHON_PATH="python3" \
node src/app.js
```

## 开发文档

### 代码结构

```
MCP_Client/
├── config/               # 配置文件
│   ├── default.json      # 默认配置
│   └── mcp_servers.json  # MCP服务器配置
├── src/                  # 源代码
│   ├── mcp_client.py     # 主客户端实现
│   ├── mcp/              # MCP通信相关模块
│   └── utils/            # 工具函数
│       ├── logger.py     # 日志工具
│       └── server_config.py # 服务器配置工具
└── .env                  # 环境变量（需自行创建）
```

### API参考

MCP_Client在直接模式下接受以下命令行参数:

- 无参数: 显示帮助信息
- 路径参数: MCP服务器路径（例如 `npx minimax-mcp-js`）
- `--server-id`: 使用配置文件中定义的服务器ID

在服务模式下，MCP_Client接受JSON格式的输入，包含:

- `serverId`: MCP服务器ID
- `input`: 用户输入文本
- `toolCalls`: 工具调用数据（如适用）

## 故障排除

### 常见问题

1. **连接失败**
   - 检查MCP服务器路径是否正确
   - 确认相关NPM包已安装（如minimax-mcp-js）
   - 检查网络连接

2. **API密钥错误**
   - 确认.env文件中的API密钥已正确设置
   - 检查相应服务提供商的账户状态

3. **模块找不到**
   - 确认已安装所有依赖项
   - 检查虚拟环境是否已激活

### 日志

日志文件位于程序运行目录的`logs/`文件夹下，可通过查看日志获取详细错误信息。

## 贡献指南

欢迎提交问题报告和合并请求。

## 许可证

[MIT](LICENSE) 