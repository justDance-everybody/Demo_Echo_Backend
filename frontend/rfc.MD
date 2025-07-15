# RFC-0001 Echo AI Voice Assistant – Front-End Repository Overview  
> Status: Draft  
> Author: \<your GitHub ID\>  
> Created: 2025-05-20  
> Discussion Ends: 2025-05-27

## 1  Summary
This RFC describes the purpose, scope, tech stack, directory layout, and quality bars of the **Echo AI Voice Assistant Front-End repository** (“this repo”), giving contributors a quick, unified entry point.

## 2  Motivation
The monorepo is becoming heavy; front-end code now has its own CI/CD cadence, UI/UX rules, and testing needs. Splitting it brings:  
1. Faster setup and build cycles.  
2. Dedicated issues/PRs and release rhythm focused on UI.  
3. Clear directory boundaries for components, pages, hooks, and mocks.

## 3  Goals
1. A standalone React 18 + Vite workspace bootable within 30 minutes.  
2. **No business constants hard-coded**; API contracts stay in sync with back-end.  
3. Out-of-the-box MSW, Jest + RTL, Cypress + cypress-axe for full testability.  
4. Design-token-driven theme system with live dark/light switch and custom primary color.  
5. “AI-assisted dev loop” via `auto-dev.sh`, keeping new features ≥ 90 % test-covered.

## 4  Non-Goals
- Shipping back-end code or infra manifests.  
- Introducing heavyweight state managers (Redux, Zustand) for the MVP.

## 5  Tech Stack
| Layer          | Choice                          | Why |
|----------------|---------------------------------|-----|
| Build          | Vite 5-beta                     | Fast HMR, multi-entry ready |
| UI Library     | Ant Design v5 + AntD Mobile     | Unified desktop/mobile design language |
| Router         | React Router v6                | Nested routes, lazy loading |
| Voice APIs     | Web Speech API                 | Native STT / TTS |
| Unit Tests     | Jest 29 + RTL                  | Fast watch mode |
| E2E + a11y     | Cypress 12 + cypress-axe       | Accessibility enforced |
| Mocks          | MSW                             | Zero-back-end startup |
| Dev Loop       | `auto-dev.sh`                  | AI generate-test-fix loop |

## 6  Proposed Directory Layout
```text
.
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI
│   ├── hooks/              # useVoice, useIntent…
│   ├── pages/              # Route-level pages
│   ├── contexts/           # AuthContext, ThemeContext…
│   ├── services/           # apiClient, errorService
│   ├── mocks/              # MSW handlers
│   ├── styles/             # tokens.css, global styles
│   └── index.js
├── cypress/                # E2E tests
├── scripts/                # auto-dev.sh, etc.
└── docs/
    └── rfcs/               # Future RFCs (including this one)
```

## 7  Key Modules
1. **AuthPage** – Login/Register dual mode with JWT in localStorage.  
2. **ThemeProvider & ThemeSettings** – Dark/light mode and runtime design-token edits.  
3. **VoiceRecorder / VoiceDialog** – Web Speech API wrapper with timeout and confirm flow.  
4. **ServiceList / ServiceCard** – Skill catalogue, list/grid toggle, search filter.  
5. **SessionContext + ProgressBar** – “Recognizing → Understanding → Executing → Done” stages.  
6. **ErrorBoundary + ToastSystem** – Global error capture and friendly notifications.  
7. **auto-dev loop** – Cursor CLI + Cypress for generate-test-repair automation.

## 8  API Contract Snapshot
| Method | Route                | Purpose          |
|--------|----------------------|------------------|
| POST   | `/auth/login`        | Sign in, returns JWT |
| POST   | `/auth/register`     | Create account   |
| GET    | `/v1/api/tools`      | List skills      |
| POST   | `/v1/api/interpret`  | LLM intent parse |
| POST   | `/v1/api/execute`    | Execute confirmed action |

(Full details in main PRD §3.2; consumed via `services/apiClient.js`.)

