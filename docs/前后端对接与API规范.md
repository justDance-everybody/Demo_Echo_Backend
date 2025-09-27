# 前后端对接与API规范

## 📋 概述

本文档为前端开发人员提供与Echo AI后端服务对接的完整指南，包含API规范、认证流程、权限控制和字段命名标准等关键信息。

**重要说明**: 
- 前端已实现语音转文字和语音播报功能，后端专注于文本的AI处理和工具调用
- 🌐 **访问方式**: 前端通过HTTPS访问公网域名，服务器负责SSL终止和请求转发

## 🚀 后端服务信息

### 服务地址

**重要**: 请根据开发环境选择正确的服务地址：

#### 本地开发环境
- **API基础路径**: `http://{YOUR_HOST}:{YOUR_PORT}/api/v1` (默认: `http://localhost:3000/api/v1`)
- **API文档**: `http://{YOUR_HOST}:{YOUR_PORT}/docs` (默认: `http://localhost:3000/docs`) (Swagger UI)
- **健康检查**: `http://{YOUR_HOST}:{YOUR_PORT}/health` (默认: `http://localhost:3000/health`)

**配置说明**:
- `{YOUR_HOST}`: 服务器主机地址，本地开发通常为 `localhost`，生产环境为实际域名或IP
- `{YOUR_PORT}`: 服务端口，默认为 `3000`，可通过环境变量 `SERVICE_PORT` 配置

### 服务状态确认

**本地开发环境**:
```bash
# 检查后端服务是否运行 (请替换为您的实际地址)
curl http://{YOUR_HOST}:{YOUR_PORT}/health
# 默认: curl http://localhost:3000/health
# 期望响应: {"status":"ok","timestamp":1753900335.8781202}

# 检查API文档是否可访问
curl -I http://{YOUR_HOST}:{YOUR_PORT}/docs
# 默认: curl -I http://localhost:3000/docs
# 期望响应: HTTP/1.1 200 OK

# 检查后端配置文件中的端口设置
cat backend/.env | grep PORT
# 或者
grep "PORT" backend/app/config.py

# 检查正在运行的服务端口
ps aux | grep uvicorn
lsof -i :3000  # 检查3000端口
```



## 🔐 认证流程

### 认证方式
使用 JWT (JSON Web Token) 进行身份认证。

### 1. 获取访问令牌

**⚠️ 重要**: 登录接口使用 `application/x-www-form-urlencoded` 格式，**不是JSON**

```javascript
// ✅ 正确的登录实现
async function login(username, password) {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);
  
  // 根据环境选择API基础URL
  const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? process.env.REACT_APP_API_BASE_URL || 'https://your-production-domain.com'
    : process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
  
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData
  });
  
  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('accessToken', data.access_token);
    return data;
  } else {
    throw new Error('登录失败');
  }
}
```

### 2. 使用访问令牌

```javascript
// 在后续API调用中携带token
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('accessToken');
  
  // 根据环境选择API基础URL
  const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? process.env.REACT_APP_API_BASE_URL || 'https://your-production-domain.com'
    : process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  };
  
  return fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
    ...defaultOptions,
    ...options
  });
}
```

## 🔒 权限控制机制

### 用户角色与权限

后端采用基于角色的访问控制(RBAC)，共有三种用户角色：

| 角色 | 权限范围 | 可访问接口 |
|------|----------|------------|
| **user** (普通用户) | 基础功能 | `/api/v1/intent/interpret`、`/api/v1/execute`、`/api/v1/tools` |
| **developer** (开发者) | 基础功能 + 开发者控制台 | 普通用户权限 + `/api/v1/dev/*` |
| **admin** (管理员) | 所有权限 | 所有接口访问权限 |

### 接口权限要求

