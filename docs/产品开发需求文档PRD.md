# 全语音AI-Agent平台的产品需求文档（PRD）
**状态：** 草稿·已批准

---

## 1. 引言

**1.1 项目描述**  
“全语音AI-Agent平台”是一个端到端、以语音为唯一交互手段的智能代理系统。用户一句话即可调度海量“技能”（MCP 脚本、第三方 HTTP API 等），并通过实时的 TTS 语音反馈，获得即时、精准的服务体验。

**1.2 项目范围概览**  
- **MVP 范围**：单次调用单个功能的端到端闭环体验
- **后续迭代**：多工具编排、多轮确认、动态加载技能、并行/串联调用、日志监控、CI/CD、K8s 部署

**1.3 业务背景与驱动**  
- **市场需求**：自然语言交互普及，用户期望低门槛的智能服务
- **技术机遇**：大模型（LLM）与浏览器 STT/TTS 技术成熟
- **竞争优势**：零点击、语音即服务，适配车载、IoT、可穿戴场景

**1.4 目标用户／利益相关者**  
- **终端用户**：普通消费者，需“一句话”完成查询、控制等操作
- **第三方开发者**：提供 HTTP API 或 MCP 脚本，快速接入平台
- **内部团队**：前端、后端、测试、运维、产品经理

---

## 2. 目标与 KPI

**2.1 项目目标**  
1. 实现“一句话→解析→复述确认→执行→播报”的完整闭环  
2. 极简接口规范，第三方技能 30 分钟内接入

**2.2 可衡量成果**  
- **端到端调用成功率**：≥90%  
- **意图解析准确率（MVP）**：≥80%  
- **平均解析+执行时长**：≤500ms  

**2.3 成功标准**  
- 二次修改失败率 ≤5%  
- 前后端联调问题 ≤5 个/Sprint  
- 第三方接入时间 ≤30 分钟

**2.4 关键绩效指标（KPIs）**  
| KPI               | 目标值    |
|------------------|-----------|
| 端到端成功率     | ≥90%      |
| 平均解析时长     | ≤200ms    |
| 平均执行时长     | ≤300ms    |
| 二次修改失败率   | ≤5%       |
| 第三方接入时间   | ≤30min    |

---

## 3. 功能需求

### 3.1 前端需求  
- **技术框架**：React + Ant Design / Material-UI + Web Speech API  
- **核心模块**：录音 & STT；进度状态（识别/理解/执行/完成）；AI 复述 & 确认（TTS + 自动 STT 分类 CONFIRM/RETRY/CANCEL）；结果反馈；技能列表（列表/卡片/网格视图切换）；用户配置（contacts、wallets）

### 3.2 后端需求  
- **技术栈**：Python + FastAPI + Uvicorn  
- **NLU 引擎**：OpenAI Python SDK（GPT-3.5/4）  
- **核心接口**（JWT 鉴权，前缀 `/v1`）：
  - `POST /v1/api/interpret`：
    - **请求**：
      ```json
      {"sessionId":"<UUID>","userId":<int>,"text":"用户转写文本"}
      ```  
    - **响应 200**：
      ```json
      {"type":"confirm","action":"toolId","params":{...},"confirmText":"复述文本"}
      ```  
    - **错误**：4xx/5xx + `{error:{code,msg}}`
  - `POST /v1/api/execute`：
    - **请求**：
      ```json
      {"sessionId":"<UUID>","userId":<int>,"action":"toolId","params":{...}}
      ```  
    - **响应 200**：
      ```json
      {"success":true,"data":{...}}
      ```  
    - **错误**：
      ```json
      {"success":false,"error":{"code":"EXEC_FAIL","message":"..."}}
      ```
- **错误码**：INVALID_PARAM、UNKNOWN_ALIAS、EXEC_FAIL、SERVICE_UNAVAILABLE、TIMEOUT

### 3.3 数据库设计  
- **持久化方案**：MySQL + SQLAlchemy + Alembic
- **核心表 DDL**：
  ```sql
  CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) UNIQUE NOT NULL,
    contacts JSON,
    wallets JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE tools (
    tool_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    type ENUM('mcp','http') NOT NULL,
    endpoint JSON NOT NULL,
    request_schema JSON NOT NULL,
    response_schema JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE sessions (
    session_id CHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    status ENUM('interpreting','waiting_confirm','executing','done','error') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id CHAR(36) NOT NULL,
    step VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES sessions(session_id)
  );
  ```

---

## 4. 技术框架
| 层级      | 技术选型                                              |
|-----------|------------------------------------------------------|
| 前端      | React + AntD/MUI + Web Speech API                    |
| 后端      | Python + FastAPI + Uvicorn                           |
| NLU       | OpenAI SDK (Python)                                  |
| STT/TTS   | 浏览器 Web Speech API                                |
| 数据库    | MySQL + SQLAlchemy + Alembic                         |
| 会话管理  | JWT + Redis (可选)                                   |
| 部署运维  | Docker Compose → Kubernetes（后续）                  |

---

## 5. 交互流程

```mermaid
sequenceDiagram
  User->>Front: 一句话
  Front->>Speech API: 录音 & 转文本
  Front->>Back: POST /v1/api/interpret
  Back->>OpenAI: 解析 → {action,params,confirmText}
  Back-->>Front: 响应 confirmText 等
  Front->>TTS: 播报 confirmText
  Front->>Front: STT 监听用户语音 → rawText
  Front->>Front: classify intent (CONFIRM/RETRY/CANCEL)
  alt CONFIRM
    Front->>Back: POST /v1/api/execute
    Back->>AliasResolver: 解析别名
    Back->>ToolRegistry: 查元数据
    Back-->>MCP/HTTP: 调用服务
    Back-->>Front: 返回结果 data
    Front->>TTS: 播报结果
  else RETRY
    Front->>Back: POST /v1/api/interpret
  else CANCEL
    Front->>TTS: 播报“操作已取消”
  end
```

---

## 6. 已实现功能备注
- **MCP 客户端 (Python版)**：`connect(path)` & `call_tool(tool,params)`  
- **Frontend Hooks**：`useVoice()`, `useIntent()` 示例已给出  
- **会话管理**：基于 sessionId 的状态追踪

---
