# MCP网关功能使用说明

本文档介绍后端实现的MCP网关功能，用于解析前端请求并通过MCP_client处理。

## 功能概述

MCP网关功能提供了三种主要能力：

1. **请求处理** - 解析前端请求并通过MCP_client处理，由MCP_client负责与实际的MCP服务器通信
2. **工具列表获取** - 获取指定MCP服务器支持的工具列表
3. **工具直接调用** - 通过MCP_client在指定MCP服务器上执行特定工具

所有API都遵循统一的响应格式：

```json
{
  "status": "success|error|waiting",
  "data": { /* 响应数据 */ },
  "message": "操作结果描述",
  "timestamp": "2023-04-19T12:34:56.789Z"
}
```

## API接口说明

### 1. 通过MCP_client处理请求

将请求发送给MCP_client处理，由MCP_client负责与指定的MCP服务器通信。

**请求URL:** `POST /api/v1/mcp/gateway/:serverId`

**路径参数:**
- `serverId` - MCP服务器ID，如 "MiniMax", "playwright", "web3-rpc" 等

**请求体:** 请求数据对象，包含查询内容和其他必要参数

**示例请求:**
```json
{
  "query": "今天北京的天气如何？",
  "timestamp": "2023-04-19T12:34:56.789Z"
}
```

**示例响应:**
```json
{
  "status": "success",
  "data": {
    "result": "北京今天天气晴朗，气温20-28°C，空气质量良好。"
  },
  "message": "MCP请求处理成功",
  "timestamp": "2023-04-19T12:35:00.123Z"
}
```

### 2. 获取MCP服务器工具列表

获取指定MCP服务器支持的工具列表。

**请求URL:** `GET /api/v1/mcp/tools/:serverId`

**路径参数:**
- `serverId` - MCP服务器ID

**示例响应:**
```json
{
  "status": "success",
  "data": {
    "tools": [
      {
        "name": "getPoiInfo",
        "description": "获取指定位置的POI信息",
        "parameters": {
          "type": "object",
          "properties": {
            "location": { "type": "string" }
          }
        }
      },
      {
        "name": "getWeather",
        "description": "获取指定城市的天气信息",
        "parameters": {
          "type": "object",
          "properties": {
            "city": { "type": "string" }
          }
        }
      }
    ]
  },
  "message": "获取工具列表成功",
  "timestamp": "2023-04-19T12:35:00.123Z"
}
```

### 3. 通过MCP_client执行工具

通过MCP_client在指定的MCP服务器上执行特定工具。

**请求URL:** `POST /api/v1/mcp/tool/:serverId/:toolName`

**路径参数:**
- `serverId` - MCP服务器ID
- `toolName` - 工具名称

**请求体:** 工具参数，根据工具的不同而不同

**示例请求:**
```json
{
  "city": "北京"
}
```

**示例响应:**
```json
{
  "status": "success",
  "data": {
    "weather": "晴朗",
    "temperature": "20-28°C",
    "humidity": "45%",
    "wind": "东北风3-4级"
  },
  "message": "工具执行成功",
  "timestamp": "2023-04-19T12:35:00.123Z"
}
```

## 使用示例

### 使用命令行测试网关功能

可以使用提供的测试脚本来测试网关功能：

```bash
# 通过MCP_client处理MiniMax服务请求
node src/utils/gateway-test.js MiniMax "今天北京的天气如何？"

# 通过MCP_client处理web3-rpc服务请求
node src/utils/gateway-test.js web3-rpc "获取钱包余额"
```

### 在前端代码中使用

```javascript
// 通过MCP_client处理请求
async function callMCPGateway(serverId, requestData) {
  const response = await fetch(`/api/v1/mcp/gateway/${serverId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });
  return await response.json();
}

// 获取MCP服务器工具列表
async function getMCPTools(serverId) {
  const response = await fetch(`/api/v1/mcp/tools/${serverId}`);
  return await response.json();
}

// 通过MCP_client执行工具
async function executeMCPTool(serverId, toolName, toolParams) {
  const response = await fetch(`/api/v1/mcp/tool/${serverId}/${toolName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(toolParams)
  });
  return await response.json();
}
```

## 工作原理

1. 前端发送请求到网关API
2. 网关解析请求，确定需要调用的MCP服务器ID
3. 网关将请求参数转换为MCP_client需要的格式
4. 通过MCP_client处理请求，MCP_client负责与指定的MCP服务器通信
5. MCP_client处理完成后，将结果返回给网关
6. 网关将结果返回给前端

## 注意事项

1. 在调用网关API前，确保后端服务已正确配置并启动
2. MCP服务器ID必须在MCP_Client/config/mcp_servers.json中已配置
3. 工具调用的参数格式必须符合工具的要求
4. 请确保请求中包含必要的参数，如查询内容
5. 网关不直接与MCP服务器通信，而是通过MCP_client负责处理请求 