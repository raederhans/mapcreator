# Context

## Current truth

- 2026-07-19 开始时 `main`、`origin/main` 均为 `07d95eaa7fc94bdc7464fc1fb2b3cd33a7faf1ad`，tracked worktree 干净。
- 开始时 `git worktree list --porcelain` 只列出当前 main worktree；运行期间新增了 `codex/state-action-ownership-p4-20260719` worktree。
- 最近可审计的功能簇是 `4eab36c9^..18d6ffae`，共 8 个非纯文档提交。
- 自动化上轮已审过更早的 appearance/transport 与 P3 交付；本轮从上次运行后的提交继续。

## Decisions and deviations

| Time | Evidence or decision | Impact |
| --- | --- | --- |
| 2026-07-19 | 排除 `07d95eaa`、`3dbe88da`、`f8ef7a4c` 等纯任务/注册表文档提交。 | 审计保持在功能与验证代码。 |
| 2026-07-19 | 审查发现性能 gate 可用单场景绕过、环境身份过宽，以及 city E2E 在 infra promotion 完成前截图。 | 收紧 gate 入口和环境合同，改为同 runner 基线，并恢复完整 infra idle。 |
| 2026-07-19 | 最终复审发现 base 与 head 的 lockfile/受测场景不同会让严格 identity 合同形成必然失败。 | base 保持旧应用代码，同时在安装和测量前投影 head 的依赖清单、受测场景与 perf harness。 |
| 2026-07-19 | 删除 city label 死 helper 后，timeout guardrail 报告一个 stale `waitForTimeout` allowlist 条目。 | 只删除 stale 条目，保留该 spec 仍需要的 long-timeout 许可。 |
| 2026-07-19 | 运行期间 main 出现无关 `docs/archive/**` 删除和 `lessons learned.md` WIP。 | 原样保留，提交时采用显式路径暂存。 |
| 2026-07-19 | 新 P4 worktree 与 main 同基线，只有未提交 inventory/测试/任务记录。 | 状态为开发中，未达到 `ready-for-integration`，本轮保持隔离。 |
| 2026-07-19 | 功能提交 `4905fb696d9a5222aea628937fd2bc804109ae1f` 已推送到 `origin/main` 并确认远端同 SHA。 | 本 closeout 只记录审核完成事实，不吸收无关 WIP 或 P4 内容。 |
| 2026-07-19 | GitHub Actions run `29690544801` 连续两次在 base baseline 失败；第三次日志显示默认观察场景 `blank_base` 等待 120 秒仍无 perf snapshot。 | base baseline 改为只运行 current gate 使用的 `tno_1962,hoi4_1939`，消除无关场景启动风险和额外耗时。 |
| 2026-07-19 | 失败时浏览器诊断原本写在即将删除的 base worktree 中，且追加到 `Error.message` 的路径不会出现在优先打印的旧 stack。 | 删除 worktree 前复制 dev-server/浏览器证据，并把诊断路径同步追加到 stack。 |
| 2026-07-19 | run `29691472324` 的 base baseline 成功；base/head 应用运行时代码相同，current 的 `refreshScenarioApplyMs` 仍比 base 高 18.8%。 | 单批次顺序噪声不能作为 tooling-only 提交的阻断证据；classifier 仅对 runtime JS 与 app shell 启用阈值阻断，其余 gate 自检保留完整差异作为诊断。 |
| 2026-07-19 | 本地默认 `enforce` 复跑曾在 `tno_1962-run-04` 等待 120 秒；浏览器诊断记录同一时刻多个模块与数据请求出现 `net::ERR_NETWORK_CHANGED`，dev server 探针仍健康。 | 仅对明确的 Chromium 瞬时网络错误重建 browser context 并重试一次；普通启动错误直接失败，第二次瞬时错误继续失败。 |
| 2026-07-19 | GitHub Actions run `29693353672` 的 base baseline 完整成功；current warmup-01 诊断记录 localhost 模块请求 `net::ERR_CONNECTION_FAILED`。 | 将这个明确错误码加入同一有界恢复白名单；继续排除泛化 `ERR_FAILED`，重试前由 server 探针决定复用或重启。 |
| 2026-07-19 | follow-up `8c1f881ad1dceea12fd1a33b1e3946109ada668d` 的四条 GitHub Actions workflow 全部成功。 | 性能 base/current、合同矩阵、transport 合同和 Pages 部署 smoke 已形成远端终态证据，本审计完成。 |
| 2026-07-19 | GitHub Actions run `29691472324` 只命中 `perf-workflow` 与 `perf-tools`，产品 runtime 未变，却因 TNO 一次阈值抖动失败。 | 所有 perf 相关变更继续测量；只有 `runtime-js` 与 `app-shell` 命中会阻断阈值回归，其余规则保留 diagnostic failures。 |
| 2026-07-19 | PR checkout 的 `HEAD` 是 merge candidate，`pull_request.head.sha` 只代表分支 head。 | 分类使用 `diffHeadSha`，base governed inputs 使用实际 checkout 的 `candidateSha`。 |
| 2026-07-19 | SF-ATS 把 `.github/workflows/perf-pr-gate.yml` 留为 unmatched。 | workflow 精确路由到 child-safe `verify:perf-gate-contract`。 |
| 2026-07-19 | City label E2E 安装 draw hook 但只检查派生 label 与 pass 时间戳。 | 每次语言切换清空 draw log，并等待实际 canvas 文本记录。 |
| 2026-07-19 | City label 首次复测命中 worker fixture 默认 30 秒预算，第二次复测命中用例 90 秒预算；trace 显示准备阶段已消耗约 84 秒。 | worker fixture 使用独立 150 秒预算，用例使用 240 秒预算，并修正 Playwright timeout 参数位置与 CJK 样例。 |
| 2026-07-19 | 本地 checked-baseline enforce 复测时 Codex/浏览器栈持续占用约 25–33% CPU，TNO 与 HOI4 的启动、应用和渲染指标同步放大约 3 倍。 | 保留失败报告作为环境污染证据；远端 same-runner base/current 结果承担权威性能判定。 |
| 2026-07-19 | HTTPS push 多次连接重置；GitHub Contents API 对两个大文件未保持目标 blob。 | 改用 Git Data API 写入精确 blob/tree；远端 `8c799876` 与本地审核 tree 均为 `ff4baa07`。 |
| 2026-07-19 | 完整语义差异的 perf run `29695338530` attempt 2 完成 same-runner base/current 与 evidence 上传。 | 本轮性能工作流改动获得 GitHub-hosted 权威通过证据。 |
| 2026-07-19 | Pages 首次 smoke 在发布后短暂无法动态导入 `state.js`；当前 URL 与模块随后均返回 HTTP 200，同一提交 attempt 2 完整通过。 | 判定为发布传播窗口；保留失败证据，不增加无复现依据的产品 fallback。 |

## Live process ownership

| Process | Owner | Log path | State |
| --- | --- | --- | --- |
| City label Playwright | 主线程 | `.runtime/tests/playwright/audit-20260719-followup-city-label-final.log` | 1/1 passed，测试 1.6m、run 2.3m；实际 EN/ZH/EN canvas draw、console、network 通过；资源已释放 |
| City lights Playwright | 主线程 | `.runtime/tests/playwright/audit-20260719-followup-city-lights.log` 与 `.runtime/browser/mcp-artifacts/screenshots/` | 1/1 passed，测试 2.7m、run 3.5m；page/console/network 问题均为空；资源已释放 |
| Perf gate | 主线程 | `.runtime/output/perf/baseline_2026-07-14/perf-gate-current.json` 与 GitHub artifact `perf-pr-gate-evidence` | 本地 checked-baseline enforce 记录桌面资源污染；远端 same-runner run `29695338530` attempt 2 全部通过；资源已释放 |

## Handoff

主线程负责审计整合、文件修改、SF-ATS、live checks、提交和推送。独立 agent 只做静态 review，并返回 file:line 证据。

## Next step

本轮审核已完成。继续保留 P4 worktree 与 main checkout 的 archive/lessons WIP，由各自任务独立推进。
