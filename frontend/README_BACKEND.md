# 🚀 Echo AI 后端集成指南

## 📋 当前状态
- ✅ 前端已完成，支持完整的语音交互功能
- 🎭 当前使用Mock数据（假数据）进行演示
- 🔄 支持一键切换到真实后端

## 🎯 切换到真实后端的步骤

### 1️⃣ 修改环境变量配置
编辑 `.env` 文件：
```bash
# 修改为你的真实后端地址
REACT_APP_API_BASE_URL=http://你的后端IP:端口

# 关闭Mock数据，使用真实后端
REACT_APP_USE_MOCKS=false
```

### 2️⃣ 重启前端服务
```bash
# 停止当前服务
pkill -f "react-scripts"

# 重新启动
npm start
```

### 3️⃣ 验证连接
打开浏览器控制台，应该看到：
```
🔧 API配置: 基础URL=http://你的后端地址, 使用Mock=false
🌐 连接真实后端: http://你的后端地址
```

## 🔌 后端API接口规范

### 核心接口列表

#### 1. 语音意图解析接口
```javascript
POST /api/interpret
Content-Type: application/json

请求体:
{
  "query": "用户的语音文本",
  "sessionId": "会话ID", 
  "userId": "用户ID"
}

响应格式:
{
  "type": "confirm|direct_reply|tool_calls",
  "action": "工具名称",
  "params": { "参数对象" },
  "confirmText": "确认文本",
  "sessionId": "会话ID"
}
```

#### 2. 工具执行接口
```javascript
POST /api/v1/execute
Content-Type: application/json

请求体:
{
  "tool_id": "工具ID",
  "params": { "参数对象" },
  "sessionId": "会话ID",
  "user_id": "用户ID"
}

响应格式:
{
  "success": true,
  "data": { "执行结果" },
  "message": "结果描述文本",
  "sessionId": "会话ID"
}
```

#### 3. 服务列表接口
```javascript
GET /api/services?page=1&page_size=10

响应格式:
{
  "items": [
    {
      "id": "工具ID",
      "name": "工具名称",
      "description": "工具描述",
      "type": "工具类型",
      "provider": "提供者"
    }
  ],
  "current_page": 1,
  "total_pages": 10,
  "total_items": 100,
  "page_size": 10,
  "has_next": true,
  "has_prev": false
}
```

#### 4. 用户认证接口
```javascript
POST /auth/login
Content-Type: application/json

请求体:
{
  "username": "用户名",
  "password": "${REDACTED}"
}

响应格式:
{
  "success": true,
  "token": "REDACTED",
  "user": {
    "id": "用户ID",
    "username": "用户名",
    "role": "user|developer|admin"
  }
}
```

## 🛠️ 支持的工具类型

当前前端支持以下工具类型，后端需要实现相应逻辑：

### 基础工具
- **weather**: 天气查询
- **maps**: 地图导航  
- **reminder**: 提醒服务
- **music**: 音乐播放
- **message**: 消息服务

### 工具参数示例
```javascript
// 天气查询
{
  "tool_id": "weather",
  "params": {
    "city": "北京",
    "date": "今天"
  }
}

// 地图导航
{
  "tool_id": "maps", 
  "params": {
    "destination": "上海东方明珠",
    "mode": "driving"
  }
}

// 提醒服务
{
  "tool_id": "reminder",
  "params": {
    "event": "开会",
    "time": "明天下午3点"
  }
}
```

## 🔧 会话管理要求

### SessionID管理
- 每次新对话生成唯一sessionId
- sessionId需要在所有API响应中返回
- 支持会话状态跟踪和上下文记忆

### 用户管理
- 支持JWT token认证
- 用户角色管理：user、developer、admin
- 请求头格式：`Authorization: Bearer <token>`

## ⚠️ 错误处理标准

### 统一错误响应格式
```javascript
{
  "success": false,
  "error": {
    "code": "错误代码",
    "message": "用户友好的错误描述"
  }
}
```

### 常见错误代码
- `AUTH_FAILED`: 认证失败
- `INVALID_PARAM`: 参数错误
- `SESSION_NOT_FOUND`: 会话不存在
- `TOOL_NOT_FOUND`: 工具不存在
- `EXEC_FAIL`: 执行失败

## 🧪 测试建议

### 1. 先实现简单接口
建议按以下顺序实现：
1. `GET /api/services` - 返回工具列表
2. `POST /auth/login` - 用户登录
3. `POST /api/interpret` - 意图解析（可先返回固定响应）
4. `POST /api/v1/execute` - 工具执行

### 2. 逐步增加复杂性
- 先支持一个简单工具（如天气查询）
- 再扩展到其他工具类型
- 最后添加会话管理和上下文记忆

### 3. 调试支持
后端建议添加详细日志，便于调试：
- 记录所有API请求和响应
- 输出会话状态变化
- 记录工具执行过程

## 📞 技术支持

如果在对接过程中遇到问题：
1. 检查浏览器控制台的网络请求
2. 确认API响应格式是否符合规范
3. 验证CORS设置是否正确
4. 查看前端日志中的API配置信息

---

**准备好后端后，将 `.env` 中的 `REACT_APP_USE_MOCKS` 改为 `false` 即可！** 