| 接口路径 | 认证要求 | 角色要求 | 说明 |
|----------|----------|----------|------|
| `POST /api/v1/auth/token` | ❌ 无需认证 | - | 公开登录接口 |
| `POST /api/v1/auth/register` | ❌ 无需认证 | - | 公开注册接口 |
| `GET /health` | ❌ 无需认证 | - | 健康检查接口 |
| `GET /api/v1/auth/me` | ✅ 需要Token | user+ | 获取当前用户信息 |
| `POST /api/v1/intent/interpret` | ✅ 需要Token | user+ | 意图解析 |
| `POST /api/v1/intent/confirm` | ✅ 需要Token | user+ | 确认执行 |
| `POST /api/v1/execute` | ✅ 需要Token | user+ | 工具执行 |
| `GET /api/v1/tools` | ✅ 需要Token | user+ | 获取工具列表 |
| `GET /api/v1/dev/tools` | ✅ 需要Token | developer+ | 获取开发者工具列表 |
| `POST /api/v1/dev/tools` | ✅ 需要Token | developer+ | 创建新工具 |
| `PUT /api/v1/dev/tools/{id}` | ✅ 需要Token | developer+ | 更新工具 |
| `DELETE /api/v1/dev/tools/{id}` | ✅ 需要Token | developer+ | 删除工具 |
| `POST /api/v1/dev/tools/{id}/test` | ✅ 需要Token | developer+ | 测试工具 |
| `GET /api/v1/dev/apps` | ✅ 需要Token | developer+ | 获取应用列表 |
| `POST /api/v1/dev/apps` | ✅ 需要Token | developer+ | 创建新应用 |
| `PUT /api/v1/dev/apps/{id}` | ✅ 需要Token | developer+ | 更新应用 |
| `DELETE /api/v1/dev/apps/{id}` | ✅ 需要Token | developer+ | 删除应用 |
| `POST /api/v1/dev/apps/{id}/publish` | ✅ 需要Token | developer+ | 发布应用 |
| `GET /api/v1/mcp/status` | ✅ 需要Token | developer+ | MCP服务器状态 |

## 🧪 测试账号

后端已预置测试账号，账号信息从环境变量 `/home/devbox/project/backend/.env` 中加载：

| 角色 | 环境变量 | 默认值 | 访问权限 |
|------|----------|--------|----------|
| 普通用户 | `TEST_USER_USERNAME` / `TEST_USER_PASSWORD` | `testuser_5090` / `8lpcUY2BOt` | 基础AI功能 |
| 开发者 | `TEST_DEVELOPER_USERNAME` / `TEST_DEVELOPER_PASSWORD` | `devuser_5090` / `mryuWTGdMk` | 基础功能 + 开发者控制台 |
| 管理员 | `TEST_ADMIN_USERNAME` / `TEST_ADMIN_PASSWORD` | `adminuser_5090` / `SAKMRtxCjT` | 所有功能 |

**注意**: 实际使用的账号密码以 `.env` 文件中配置的环境变量为准，上述默认值仅作为备用。

## 📋 API字段命名规范

### 统一使用snake_case

**✅ 正确示例：**
```json
{
  "tool_calls": [
    {
      "tool_id": "maps_weather",
      "parameters": {
        "city": "深圳"
      }
    }
  ],
  "session_id": "uuid-string"
}
```

**❌ 错误示例：**
```json
{
  "toolCalls": [
    {
      "toolId": "maps_weather",
      "parameters": {
        "city": "深圳"
      }
    }
  ],
  "sessionId": "uuid-string"
}
```

### Pydantic Schema配置原则

**✅ 推荐配置：**
```python
class APIRequest(BaseModel):
    tool_id: str = Field(..., description="工具ID")
    session_id: Optional[str] = Field(None, description="会话ID")
    
    class Config:
        populate_by_name = True
        allow_population_by_field_name = True
        extra = "ignore"
```

**❌ 避免不必要的alias：**
```python
# 除非有特殊需求，否则避免使用alias
tool_id: str = Field(..., alias="toolId", description="工具ID")
```

## 🔌 核心API接口

### 完整接口列表

基于OpenAPI规范 (`http://{YOUR_HOST}:{YOUR_PORT}/docs`，默认: `http://localhost:3000/docs`)，系统提供以下接口：