## 9  Quality Baseline
- **Unit test pass rate ≥ 90 %** (CI blocking).  
- E2E covers login, theme switch, skill execution; axe a11y must pass.  
- Lighthouse: Performance ≥ 85, Accessibility ≥ 90 (mobile 4G).  
- ESLint + Prettier + CommitLint enforced.  
- Clean-code rules: no magic numbers, functions ≤ 60 lines.

## 10  Milestones
| Mx | Deliverable                                   | Owner |
|----|-----------------------------------------------|-------|
| M1 | Repo split, `npm run dev` + MSW mock works    | @you  |
| M2 | Migrate existing pages/components, tests green| |
| M3 | `auto-dev.sh` loop passes E2E                 | |
| M4 | Lighthouse + GitHub Actions CI integrated     | |
| M5 | Publish `v0.1.0` for team review              | |

## 11  Open Questions
- CI target: GitHub Actions vs. Vercel / Cloudflare Pages?  
- SSR needs? (Current CSR; maybe Next.js later.)  
- PWA/offline priority?  
- Browser support baseline (Safari 14.1 for Speech API?).

## 12  Conclusion
This RFC establishes boundaries, goals, and tech guidelines for the front-end repo, aiming to streamline collaboration and accelerate MVP iterations.  
Comments welcome; if no major objections within one week, status will change to **Accepted**.

---

### Contribution Process
1. Fork → Pull Request (`RFC-0001:` prefix in title).  
2. Quote line numbers in comments for precise discussion.  
3. After acceptance, maintainers merge and mark as **Accepted**.

---


# RFC-0001 Echo AI 语音助手前端子仓库概览  
> 状态：Draft（草案）  
> 作者：\<填写 GitHub ID\>  
> 创建日期：2025-05-20  
> 讨论截止：2025-05-27

## 1. 摘要
本 RFC 旨在说明「Echo AI 语音助手」前端子仓库（以下简称「本仓库」）的定位、技术选型、目录结构、核心模块与约束，为后续贡献者提供快速、统一的认知入口。

## 2. 背景与动机
主仓库包含“全栈”代码；前端代码模块日益膨胀，且对 CI/CD、自动化测试及 UI/UX 规范有独立演进需求。  
拆分前端子仓库可带来：
1. 更短的安装与构建链路，缩减新同学的上手时间。  
2. 独立的发布节奏、Issue 与 PR 流，对 UI 迭代更友好。  
3. 更清晰的目录组织，便于按领域（页面 / 组件 / hooks / mocks）分层维护。

## 3. 目标
1. 提供一个独立的 React 18 + Vite 工作区，30 分钟内可拉起开发环境。  
2. 保持与主后端 API 合约同步 —— **绝不在前端层硬编码业务常量**。  
3. 默认集成 MSW、Jest + RTL、Cypress + cypress-axe，实现端到端的可测试性。  
4. 遵循设计变量（Design Tokens）与主题系统规范，可在运行时切换深浅色并自定义主色。  
5. 推行「脚本驱动的 AI-辅助开发流程」（`auto-dev.sh` 闭环），保证新特性 ≥ 90% 自动化覆盖率。

## 4. 非目标
- 不在仓库内包含后端代码或脚本。  
- 不承载 Docker / K8s 部署文件。  
- 不引入与 MVP 无关的重量级状态管理（如 Redux）；仅限 Context + Hooks。

## 5. 技术栈概览
| 层级         | 选型                         | 说明 |
|--------------|------------------------------|------|
| 构建工具     | Vite 5-beta                  | 极快热更新，多入口配置友好 |
| 组件库       | Ant Design v5 + AntD Mobile | 桌面 / 移动双栈统一设计语言 |
| 路由         | React Router v6             | 支持懒加载与嵌套路由 |
| 语音能力     | Web Speech API              | 浏览器原生 STT / TTS |
| 单元测试     | Jest 29 + React Testing Library | `--watch` 模式极快 |
| E2E + a11y   | Cypress 12 + cypress-axe     | 无障碍内建 |
| Mock         | MSW                          | 网络拦截，零后端启动 |
| 自动脚本     | `auto-dev.sh`               | AI 生成-测试-修复循环 |

