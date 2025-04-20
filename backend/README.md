# 智能语音AI-Agent开放平台 - 后端服务

## 项目说明

这是智能语音AI-Agent开放平台的后端服务，提供语音文本处理、通过MCP客户端调用高德地图服务查询信息，以及调用Minimax语音合成服务，构建完整的语音交互流程。

## 主要功能

本后端服务提供以下主要功能：

1. **测试服务** - 验证完整的语音交互流程
2. **MCP网关** - 将前端请求路由到指定的MCP服务
3. **统一API架构** - 标准化的请求/响应格式

## 新增功能：MCP网关

我们新增了MCP网关功能，用于解析前端请求并通过MCP_client处理。网关不直接与MCP服务器通信，而是将调用参数传递给MCP_client，由MCP_client负责实际的通信过程。

### 主要API端点

- `POST /api/v1/mcp/gateway/:serverId` - 通过指定MCP服务器处理请求
- `GET /api/v1/mcp/tools/:serverId` - 获取指定MCP服务器的工具列表
- `POST /api/v1/mcp/tool/:serverId/:toolName` - 在指定MCP服务器上执行特定工具

### 示例用法

```javascript
// 前端调用MCP网关示例
async function callMapService() {
  const response = await fetch('/api/v1/mcp/gateway/amap-maps', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: "北京天安门在哪里",
      options: {
        userId: "user123"
      }
    })
  });
  
  const result = await response.json();
  console.log(result.data);
}

// 调用特定工具示例
async function getWeather() {
  const response = await fetch('/api/v1/mcp/tool/amap-maps/getWeather', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      city: "北京"
    })
  });
  
  const result = await response.json();
  console.log(result.data);
}
```

### 工作原理

1. 网关解析请求，确定需要调用的MCP服务器ID
2. 网关将请求参数转换为MCP_client需要的格式
3. 通过Node.js子进程调用Python MCP_client处理请求
4. MCP_client处理完成后，网关解析结果并返回给前端

### 测试工具

我们提供了一个测试脚本用于测试网关功能：

```bash
# 从backend目录运行
node src/utils/gateway-test.js MiniMax "今天北京的天气如何？"
```

更多详细信息请参考[MCP网关文档](docs/mcp-gateway.md)。

## 测试服务说明

当前实现了一个测试服务，用于验证完整的语音交互流程：
1. 前端传来用户语音文本
2. 后端通过MCP客户端调用高德地图API查询地点信息
3. 后端根据地图数据生成简洁的文本回复
4. 后端通过MCP客户端调用Minimax合成语音并返回URL
5. 前端播放返回的语音

## 安装与运行

### 环境要求
- Node.js >= 14.0.0
- npm >= 6.0.0
- Python >= 3.6（用于MCP客户端）

### 1. 安装后端依赖
```bash
cd backend
npm install
```

### 2. 配置环境变量
复制环境变量示例文件并修改：
```bash
cp .env.example .env
```

编辑.env文件，填入必要的配置：
```
# 服务器配置
PORT=3001
NODE_ENV=development

# MCP客户端路径配置
MCP_CLIENT_PATH=../MCP_Client/src/mcp_client.py
MCP_CONFIG_PATH=../MCP_Client/config
MCP_PYTHON_PATH=python3

# MCP服务器配置
DEFAULT_AMAP_SERVER_ID=amap-maps
DEFAULT_MINIMAX_SERVER_ID=MiniMax

# 环境变量用于调试模式
USE_MOCK_RESPONSES=true  # 设置为true可以不依赖实际MCP客户端进行测试
DEBUG_MODE=true
```

### 3. 确认MCP客户端设置(如果不使用模拟模式)
确保MCP客户端目录结构正确，并且服务器配置包含了高德地图和Minimax服务。目录结构大致如下：
```
project-root/
├── backend/           # 当前项目
└── MCP_Client/        # MCP客户端项目
    ├── src/
    │   └── mcp_client.py
    └── config/
        └── mcp_servers.json  # 包含服务器配置
```

### 4. 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

默认情况下，服务器将在`http://localhost:3001`上运行。

## 前后端对接

### API接口文档

#### 测试服务 - 语音处理接口

**URL**: `/api/test-service/voice`
**方法**: `POST`
**请求体**:
```json
{
  "voiceText": "北京天安门在哪里",
  "userId": "user123",  // 可选
  "sessionId": "session456"  // 可选
}
```

**成功响应** (200 OK):
```json
{
  "status": "success",
  "textResponse": "北京天安门位于北京市东城区长安街。这是一个旅游景点。",
  "audioUrl": "https://storage.minimax.chat/audio/response-12345.mp3",
  "mapData": {
    "status": "1",
    "count": "1",
    "pois": [...]
  }
}
```

### 前端集成示例
前端可以通过以下方式调用后端API：

```javascript
// 使用fetch API调用语音处理接口
async function processVoiceText(voiceText) {
  try {
    const response = await fetch('http://localhost:3001/api/test-service/voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        voiceText: voiceText,
        userId: 'user123',
        sessionId: 'session456'
      })
    });
    
    const result = await response.json();
    
    if (result.status === 'success') {
      // 显示文本响应
      displayTextResponse(result.textResponse);
      
      // 播放语音响应
      if (result.audioUrl) {
        playAudio(result.audioUrl);
      }
      
      // 处理地图数据
      if (result.mapData) {
        displayMapData(result.mapData);
      }
    } else {
      console.error('处理失败:', result.message);
    }
  } catch (error) {
    console.error('API调用错误:', error);
  }
}

// 播放音频URL
function playAudio(audioUrl) {
  const audio = new Audio(audioUrl);
  audio.play().catch(e => console.error('音频播放失败:', e));
}
```

## 使用模拟服务进行测试

在无法访问实际MCP服务时，可以通过设置环境变量启用模拟服务：

```
USE_MOCK_RESPONSES=true
```

这将启用模拟的地图查询和语音合成功能，便于本地测试。

## 故障排除

1. **无法连接到MCP客户端**
   - 检查MCP_CLIENT_PATH路径是否正确
   - 检查Python环境是否安装了必要的依赖
   - 查看logs/error.log获取详细错误

2. **无法查询地图信息**
   - 检查高德地图服务器ID是否正确配置
   - 检查MCP服务器配置中是否包含正确的API密钥

3. **无法合成语音**
   - 检查Minimax服务器ID是否正确配置
   - 检查MCP服务器配置中是否包含有效的Minimax API密钥

4. **MCP网关问题**
   - 确保serverId参数正确，与mcp_servers.json中的ID一致
   - 查看临时文件目录(tmp/)是否有权限问题
   - 检查网关相关日志获取详细错误信息