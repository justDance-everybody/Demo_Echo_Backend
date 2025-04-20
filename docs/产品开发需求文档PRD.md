# 产品需求文档（PRD）  
智能语音 **AI‑Agent** 开放平台  
_版本：v0.9 / 2025‑04‑19_

---

## 1. 立项背景

- **Web3 场景的交互痛点**  
  复杂钱包操作、链上查询与跨链服务，当前多靠 CLI / DApp，门槛高、易误操作。  
- **大模型与 MCP 标准的成熟**  
  MCP（Model Context Protocol）为 LLM 与外部服务之间建立了统一调用规范，使“语音→意图→服务”成为可能。  
- **目标**  
  - 让普通用户**只用语音**即可完成链上核心任务  
  - 让 AI‑Agent 开发者低门槛接入平台，迅速扩展能力  
  - 为管理员提供可视化监控与审核，确保安全与合规

---

## 2. 产品目标

| 维度       | 指标                                  | 发布窗口 |
|------------|---------------------------------------|----------|
| 易用性     | 普通用户 3 分钟内学会，90% 操作全程语音 | 核心版   |
| 开放性     | 接入 ≥ 5 个第三方 AI‑Agent 服务         | 核心版   |
| 安全性     | 关键操作 100% 二次语音确认；零私钥上传   | 核心版   |
| 可扩展性   | MCP 调用接口可动态装载                | 扩展版   |
| 稳定性     | 24h 内关键接口可用性 ≥ 99%            | 扩展版   |

---

## 3. 角色与核心价值

- **普通用户**：用最自然的语音完成链上转账、余额查询等，“零代码”操控链上资产  
- **AI‑Agent 开发者**：快速对接服务、查看调用数据，实现增收和扩大服务影响力  
- **管理员**：审核服务、监控风控、运维，确保平台安全合规可运营  

---

## 4. 版本策略

**Phase 1：核心版（高优先级）**  
- 语音转文字 → Mock‑LLM 意图解析 → 关键操作前复述 & 确认 → Mock‑MCP 调用 → 语音反馈  
- 开发者后台：Markdown 文档 + API 参数 → 连通性 & 安全校验 → 入库（pending_review）  
- 管理员后台：用户列表、服务审核、任务日志  

**Phase 2：扩展版（次优先级）**  
- 真正的 LLM 意图解析模块  
- MCP 网关/路由能力（动态注册/下线、负载均衡与熔断、监控 & 健康检查）  
- 任务监控仪表板 & 指标告警  
- 更多语音容错、自动回滚策略  

---

## 5. 功能需求与实施计划

### 5.1 主要流程（Phase 1）

