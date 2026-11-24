<div align="center">

<p>
  <a href="README.md">English</a> &nbsp;|&nbsp; <b>简体中文</b>
</p>

<img src="docs/media/echo-hero.png" alt="Echo：让声音成为真实软件的执行界面" width="100%" />

<br />

<p>
  <img src="https://img.shields.io/badge/Realtime-Qwen--Omni%20%7C%20OpenAI-0F172A?style=for-the-badge&labelColor=0D9488" alt="Realtime" />
  <img src="https://img.shields.io/badge/MCP-Streamable%20HTTP-0F172A?style=for-the-badge&labelColor=0284C7" alt="MCP" />
  <img src="https://img.shields.io/badge/Python-3.11%2B-0F172A?style=for-the-badge&labelColor=334155" alt="Python 3.11+" />
  <img src="https://img.shields.io/badge/License-MIT-0F172A?style=for-the-badge&labelColor=334155" alt="MIT License" />
</p>

<h3>四十年来人靠 App 点击用软件；语音 AI 会聊天了，却没人敢给它写权限。</h3>

<p>
  <a href="docs/media/echo-demo.mp4?raw=true"><b>▶ 72 秒带声音实录</b></a>
  &nbsp;·&nbsp;
  <a href="#paradigm"><b>核心范式</b></a>
  &nbsp;·&nbsp;
  <a href="#mcp"><b>接入 MCP</b></a>
  &nbsp;·&nbsp;
  <a href="#quickstart"><b>60 秒运行</b></a>
  &nbsp;·&nbsp;
  <a href="docs/engineering-notes.md"><b>工程笔记</b></a>
</p>

<br />

<a href="docs/media/echo-demo.mp4?raw=true">
  <img src="docs/media/echo-demo.gif" alt="Echo 实录：查询直出、写操作口头确认、随时打断" width="100%" />
</a>

<sub>真 Chrome + <code>qwen3.8-omni-flash-realtime</code> 一镜到底实录（2 倍速无声预览） · <a href="docs/media/echo-demo.mp4?raw=true"><b>点击下载 72 秒完整带声音视频（3.9 MB）</b></a></sub>

</div>

<br />

<table>
<tr>
<td width="33%" valign="top">
<b>⚡ 开口即执行，随时打断</b><br /><br />
查询类请求说完即执行、直接播报；播报途中插话约 <b>1 s</b> 停下转向新问题。任何 Streamable HTTP 远程 MCP 服务，几行配置即可用嘴调度。
</td>
<td width="33%" valign="top">
<b>🔒 写操作口头即签名</b><br /><br />
下单、日程、记录等写操作先在服务端冻结参数、由模型复述；<b>用户再次开口后</b>才按原参数放行，模型无法自问自答或篡改参数。
</td>
<td width="34%" valign="top">
<b>🧬 2025 启程，千行收敛</b><br /><br />
始于 2025 年 4 月（<a href="../../tree/v1.0-2025"><code>v1.0-2025</code></a>），2026 重写进不到 <b>1,000 行 Python</b>。真模型实测首字延迟 <b>1.51 s</b>、任务办成 <b>39/39</b>、未确认写执行 <b>0 次</b>。
</td>
</tr>
</table>

---

<a id="paradigm"></a>
## 核心范式：概率智能 × 确定性授权

| 交互方式 | 怎么操作 | 响应与打断 | 写操作的安全边界 | 接新服务 |
|---|---|---|---|---|
| **App / 图形界面** | 找入口、点菜单、填表单 | 人逐步点击 | 弹窗按钮确认 | 每个服务各做一套前端 |
| **串联语音（识别 → LLM → 合成）** | 语音输入，多次串行模型调用 | 延迟逐级叠加，难以打断 | 靠提示词约束 | 胶水代码或本地托管进程 |
| **前端直连实时语音模型** | 实时语音 | 秒级响应 | 工具执行跟着模型走，听错或幻觉就可能误操作 | 和单一模型接口绑定 |
| **Echo** | **开口即执行，随时打断** | **首字中位 1.51 s，约 1 s 停播** | **服务端锁参 + 发言轮次校验，模型无法自问自答** | **在 `tools.yaml` 写几行接入远程 MCP** |

![图 1：(a) 系统结构 (b) 确认闸时序 (c) 实测首字延迟和任务完成率](docs/media/echo-figure.png)

