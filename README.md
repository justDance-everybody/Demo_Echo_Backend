# Voice intent demo

面向手机浏览器的语音任务演示项目：用户表达目标，AI 负责获取能力、安排执行并反馈结果。此轮整理保留了 FastAPI 服务、React 界面及既有工具调用代码，作为下一轮升级的基础。

## 目标与当前状态

目标是让 AI 自主发现可用能力、选择工具、规划并组合执行，在失败时恢复并返回结果。工具可以来自 MCP、CLI 或 HTTP；链上操作只是可能的示例能力，不是固定任务白名单。使用偏好是未来需要沉淀的长期记忆目标。

## 当前代码状态

当前代码仍采用旧版意图分析、工具目录、MCP 调用、确认执行流程及语音界面。自主能力发现、偏好记忆和手机端完整语音流程尚待实现与验证；旧版确认步骤也待重新设计。

旧启动入口会调用数据库初始化并创建缺失的 ORM 表。不要将它直接用于保留数据库；本次整理没有连接数据库、修改 schema 或执行工具。

## 数据库兼容要求

后续新版必须兼容现有业务表及全部字段，所有旧数据都需要保留。该要求描述未来版本，不表示当前旧 ORM 已覆盖全部字段。`docs/database-contract.json` 根据本机数据库 dump 中的 `CREATE TABLE` 结构生成；dump 本身不进入仓库。当前 ORM 未映射的字段及两个独立 schema 的结构差异见该文件与 `docs/consolidation.md`。本次整理没有修改数据库或 schema。

旧 `sessions` 和 `logs` 可作为未来记忆能力的可利用历史记录；这不表示当前代码已从会话记录中实现偏好记忆。

## 目录

- `backend/`：FastAPI 服务源码及 Python 依赖清单。
- `MCP_Client/`：旧版 MCP 客户端。
- `MCP_server/web3-mcp/`：仓库内的 MCP server 源码。
- `frontend/`：唯一保留的 React 前端工程。
- `docs/product-goal.md`：目标与当前实现边界。
- `docs/consolidation.md`：源码基准、差异和整理记录。
- `docs/database-contract.json`：数据库表结构契约，不含业务行数据。
- `docs/legacy-migrations/`：只供审阅的旧迁移材料，不是运行指引。
- `docs/legacy-ci/`：main 分支历史 CI 自动化，仅作为文档保存，不会激活。
- `docs/auxiliary/proxy-tools/`：从旧开发环境保存的辅助代理源码，不是独立应用。
