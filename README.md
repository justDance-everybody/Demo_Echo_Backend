# Echo：一句话语音 Agent

用户说一句话，Echo 听懂、调用工具办事、用语音回答。写操作（记录、下单、转账这类）会先复述并等用户口头确认，确认由服务端强制执行。

这是 v2（2026-11），整体重写。v1 是 2025 年 4 月到 9 月做的原型，完整代码和提交历史保留在 tag [`v1.0-2025`](../../tree/v1.0-2025)。

## 设计目标

沿用 2025 年 PRD 的目标，指标按今天的做法改了口径：

| 目标 | v2 的做法 | 口径 |
|---|---|---|
| 一句话办成一件事 | 实时语音模型直接听、直接调工具、直接说 | 端到端成功率，用 `eval/` 测 |
| 快 | 语音进、语音出走一个模型，结果不再额外调一次 LLM 做摘要 | **首字延迟**：用户说完到听到第一个字，每轮自动记录 |
| 安全地做写操作 | 只读工具直接执行，写操作服务端强制确认 | 写操作未经用户开口确认的执行次数 = 0 |
| 第三方接入简单 | 接一个远程 MCP 服务 = 在 `tools.yaml` 里加几行 | 接入耗时 |

## 架构

```
浏览器（麦克风 / 扬声器）
   │  WebSocket：PCM 音频 + 少量 JSON
   ▼
Echo 服务（本仓库，约 1000 行 Python）
   ├─ 会话中继：音频双向转发、记录首字延迟和日志
   ├─ 工具执行 + 确认闸
   └─ 工具白名单 tools.yaml ── 内置工具 / 远程 MCP（HTTP）
   │  WebSocket（Realtime 协议）
   ▼
实时语音模型（默认 Qwen-Omni-Realtime，可切 OpenAI Realtime）
```

**为什么让服务端中继，而不是浏览器直连模型。** 模型密钥和工具执行都留在服务端，前端只是一根音频管子，绕不过确认。多一跳带来的延迟一般在几十毫秒，跟模型本身的延迟比可以忽略。中继也让我们能换国内或国外的模型，不用改前端。

## 和 v1 比，删掉了什么

| v1 | v2 | 为什么 |
|---|---|---|
| 浏览器 STT → LLM 选工具 → LLM 生成确认语 → LLM 判断“是/否” → 执行 → LLM 摘要 → 浏览器 TTS，一轮最多 4 次串行 LLM 调用 | 一个实时语音模型 | 延迟和代码量都主要耗在这条链上 |
| 每次请求都复述确认 | 只读的直接做，只有写操作才确认 | 查天气不该多问一句“您确认吗” |
| 前端能直接调 `/execute` 执行任意工具 | 前端没有执行接口；确认后执行的是登记时的参数 | v1 的确认在服务端可以被绕过 |
| 自己拉起、监控、清理 MCP 子进程（3000+ 行） | 只接远程 MCP（Streamable HTTP），不托管任何进程 | 托管陌生代码既不安全也不稳定 |
| 每次把全部工具塞给模型，prompt 里写死工具名 | `tools.yaml` 白名单，上限 40 个 | 最简单的发现机制，见下文 |
| MySQL + Alembic + JWT 账号体系 + 开发者门户 | 访问令牌 + 本地 JSONL 日志 | MVP 先不做多租户 |
| 自建 `mcp` 同名包 | 官方 `mcp` SDK | |

## 工具发现：一个白名单文件

`tools.yaml` 就是全部的发现机制：里面列出的工具，每次会话开始时全部交给模型，没列的模型看不到。

```yaml
builtin:
  get_weather: {}
  save_memo:
    confirm: true                       # 写操作：服务端强制确认
    summary: "要帮你记下这条备忘：{text}。确认吗？"

mcp_servers:
  - name: amap                          # 高德官方远程 MCP
    url: https://mcp.amap.com/mcp?key=${AMAP_KEY}
    prefix: amap_
    allow: [maps_weather, maps_text_search]   # 必须逐个放行
```

当前的实时语音模型在几十个工具以内选得准，所以先不做检索。超过 40 个时服务拒绝启动，到那时再加一层“先检索再选择”。

**当前阶段只开放我们自己验证过的工具**：内置工具，加上 `tools.yaml` 里人工审过的远程 MCP 服务。第三方开发者自助接入（提交 MCP 服务、审核、沙箱）放到后续版本。

## 确认闸怎么工作

1. 模型调用一个 `confirm: true` 的工具。服务端**不执行**，只登记一条待确认动作，把 `summary` 返回给模型。
2. 模型把 summary 念给用户，然后等用户回答。
3. 用户同意，模型调用 `confirm_action(action_id)`，服务端执行**登记时的参数**。
4. 服务端只在“登记之后用户又说过话”时接受确认，所以模型不能自问自答。待确认动作 120 秒过期。

## 运行

```bash
uv sync
cp .env.example .env        # 填模型地址和密钥
set -a; . ./.env; set +a
uv run echo-server          # 打开 http://127.0.0.1:8000
```

公网部署时必须设置 `ECHO_ACCESS_TOKEN`，用 `https://域名/?token=...` 打开页面。没设令牌时服务只接受本机连接。浏览器要在 HTTPS 下才能用麦克风（localhost 除外）。

## 测试

```bash
uv run pytest               # 不需要模型密钥；用 tests/fake_realtime.py 按协议模拟模型
uv run python eval/run.py   # 需要真模型：意图选择准确率 + 首字延迟
```

`pytest` 测的是协议、确认闸、工具和整条中继链路。真模型听不听得懂、快不快，只能用 `eval/` 对着真模型测。

## 当前状态（v2.0.0）

已验证（`pytest` + 浏览器冒烟）：中继链路、确认闸（包括模型自问自答被拦下）、令牌、内置工具、远程 MCP 白名单加载与调用、网页客户端的打字和麦克风两条路径。

还没对真模型跑过：`realtime.py` 按 Qwen-Omni-Realtime 和 OpenAI Realtime 的官方文档实现，测试用的是按协议写的假模型。接上真密钥后先跑 `eval/run.py`，如果某个字段不被接受，只需要改 `Dialect.session_update` 一处。

## 目录

```
echo_agent/
  server.py      HTTP / WebSocket 入口、访问令牌
  session.py     一次语音会话：中继、工具调度、首字延迟、日志
  realtime.py    实时语音模型协议适配（qwen / openai）
  confirm.py     工具执行 + 确认闸
  tools.py       tools.yaml 白名单加载
  mcp_remote.py  远程 MCP 客户端（官方 SDK）
  builtin.py     内置工具：时间、计算、天气（Open-Meteo，免密钥）、备忘
web/index.html   单文件网页客户端（麦克风采集、播放、打断、打字输入）
eval/            对真模型的意图与延迟评测
tests/           不依赖模型的自动化测试
```
