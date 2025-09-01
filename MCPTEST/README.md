# MCP 测试客户端

这是一个用于测试 MCP (Model Control Protocol) 服务的客户端程序。

## 必需文件

1. `client.py` - 主程序文件
2. `mcp_servers.json` - 服务器配置文件
3. `.env` - 环境变量配置文件

## 环境配置

1. 创建虚拟环境（推荐）：
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# 或
.venv\Scripts\activate  # Windows
```

2. 安装依赖：
```bash
pip install -r requirements.txt
```

3. 配置环境变量：
   - 复制 `.env.example` 为 `.env`
   - 填写必要的环境变量：
     - `LLM_API_KEY`: API密钥
     - `LLM_MODEL`: 模型名称
     - `LLM_API_BASE`: API基础URL

## 运行程序

```bash
python client.py
```

## 配置说明

### 环境变量

- `LLM_API_KEY`: 必需，API密钥
- `LLM_MODEL`: 必需，模型名称
- `LLM_API_BASE`: 必需，API基础URL
- `MCP_SERVERS_PATH`: 可选，服务器配置文件路径，默认为 `mcp_servers.json`

### 服务器配置文件 (mcp_servers.json)

服务器配置文件包含了MCP服务器的连接信息，格式如下：

```json
{
  "servers": [
    {
      "name": "服务器名称",
      "url": "服务器URL",
      "type": "服务器类型"
    }
  ]
}
```

## 系统要求

- Python 3.8+
- 大语言模型 API 密钥（OpenAI、Minimax等）
- MCP 服务器（.py 或 .js 文件）

## 设置环境

1. 确保在 `.env` 文件中设置了您的 API 密钥：

```
LLM_API_KEY=your_api_key
LLM_MODEL=gpt-4o或其他模型
LLM_API_BASE=https://api.openai.com/v1  # 可选，用于非OpenAI API
```

2. 对于 Solana 相关功能，配置以下环境变量：

```
SOLANA_PRIVATE_KEY=your_solana_private_key
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

3. 配置 `mcp_servers.json` 文件来管理您的服务器：

```json
{
  "mcpServers": {
    "服务器1": {
      "name": "服务器显示名称",
      "description": "服务器描述",
      "command": "命令",
      "args": ["参数1", "参数2"],
      "env": {
        "环境变量名": "环境变量值"
      },
      "enabled": true
    }
  },
  "defaultServer": "默认服务器名"
}
```

## 使用方法

### 快速启动（推荐）

使用提供的启动脚本，自动检测虚拟环境并在需要时安装依赖：

```bash
# 基本用法 - 启动客户端，显示可用服务器列表
 start_mcp.sh

# 指定服务器名称
bash start_mcp.sh minimax

# 显示帮助信息
bash start_mcp.sh --help
```

**脚本特性：**

- 自动检测虚拟环境，如果不存在会创建并激活
- 只在首次运行或依赖缺失时安装依赖，避免不必要的安装过程
- 支持以下命令行选项：

```
选项:
  --install    强制重新安装依赖
  --help       显示帮助信息

示例:
  start_mcp.sh                    # 启动客户端，显示服务器列表
  start_mcp.sh minimax            # 使用名为'minimax'的服务器启动
  start_mcp.sh --install          # 强制重新安装依赖并启动客户端
  start_mcp.sh --install minimax  # 强制重新安装依赖并使用指定服务器启动
```

### 手动启动

如果您已经设置好环境，也可以直接启动客户端：

1. 不带参数运行，将显示可用服务器列表供选择：

```bash
python client.py
```

2. 指定服务器名称（从配置文件中）：

```bash
python client.py --server web3-rpc
```

3. 指定服务器脚本路径（直接路径）：

```bash
python client.py --server path/to/server.py  # Python 服务器
# 或者
python client.py --server path/to/server.js  # Node.js 服务器
```

## 功能

- 连接到任何符合 MCP 规范的服务器
- 支持多种大语言模型 API（OpenAI、Minimax等）
- 支持工具调用和结果处理
- 交互式聊天界面
- 通过配置文件管理多个服务器
- Solana 区块链工具集成

## 工作原理

1. 客户端加载 `mcp_servers.json` 配置文件
2. 连接到指定的 MCP 服务器或让用户从列表中选择
3. 获取服务器提供的可用工具列表
4. 用户输入查询后，将查询和工具描述发送给大语言模型
5. 大语言模型决定是否使用工具，并返回响应
6. 如果需要使用工具，客户端会调用服务器上的相应工具并获取结果
7. 工具结果会被发送回大语言模型以获取最终响应
8. 最终响应展示给用户

## 自定义配置

您可以修改以下部分来自定义客户端：

- 在 `.env` 文件中更改大语言模型配置
- 调整 `max_tokens` 参数
- 自定义工具调用处理逻辑
- 添加新的服务器到 `mcp_servers.json` 配置文件 

## 常见问题

- **找不到 MCP 服务器**: 确保 `mcp_servers.json` 文件配置正确
- **API 密钥错误**: 检查 `.env` 文件中的 `LLM_API_KEY` 设置
- **无法安装依赖**: 尝试使用 `start_mcp.sh --install` 强制重新安装依赖 