#### 🔐 认证接口
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/token` - 用户登录 (表单格式)
- `POST /api/v1/auth/login` - 用户登录 (兼容性)
- `GET /api/v1/auth/me` - 获取当前用户信息

#### 🧠 意图处理接口
- `POST /api/v1/intent/interpret` - 意图识别和解析
- `POST /api/v1/intent/confirm` - 确认执行工具调用

#### 🛠️ 工具执行接口
- `POST /api/v1/execute` - 执行指定工具
- `GET /api/v1/tools` - 获取可用工具列表

#### 👨‍💻 开发者接口 (需要developer+权限)
- `GET/POST /api/v1/dev/tools` - 工具管理
- `GET/PUT/DELETE /api/v1/dev/tools/{tool_id}` - 工具操作
- `POST /api/v1/dev/tools/{tool_id}/test` - 工具测试
- `POST /api/v1/dev/upload` - 工具包上传
- `POST /api/v1/dev/upload/validate` - 工具包验证
- `POST /api/v1/dev/tools/test/batch` - 批量测试工具

#### 🖥️ MCP服务器管理接口
- `GET /api/v1/mcp/health` - MCP服务器健康状态 (无需认证)
- `GET /api/v1/mcp/status` - 所有MCP服务器状态
- `GET /api/v1/mcp/status/{server_name}` - 指定服务器状态
- `POST /api/v1/mcp/restart/{server_name}` - 重启服务器
- `POST /api/v1/mcp/start/{server_name}` - 启动服务器
- `POST /api/v1/mcp/stop/{server_name}` - 停止服务器
- `POST /api/v1/mcp/cleanup/orphaned` - 清理遗留进程

### 关键接口使用示例

#### 1. 用户登录
```javascript
// 注意：使用表单格式，不是JSON
const formData = new URLSearchParams();
formData.append('username', 'testuser_5090');
formData.append('password', '8lpcUY2BOt');

const response = await fetch('/api/v1/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: formData
});
```

#### 2. 意图识别
```javascript
// POST /api/v1/intent/interpret
const response = await apiCall('/intent/interpret', {
  method: 'POST',
  body: JSON.stringify({
    query: "帮我翻译hello world",
    session_id: generateUUID(),
    user_id: 13
  })
});
```

#### 3. 工具执行
```javascript
// POST /api/v1/execute
const response = await apiCall('/execute', {
  method: 'POST',
  body: JSON.stringify({
    session_id: "uuid-string",
    user_id: 13,
    tool_id: "translate_text",
    params: { text: "hello", target_lang: "zh" }
  })
});
```

### 4. 开发者接口使用示例

```javascript
// 获取开发者工具列表
const tools = await apiCall('/dev/tools');

// 创建新工具
const newTool = await apiCall('/dev/tools', {
  method: 'POST',
  body: JSON.stringify({
    tool_id: 'my_tool',
    name: '我的工具',
    description: '工具描述',
    // ... 其他字段
  })
});

// 测试工具
const testResult = await apiCall(`/dev/tools/${tool_id}/test`, {
  method: 'POST',
  body: JSON.stringify({ test_params: {} })
});

// 获取MCP服务器状态
const mcpStatus = await apiCall('/mcp/status');
```

## ⚙️ 环境配置

### 前端 `.env` 配置

**本地开发环境** (`.env.development`):
```bash
# 本地开发环境配置 (请根据实际情况修改)
REACT_APP_API_BASE_URL=http://{YOUR_HOST}:{YOUR_PORT}  # 默认: http://localhost:3000
REACT_APP_API_PREFIX=/api/v1
NODE_ENV=development
```

**生产环境** (`.env.production`):
```bash
# 生产环境配置
REACT_APP_API_BASE_URL=https://your-production-domain.com
REACT_APP_API_PREFIX=/api/v1
NODE_ENV=production
```

**通用配置** (`.env`):
```bash
# 默认配置，可被环境特定配置覆盖
REACT_APP_API_BASE_URL=http://localhost:3000  # 请根据实际部署情况修改
REACT_APP_API_PREFIX=/api/v1
```

### API客户端封装建议

```javascript
// services/apiClient.js
class ApiClient {
  constructor() {
    // 优先使用环境变量，请根据实际部署情况配置
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
    this.apiPrefix = process.env.REACT_APP_API_PREFIX || '/api/v1';
  }
  
