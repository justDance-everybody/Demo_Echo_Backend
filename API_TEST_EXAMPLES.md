# API测试示例 - 开发者工具上传

## 前置条件

1. 启动后端服务
```bash
cd Demo_Echo_Backend/backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

2. 获取开发者Token
```bash
# 登录获取Token（使用开发者账号）
curl -X POST http://localhost:3000/api/v1/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=devuser_5090&password=mryuWTGdMk"

# 保存返回的access_token
export DEV_TOKEN="your_access_token_here"
```

## 测试场景1: 创建Dify平台工具

### 请求示例
```bash
curl -X POST http://localhost:3000/api/v1/dev/tools \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "dify_chat_assistant",
    "name": "Dify智能助手",
    "type": "http",
    "description": "基于Dify平台的AI对话助手",
    "endpoint": {
      "platform": "dify",
      "api_key": "app-your_dify_api_key_here",
      "base_url": "https://api.dify.ai/v1",
      "app_config": {
        "response_mode": "blocking",
        "timeout": 30
      }
    },
    "request_schema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "用户的问题或请求"
        }
      },
      "required": ["query"]
    },
    "response_schema": {
      "type": "object",
      "properties": {
        "answer": {
          "type": "string",
          "description": "AI的回答"
        }
      }
    },
    "version": "1.0.0",
    "tags": ["dify", "chat", "ai"],
    "is_public": true
  }'
```

### 预期响应（成功）
```json
{
  "tool_id": "dify_chat_assistant",
  "name": "Dify智能助手",
  "type": "http",
  "description": "基于Dify平台的AI对话助手",
  "endpoint": {
    "platform": "dify",
    "api_key": "app-your_dify_api_key_here",
    "base_url": "https://api.dify.ai/v1",
    "app_config": {
      "response_mode": "blocking",
      "timeout": 30
    }
  },
  "request_schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "用户的问题或请求"
      }
    },
    "required": ["query"]
  },
  "response_schema": {
    "type": "object",
    "properties": {
      "answer": {
        "type": "string",
        "description": "AI的回答"
      }
    }
  },
  "developer_id": 1,
  "is_public": true,
  "status": "pending",
  "version": "1.0.0",
  "tags": ["dify", "chat", "ai"],
  "download_count": 0,
  "rating": 0.0,
  "created_at": "2025-01-14T10:00:00",
  "updated_at": "2025-01-14T10:00:00"
}
```

## 测试场景2: 创建Coze平台工具

### 请求示例
```bash
curl -X POST http://localhost:3000/api/v1/dev/tools \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "coze_bot_assistant",
    "name": "Coze智能机器人",
    "type": "http",
    "description": "基于Coze平台的智能对话机器人",
    "endpoint": {
      "platform": "coze",
      "api_key": "your_coze_api_key_here",
      "base_url": "https://api.coze.com/open_api/v2",
      "app_config": {
        "bot_id": "your_bot_id_here",
        "timeout": 30
      }
    },
    "request_schema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "用户的问题"
        }
      },
      "required": ["query"]
    },
    "version": "1.0.0",
    "tags": ["coze", "bot", "ai"],
    "is_public": true
  }'