浏览器只传 PCM16 音频，不持有密钥、没有执行接口；写操作登记为参数快照，用户发言轮次增加且未超过 120 s 才执行（`echo_agent/confirm.py`）；能力边界由 `tools.yaml` 白名单声明，单会话最多 40 个工具。用户说的是同意还是拒绝由模型理解，边界见[工程笔记](docs/engineering-notes.md#确认闸的边界)。

---

<a id="mcp"></a>
## 把 MCP 服务变成语音能力

内置 5 个免密钥工具（时间、计算、Open-Meteo 天气、备忘录）用来零依赖跑通全流程；真实业务在 `tools.yaml` 里接远程 MCP：

```yaml
mcp_servers:
  - name: amap                                  # 只读：高德官方远程 MCP
    url: https://mcp.amap.com/mcp?key=${AMAP_KEY}
    prefix: amap_
    allow: [maps_weather, maps_text_search]
  - name: calendar                              # 写操作示意配置，非内置服务
    url: https://mcp.example.com/mcp
    headers: {Authorization: "Bearer ${CALENDAR_TOKEN}"}
    allow: [list_events, create_event]
    confirm: [create_event]                     # 走服务端确认闸
    summaries: {create_event: "要在 {start} 建一个日程：{title}。确认吗？"}
```

`allow` 必须逐个放行；缺 `allow`、工具不存在、环境变量未设置或连不上时，该服务不加载、只记日志。不托管任何本地进程，每次调用新开连接，不保存 MCP 会话状态（`echo_agent/mcp_remote.py`）。

---

<a id="quickstart"></a>
## 运行

```bash
uv sync
cp .env.example .env          # 填 ECHO_PROVIDER_URL 和 ECHO_PROVIDER_API_KEY
set -a; . ./.env; set +a
uv run echo-server            # 打开 http://127.0.0.1:8000
```

公网部署必须设置 `ECHO_ACCESS_TOKEN`，并走 HTTPS。验证：`uv run pytest`（无需密钥）、`uv run python eval/run.py`（真模型评测）、`./demo/record.sh`（重录演示）。

---

## 实测与一线规律

2026-11-24，`qwen3.8-omni-flash-realtime`，13 条用例 × 3 轮文字输入：任务办成 **39/39**，第一步选对工具 **34/39**，首字延迟中位数 **1.51 s**、p90 **3.35 s**。接真语音时得到的三条规律：

1. 百炼 `semantic_vad` 会把“好的”当附和吞掉，确认卡死；Qwen3.8 改用 `semantic_vad_ec`。
2. 打断后在途旧音频仍会续播；服务端在 `speech_started` 后丢弃音频，直到新一轮 `response_created`。
3. 相对日期别让模型推算：天气工具固定返回 7 天并标星期几。

评测明细、真语音记录和录屏方法见 [`docs/engineering-notes.md`](docs/engineering-notes.md)。

---

## 下一步

- **交易级授权**：在轮次校验之上加服务端同意判定、金额上限、收款方白名单，承接支付与链上转账。
- **大规模工具路由**：突破 40 个工具的静态白名单，按意图动态召回，同时守住实时延迟。
- **更多终端**：客户端协议只有 WebSocket + PCM16 + 少量 JSON 事件，可延伸到车载、可穿戴和硬件终端。

<details>
<summary><b>从 2025 v1 到 2026 v2：为什么重写反而缩到不到 1,000 行</b></summary>

Echo 在 2025 年 4 月启动 v1，完整代码和提交历史保留在 tag [`v1.0-2025`](../../tree/v1.0-2025)。2026 年重写时，实时语音模型已能在一次会话里同时听、调用函数、说话，远程 MCP 也有了官方 SDK 和现成服务，v2 据此做减法。

| 2025 v1 | 2026 v2 |
|---|---|
| 浏览器识别 → LLM 选工具 → LLM 生成确认语 → LLM 判断是否 → 执行 → LLM 摘要 → 浏览器合成，一轮最多 4 次串行 LLM 调用 | 一个实时语音模型直接听、调工具、说 |
| 每个请求都复述确认；前端能直接调 `/execute`，确认可以被绕过 | 只读直接执行，写操作服务端锁参确认；前端没有执行接口 |
| 自己拉起、监控、清理 MCP 子进程（3,000 多行） | 只接远程 Streamable HTTP MCP，不托管进程 |
| 每次把全部工具塞给模型，prompt 里写死工具名 | `tools.yaml` 白名单，上限 40 个 |
| MySQL + Alembic + JWT 账号体系 + 开发者门户 | 访问令牌 + 本地 JSONL 日志 |

</details>

<details>
<summary><b>目录</b></summary>

```
echo_agent/      server.py 入口与令牌 · session.py 会话中继与打断 · realtime.py 模型协议适配
                 confirm.py 确认闸 · tools.py 白名单 · mcp_remote.py 远程 MCP · builtin.py 内置工具
web/index.html   单文件网页客户端（麦克风、播放、打断、服务端执行记录面板）
tools.yaml       工具白名单
eval/            真模型评测        demo/   一条命令重录演示视频
docs/            engineering-notes.md 与 media/（首屏横幅、分享图、视频、动图、图 1）
tests/           不依赖模型的自动化测试
```

</details>