```mermaid
sequenceDiagram
    participant U as 普通用户
    participant FE as 前端(React)
    participant BE as 后端(Node/Express)
    participant MLLM as Mock‑LLM
    participant MMCP as Mock‑MCP

    U->>FE: 点击录音按钮
    FE->>FE: Web Speech API 转写
    FE->>BE: POST /api/voice/upload
    BE->>MLLM: POST /api/llm/interpret (Mock)
    MLLM-->>BE: {intent:"转账",details:{recipient:"Alice",amount:"1 ETH"}}
    BE-->>FE: TTS 播报摘要并提示确认
    U->>FE: “确认”
    FE->>BE: POST /api/mcp/execute (confirmation=true,Mock)
    MMCP-->>BE: {txHash:"0x123..."}
    BE-->>FE: TTS 播报结果 + 页面提示

    5.2 普通用户前端（语音优先）
	•	录音按钮：长按/点击开始录音，松手或再次点击结束
	•	本地语音转文字：使用 Web Speech API，支持中英文
	•	关键操作复述：在检测到“转账”等高风险操作时，语音播报“您将转账 X ETH 给 Y，请说‘确认’或‘取消’”
	•	语音确认解析：识别“确认”或“取消”，超时默认取消（15 秒）
	•	TTS 结果播报：操作成功或失败后，通过 TTS 播报余额、交易哈希等摘要信息
	•	辅助界面：展示平台当前支持的服务列表、会话状态提示和错误弹窗（仅参考，不需点击）

## 5.3 用户基本信息配置管理

**目标：** 在平台中维护一套可扩展的用户配置项（如钱包地址、默认收款人、语言偏好等），用于自动补全 MCP 调用所需参数并支持未来随时新增配置。

**需求描述：**
1. 平台预定义常用配置键（`walletAddress`、`defaultRecipient`、`preferredChain`、`language` 等），并允许扩展任意新键。
2. 提供统一的 API 读取/更新用户配置，所有配置与用户身份绑定，且仅限存储非敏感信息。
3. 在意图解析后自动从用户配置中补全缺失参数；在“设置”界面展示并允许用户修改这些配置。
4. 配置结构须支持动态新增键值，无需变更表结构或重部署。


5.4 开发者后台（AI‑Agent 接入）
	•	登录与鉴权：邮箱+密码或 MetaMask 认证
	•	服务创建向导：填写服务名称、描述、分类
	•	文档上传与校验：上传符合模板的 Markdown 文档（字段：Service Name、Description、Endpoint、Method、Auth、Request Params、Response、Error Codes、Sample cURL），前端校验完整性
	•	接口连通性测试：根据 Sample cURL 自动发起测试请求，2xx 返回视为通过，否则提示错误详情
	•	基础安全扫描：检查域名/端口黑名单、强制 HTTPS、限制请求体大小
	•	统计与入库：通过测试后生成 agentId，存入 agents 表并标记为 pending_review，前端展示测试结果和状态



5.5 管理员后台
	•	用户与服务管理：支持搜索、冻结账号、重置密码
	•	服务审核：预览开发者提交的文档、测试 API 连通性，审核通过或驳回
	•	任务日志查询：按用户、时间、状态过滤并查看详细交互日志
	•	系统监控（Phase 2）：展示 QPS、错误率、资源占用等指标

5.5.1 后端核心模块（Phase 1）
	•	语音文本接收：POST /api/voice/upload，保存用户 ID 与文本
	•	Mock LLM 意图解析：POST /api/llm/interpret，返回模拟意图及参数
	•	Mock MCP 调用：POST /api/mcp/execute，模拟执行并返回 txHash
	•	任务与日志管理：记录流程日志，GET /api/tasks/:taskId 查询
	•	AI‑Agent 管理：POST /api/developer/submit，存储文档与配置，状态设为 pending_review

5.6 Phase 2 扩展（次优先级）
	•	动态路由：后端维护 MCP Server Registry，根据标签自动选择实例
	•	服务热插拔：支持动态注册和下线 MCP Server，实时生效
	•	负载与熔断：实现轮询或权重负载均衡，健康检查失败则熔断
	•	监控接口：GET /api/mcp/registry、GET /api/mcp/health（Prometheus exporter）

普通用户调用 /api/mcp/execute 不变，路由逻辑完全隐藏在后端。

5.7 非功能需求、里程碑、风险与验收

非功能需求
	•	性能：单接口 QPS ≥ 10；端到端时延 ≤ 3 s（Mock）
	•	安全：HTTPS / JWT / 角色权限；关键操作二次确认
	•	运维：Docker 容器化；日志按 taskId 关联
	•	测试：Jest + Supertest；E2E：Cypress（录音模拟）

关键里程碑
	•	M0 + 2 周：前端录音 & 语音转写原型（05‑03）
	•	M0 + 4 周：Mock 后端 API & 端到端 Demo（05‑17）
	•	M0 + 6 周：开发者后台 MVP & 服务审核流（05‑31）
	•	M0 + 8 周：核心版 Beta 发布（06‑14）

风险与对策
	•	语音识别准确率低 → 关键操作二次语音确认；错误提示重试
	•	LLM/MCP 选型延迟 → Phase 1 使用 Mock 接口，接口格式不变
	•	第三方 Agent 不稳定 → 健康检测 + 熔断；降级兜底
	•	Web Speech API 差异 → Polyfill + 浏览器支持提示

数据指标与验收
	•	录音→播报时延 ≤ 3 s（端到端计时）
	•	转账确认失败率 < 1 %（日志统计）
	•	开发者服务上线时长 < 30 min（提交→审核→可调用）
	•	P0 Bug 数 = 0（UAT）


6. API 接口与安全策略

6.1 接口统一封装

所有前后端交互均通过 /api 前缀的 RESTful 接口完成，请求与响应均使用 application/json。
响应格式统一为：
{ 
  "code": number,   // 0 表示成功，其它表示错误类型
  "data": any,      // 返回数据
  "message": string // 提示信息
}


6.2 鉴权与权限
	•	普通用户：登录后由后端签发短期 JWT Token，所有接口需在 Authorization: Bearer <token> 中携带，服务端验证并注入 userId。
	•	开发者/管理员：基于角色字段做细粒度授权，只有拥有对应权限的角色才能访问相应接口。

6.3 输入校验

使用 JSON Schema（如 AJV）对每个接口请求体做严格校验，拦截不符合格式或多余字段。对包含命令或脚本的字段（如 Sample cURL）进行内容扫描，防止注入攻击。

6.4 HTTPS 与 CORS
	•	强制全站 HTTPS，防止中间人攻击。
	•	仅允许白名单中的前端域名访问（配置 Access-Control-Allow-Origin）。

6.5 限流与防刷

对高频接口（如 /api/voice/upload、/api/mcp/execute）在网关或服务层采用令牌桶限流，防止恶意刷接口或 DDOS 攻击。针对关键操作（如转账）还可在业务层做速率限制。

6.6 日志与审计

对每次 API 调用记录请求参数（敏感字段脱敏）、调用者身份、时间戳与响应状态，并提供审计查询接口，便于后台查看与追踪。