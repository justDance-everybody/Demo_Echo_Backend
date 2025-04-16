# MCP 客户端

这是一个基于Model Context Protocol (MCP)的Python客户端实现，可以连接到任何兼容MCP的服务器，并使用大型语言模型（如OpenAI）执行工具调用。

## 功能特点

- 支持连接到Python或Node.js MCP服务器
- 使用OpenAI API作为LLM提供者
- 基于环境变量的配置
- 自动处理工具调用和响应
- 完整的日志记录

## 安装

1. 克隆仓库
2. 创建并激活虚拟环境
3. 安装依赖

```bash
# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境
# Windows
.venv\Scripts\activate
# Mac/Linux
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

## 配置

在项目根目录下创建`.env`文件，包含以下配置：

```
# 语言模型基本配置
LLM_API_KEY=your_api_key_here
LLM_MODEL=your_model_name  # 例如 gpt-3.5-turbo
LLM_API_BASE=https://api.openai.com/v1  # 可选，OpenAI API地址或兼容接口

# 语言模型高级参数
LLM_MAX_TOKENS=1000  # 最大输出令牌数
LLM_TEMPERATURE=0.7  # 可选，采样温度
LLM_TOP_P=0.9  # 可选，核采样
LLM_FREQUENCY_PENALTY=0.0  # 可选，频率惩罚
LLM_PRESENCE_PENALTY=0.0  # 可选，存在惩罚

# MCP服务器配置
# 所有以MCP_开头的环境变量都会传递给服务器
MCP_SERVER_HOST=0.0.0.0  # 可选，服务器主机
MCP_SERVER_PORT=3001  # 可选，服务器端口

# 日志配置
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
```

## 使用方法

运行MCP客户端，连接到MCP服务器：

```bash
python src/mcp_client.py path/to/server_script.py  # Python服务器
# 或
python src/mcp_client.py path/to/server_script.js  # Node.js服务器
```

启动后，在交互式终端中输入查询，客户端将：
1. 将查询发送到语言模型
2. 处理模型请求的任何工具调用
3. 将结果返回给模型
4. 显示最终响应

输入`quit`退出客户端。

## 开发

### 项目结构

- `src/mcp_client.py` - 主要客户端实现
- `src/utils/logger.py` - 日志工具
- `requirements.txt` - 项目依赖

### 自定义

要扩展客户端功能，可以修改`process_query`方法以支持更多交互模式或添加自定义处理逻辑。

### 支持的环境变量

以下是所有支持的环境变量及其功能：

| 环境变量 | 描述 | 默认值 |
|----------|------|--------|
| LLM_API_KEY | 语言模型API密钥 | 无 |
| LLM_API_BASE | API基础URL | 无（使用SDK默认值） |
| LLM_MODEL | 要使用的模型名称 | 无（必须设置） |
| LLM_MAX_TOKENS | 最大输出令牌数 | 1000 |
| LLM_TEMPERATURE | 输出温度（0-2） | 无（使用API默认值） |
| LLM_TOP_P | 核采样概率 | 无（使用API默认值） |
| LLM_FREQUENCY_PENALTY | 频率惩罚 | 无（使用API默认值） |
| LLM_PRESENCE_PENALTY | 存在惩罚 | 无（使用API默认值） |
| LOG_LEVEL | 日志级别 | INFO |

所有以`MCP_`开头的环境变量会被传递给MCP服务器。