```

### 预期响应（成功）
```json
{
  "tool_id": "coze_bot_assistant",
  "name": "Coze智能机器人",
  "type": "http",
  "description": "基于Coze平台的智能对话机器人",
  "endpoint": {
    "platform": "coze",
    "api_key": "your_coze_api_key_here",
    "base_url": "https://api.coze.com/open_api/v2",
    "app_config": {
      "bot_id": "your_bot_id_here",
      "timeout": 30
    }
  },
  "status": "pending",
  "created_at": "2025-01-14T10:00:00"
}
```

## 测试场景3: 上传工具包（Dify）

### 准备工具包
```bash
# 1. 创建manifest.json文件（参考test_tool_package/dify_manifest.json）
# 2. 打包为zip文件
cd test_tool_package
zip -r dify_tool.zip dify_manifest.json
```

### 上传请求
```bash
curl -X POST http://localhost:3000/api/v1/dev/upload \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -F "file=@test_tool_package/dify_tool.zip"
```

### 预期响应（成功）
```json
{
  "upload_id": "upload_1_1705228800",
  "status": "completed",
  "message": "成功解析工具包，创建了 1 个工具",
  "tools_created": ["dify智能助手_a1b2c3d4"]
}
```

## 测试场景4: 上传工具包（Coze）

### 准备工具包
```bash
cd test_tool_package
zip -r coze_tool.zip coze_manifest.json
```

### 上传请求
```bash
curl -X POST http://localhost:3000/api/v1/dev/upload \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -F "file=@test_tool_package/coze_tool.zip"
```

### 预期响应（成功）
```json
{
  "upload_id": "upload_1_1705228900",
  "status": "completed",
  "message": "成功解析工具包，创建了 1 个工具",
  "tools_created": ["coze智能机器人_e5f6g7h8"]
}
```

## 测试场景5: 验证工具包

### 请求示例
```bash
curl -X POST http://localhost:3000/api/v1/dev/upload/validate \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -F "file=@test_tool_package/dify_tool.zip"
```

### 预期响应（成功）
```json
{
  "valid": true,
  "message": "工具包格式验证通过",
  "tools_found": 1,
  "warnings": []
}
```

## 测试场景6: 测试工具

### 请求示例
```bash
curl -X POST http://localhost:3000/api/v1/dev/tools/dify_chat_assistant/test \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test_data": {
      "query": "你好，这是一个测试"
    },
    "timeout": 30
  }'
```

### 预期响应（成功）
```json
{
  "success": true,
  "result": {
    "message": "工具 dify_chat_assistant 测试成功",
    "data": {
      "tts_message": "AI回答：你好！我是Dify智能助手..."
    }
  },
  "error": null,
  "execution_time": 1.234,
  "timestamp": "2025-01-14T10:00:00"
}
```

## 错误场景测试

### 错误1: 缺少platform字段
```bash
curl -X POST http://localhost:3000/api/v1/dev/tools \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "invalid_tool",
    "name": "无效工具",
    "type": "http",
    "endpoint": {
      "api_key": "test_key"
    },
    "request_schema": {}
  }'
```

**预期错误响应**:
```json
{
  "detail": "工具ID 'invalid_tool' 已存在"
}
```

### 错误2: Coze工具缺少bot_id
```bash
curl -X POST http://localhost:3000/api/v1/dev/tools \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "coze_no_bot",
    "name": "无效Coze工具",
    "type": "http",
    "endpoint": {
      "platform": "coze",
      "api_key": "test_key",
      "app_config": {}
    },
    "request_schema": {}
  }'
```

**预期错误**: 验证失败，提示缺少bot_id

### 错误3: 不支持的工具类型
```bash
curl -X POST http://localhost:3000/api/v1/dev/tools \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tool_id": "api_tool",
    "name": "API工具",
    "type": "api",
    "endpoint": {
      "url": "http://test.com"
    },
    "request_schema": {}
  }'
```

**预期错误**: 工具类型必须是mcp或http之一

## 查询工具列表

### 获取所有工具
```bash
curl -X GET "http://localhost:3000/api/v1/dev/tools?page=1&page_size=10" \
  -H "Authorization: Bearer $DEV_TOKEN"
```

### 搜索Dify工具
```bash
curl -X GET "http://localhost:3000/api/v1/dev/tools?search=dify" \
  -H "Authorization: Bearer $DEV_TOKEN"
```

### 筛选HTTP类型工具
```bash
curl -X GET "http://localhost:3000/api/v1/dev/tools" \
  -H "Authorization: Bearer $DEV_TOKEN"
```

## 获取单个工具详情

```bash
curl -X GET http://localhost:3000/api/v1/dev/tools/dify_chat_assistant \
  -H "Authorization: Bearer $DEV_TOKEN"
```

## 更新工具

```bash
curl -X PUT http://localhost:3000/api/v1/dev/tools/dify_chat_assistant \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "更新后的描述",
    "is_public": false
  }'
```

## 删除工具

```bash
curl -X DELETE http://localhost:3000/api/v1/dev/tools/dify_chat_assistant \
  -H "Authorization: Bearer $DEV_TOKEN"
```

## 注意事项

1. **认证**: 所有API都需要开发者或管理员角色的JWT Token
2. **API密钥**: 示例中的API密钥需要替换为真实的密钥
3. **Bot ID**: Coze平台的bot_id需要从Coze开发者控制台获取
4. **超时设置**: 根据实际情况调整timeout参数
5. **工具状态**: 新创建的工具默认状态为"pending"（待审核）