## 6. 目录结构（草案）
```text
.
├── public/                  # 静态资源
├── src/
│   ├── components/          # 通用 UI（Button、Toast…）
│   ├── hooks/               # useVoice / useIntent …
│   ├── pages/               # 路由级页面（Auth、Settings、Services…）
│   ├── contexts/            # AuthContext / ThemeContext …
│   ├── services/            # apiClient & errorService
│   ├── mocks/               # MSW handlers
│   ├── styles/              # tokens.css + 全局样式
│   └── index.js
├── cypress/                 # E2E 测试
│   ├── e2e/
│   └── support/
├── scripts/                 # auto-dev.sh 等
└── docs/
    └── rfcs/                # 后续 RFC 存放处（含本文）
```

## 7. 核心模块速览
1. **AuthPage**：登录 / 注册双模态，JWT 持久化至 localStorage。  
2. **ThemeProvider + ThemeSettings**：深浅色切换、主色 & 圆角运行时自定义。  
3. **VoiceRecorder / VoiceDialog**：封装 Web Speech API，支持录音超时、语音复述确认流程。  
4. **ServiceList / ServiceCard**：第-三方技能目录，列表 / 网格视图切换与搜索过滤。  
5. **SessionContext + ProgressBar**：识别 → 理解 → 执行 → 完成四阶段统一进度反馈。  
6. **ErrorBoundary + ToastSystem**：全局错误捕获 & 友好提示通道。  
7. **auto-dev 流程**：`auto-dev.sh` + Cursor CLI + Cypress，实现本地“生成-测试-修复”闭环。

## 8. 接口契约（节选）
| 方法        | 路由                | 说明             |
|-------------|---------------------|------------------|
| POST        | `/auth/login`       | 登录，返回 JWT   |
| POST        | `/auth/register`    | 注册             |
| GET         | `/v1/api/tools`     | 获取技能列表     |
| POST        | `/v1/api/interpret` | LLM 意图解析     |
| POST        | `/v1/api/execute`   | 执行已确认动作   |

> 详见主 PRD 3.2 接口章节；前端通过 `services/apiClient.js` 调用。

## 9. 质量基线
- **单测通过率 ≥ 90%**，CI 阻断。  
- **E2E 覆盖关键路径（登录、主题切换、Skill 调用）**，并通过 axe 自动无障碍检测。  
- **Lighthouse Performance ≥ 85 / Accessibility ≥ 90**（移动端 4G 模拟）。  
- **代码风格**：ESLint + Prettier + CommitLint （约定式提交）。  
- **Clean Code**：遵循项目级 `clean-code` 规则；禁止神奇数字，函数最长 60 行。

## 10. 里程碑
| Mx | 目标                                      | 负责人 |
|----|------------------------------------------|--------|
| M1 | 拆仓库、跑通 `npm run dev` + MSW Mock    | @\<you\> |
| M2 | 移植已有组件 / 页面，单元测试全绿          | |
| M3 | 接入自动化脚本 `auto-dev.sh`，跑通 E2E   | |
| M4 | 集成 Lighthouse + GitHub Actions CI      | |
| M5 | 发布 `v0.1.0`，供团队验收                | |

## 11. 待解决事项
- CI/CD：采用 GitHub Actions 还是 Vercel / Cloudflare Pages？  
- SSR 需求：当前为纯 CSR；未来是否需要 Next.js？  
- PWA 能力：离线缓存、推送通知的优先级评估。  
- 浏览器兼容策略：最低支持 Safari 14.1？（语音 API 支持差异大）

## 12. 结论
本 RFC 明确了前端子仓库的边界、核心目标与技术栈，旨在统一团队认知，减少摩擦，加速 MVP 迭代。  
欢迎所有成员在评论区提出修改意见，7 天后若无重大异议将转为 Accepted 并落库执行。

---

### 提交方式
1. Fork > 提 PR；标题以 `RFC-0001:` 开头。  
2. 评论请引用具体行号，便于逐条讨论。  
3. 通过后，主仓库 maintainer 会合并并将状态改为 `Accepted`。

---

如需进一步补充，请在本 RFC 下开评论或提交新的 RFC 编号。