  // 登录
  async login(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await fetch(`${this.baseURL}${this.apiPrefix}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });
    
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  }
  
  // 通用API调用
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('accessToken');
    const url = `${this.baseURL}${this.apiPrefix}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };
    
    const response = await fetch(url, config);
    
    if (response.status === 401) {
      localStorage.removeItem('accessToken');
      throw new Error('Unauthorized - Token expired or invalid');
    }
    
    if (response.status === 403) {
      throw new Error('Forbidden - Insufficient permissions');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Error: ${response.status} - ${errorData.detail || 'Unknown error'}`);
    }
    
    return response.json();
  }
  
  // 意图解析
  async interpret(query, session_id = null, user_id = 13) {
    return this.request('/intent/interpret', {
      method: 'POST',
      body: JSON.stringify({ query, session_id, user_id })
    });
  }
  
  // 确认执行
  async confirmExecution(session_id, user_input) {
    return this.request('/intent/confirm', {
      method: 'POST',
      body: JSON.stringify({ session_id, user_input })
    });
  }
  
  // 工具执行
  async execute(session_id, tool_id, params, user_id = 13) {
    return this.request('/execute', {
      method: 'POST',
      body: JSON.stringify({ session_id, user_id, tool_id, params })
    });
  }
  
  // 获取工具列表
  async getTools() {
    return this.request('/tools');
  }
}

export default new ApiClient();
```

## 🔄 完整的AI交互流程

```javascript
// 完整的AI交互示例（语音转文字由前端处理）
async function handleUserTextInput(userText, sessionId = null, userId = 13) {
  try {
    // 1. 解析用户意图
    const interpretation = await apiClient.interpret(userText, sessionId, userId);
    console.log('意图解析结果:', interpretation);
    
    // 2. 根据响应类型处理
    if (interpretation.type === 'tool_call' && interpretation.tool_calls) {
      // 需要工具调用，显示确认文本给用户
      const confirmText = interpretation.confirm_text || interpretation.content;
      console.log('AI理解:', confirmText);
      
      // 3. 获取用户确认输入
      const userConfirmation = await getUserConfirmation(); // 如"是"、"确认"、"y"等
      
      // 4. 发送确认请求
      const confirmResult = await apiClient.confirmExecution(
        interpretation.session_id,
        userConfirmation
      );
      
      // 5. 返回执行结果
      return {
        success: confirmResult.success,
        content: confirmResult.content,
        speechText: confirmResult.content // 用于语音播报
      };
    } else {
      // 直接响应，无需工具调用
      return {
        success: true,
        content: interpretation.content,
        speechText: interpretation.content
      };
    }
  } catch (error) {
    console.error('AI交互失败:', error);
    return {
      success: false,
      error: error.message,
      speechText: '抱歉，处理您的请求时出现了问题'
    };
  }
}

// 获取用户确认输入的辅助函数
async function getUserConfirmation() {
  // 这里可以是弹窗、输入框或语音识别的结果
  // 返回用户的自然语言确认输入
  return prompt('请确认是否执行？(输入"是"或"y"确认)');
}
```

## ⚠️ 服务稳定性说明

### 本地开发环境稳定性

在本地开发过程中，可能会遇到以下间歇性问题：

**常见现象**:
- API调用偶尔返回连接错误
- 健康检查接口响应缓慢
- 服务重启后需要等待一段时间才能正常响应

**根本原因**:
1. **数据库连接池初始化**: 服务启动时需要建立数据库连接池
2. **MCP服务器启动**: 需要等待所有MCP服务器完全启动
3. **依赖服务检查**: 系统会检查各种依赖服务的可用性
4. **缓存预热**: 某些缓存数据需要在首次请求时加载

**最佳实践**:
- 服务启动后等待30-60秒再进行API测试
- 使用健康检查接口确认服务完全就绪: `curl http://{YOUR_HOST}:{YOUR_PORT}/health` (默认: `curl http://localhost:3000/health`)
- 避免在服务启动过程中频繁重启
- 如遇到问题，先检查后端日志: `tail -f backend/logs/api.log`

**环境配置一致性**:
- 确保使用正确的环境配置（本地开发 vs 生产环境）
- 文档已更新以明确区分不同环境的配置
- 避免混用不同环境的API地址

## 🚨 常见问题与解决方案

### 1. 认证与权限错误

**401 Unauthorized**:
- 确认使用form-data格式而非JSON登录
- 检查用户名和密码是否正确
- 确认token是否正确携带在Authorization头中
- Token可能已过期，需要重新登录

**403 Forbidden**:
- 用户角色权限不足
- 例如：普通user尝试访问`/api/v1/dev/tools`需要developer权限
- 检查当前用户角色是否满足接口要求

### 2. 错误处理最佳实践

```javascript
// 完善的错误处理
async function safeApiCall(apiFunction) {
  try {
    return await apiFunction();
  } catch (error) {
    if (error.message.includes('401')) {
      // Token过期，重新登录
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    } else if (error.message.includes('403')) {
      // 权限不足，提示用户
      alert('权限不足，请联系管理员或使用具有相应权限的账号');
    } else {
      console.error('API调用失败:', error);
      throw error;
    }
  }
}

// 角色权限检查
function checkPermission(userRole, requiredRole) {
  const roleHierarchy = { 'user': 1, 'developer': 2, 'admin': 3 };
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
```

### 3. 开发调试

```javascript
// 开发环境下启用详细日志
if (process.env.NODE_ENV === 'development') {
  // 拦截所有fetch请求进行日志记录
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('API Request:', args);
    return originalFetch.apply(this, args)
      .then(response => {
        console.log('API Response:', response);
        return response;
      });
  };
}
```

## 📱 前端语音功能对接说明

后端提供的 `result.tts` 字段是专门为前端语音播报功能准备的优化文本：

```javascript
// 后端返回的execute结果中包含tts字段
const result = await apiClient.execute(toolId, params, sessionId, userId);
// result.tts 包含适合语音播报的简洁文本

// 将tts文本传递给前端已实现的语音播报功能
// 具体调用方式请参考前端开发文档中的语音模块
```

**重要说明**：
- 🎤 **语音输入**: 由前端Web Speech API处理，转换为文本后发送给后端
- 🔊 **语音输出**: 后端提供优化的`tts`文本，由前端语音合成功能播报
- 🤖 **AI处理**: 后端专注于文本的意图识别、工具调用和结果处理

## 🔧 开发者工具

### 快速测试API和权限

**本地开发环境测试**:



### 浏览器开发者工具
1. 打开Network选项卡监控API请求
2. 检查Request Headers中是否正确携带Authorization
3. 查看Response确认数据格式

## 📋 质量保证与最佳实践

### 1. 命名规范
- ✅ 统一使用 `snake_case` 命名
- ✅ 避免不必要的字段别名
- ✅ 保持前后端字段名一致

### 2. 开发流程
- ✅ Schema定义优先，文档跟随
- ✅ 代码审查包含字段命名检查
- ✅ 集成测试验证字段名一致性

### 3. 文档维护
- ✅ API变更时同步更新文档
- ✅ 示例代码基于实际测试结果
- ✅ 定期验证文档与代码一致性

### 4. 测试验证

```python
# 示例测试用例
async def test_intent_parsing_field_names():
    """测试意图解析接口字段名"""
    response = await client.post("/api/v1/intent/interpret", json={
        "query": "深圳天气",
        "session_id": "test-session",
        "user_id": 1
    })
    
    data = response.json()
    # 验证返回字段使用正确的命名
    assert "tool_calls" in data
    if data["tool_calls"]:
        assert "tool_id" in data["tool_calls"][0]
```

## 📞 支持与反馈

- **后端日志**: 检查 `backend/logs/api.log`
- **问题反馈**: 请提供具体的错误信息和请求/响应日志
- **架构说明**: 服务器负责SSL终止和端口映射，后端服务专注于业务逻辑处理

---

> 文档更新时间: 2025-01-14  
> 适用后端版本: v0.1.0  
> 文档负责人: 后端团队
