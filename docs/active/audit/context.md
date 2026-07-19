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
| 2026-07-19 | run `29691472324` 的 base baseline 成功；base/head 应用运行时代码相同，current 的 `refreshScenarioApplyMs` 仍比 base 高 18.8%。 | 单批次顺序噪声不能作为 tooling-only 提交的阻断证据；classifier 仅对真实不同的 runtime JS、app shell、dev server 启用阈值阻断，其余 gate 自检保留完整差异作为诊断。 |
| 2026-07-19 | 本地默认 `enforce` 复跑曾在 `tno_1962-run-04` 等待 120 秒；浏览器诊断记录同一时刻多个模块与数据请求出现 `net::ERR_NETWORK_CHANGED`，dev server 探针仍健康。 | 仅对四个明确的 Chromium 瞬时网络错误重建 browser context 并重试一次；普通启动错误直接失败，第二次瞬时错误继续失败。 |
| 2026-07-19 | city label E2E 连续两次在 worker fixture setup 的默认 30 秒预算处结束；trace 中页面、场景 bundle 和模块均为 200，部分本机模块响应耗时 13–14 秒。 | 按 Playwright 官方 fixture 合同给共享 city worker fixture 独立 120 秒预算，使外层生命周期与内部 boot wait 一致；修复后 1/1 passed。 |
| 2026-07-19 | 隔离的 `mapcreator-audit-20260719-followup` 保留一套旧版未提交测试方案；P4 worktree 继续有独立开发改动。 | 两个 worktree 都未达到 `ready-for-integration`；本轮不合并、不清理，避免旧测试耦合回流或干扰 P4。 |
| 2026-07-19 | GitHub Actions run `29693353672` 的 base baseline 完整成功；current warmup-01 诊断记录 localhost 模块请求 `net::ERR_CONNECTION_FAILED`。 | 将这个明确错误码加入同一有界恢复白名单；继续排除泛化 `ERR_FAILED`，重试前由 server 探针决定复用或重启。 |
| 2026-07-19 | follow-up `8c1f881ad1dceea12fd1a33b1e3946109ada668d` 的四条 GitHub Actions workflow 全部成功。 | 性能 base/current、合同矩阵、transport 合同和 Pages 部署 smoke 已形成远端终态证据，本审计完成。 |

## Live process ownership

| Process | Owner | Log path | State |
| --- | --- | --- | --- |
| City label Playwright | 主线程 | `.runtime/tests/playwright/` | 修正 fixture timeout 后 1/1 passed，测试 1.1m、run 2.0m；资源已释放 |
| City lights Playwright | 主线程 | `.runtime/tests/playwright/` 与 `.runtime/browser/mcp-artifacts/screenshots/` | 1/1 passed，1.1m；page/console/network 问题均为空；资源已释放 |
| Perf gate | 主线程 | `.runtime/output/perf/audit-enforce-mode-retry/perf-gate-current.json` | 默认 `enforce` 模式 passed；两个 gate 场景的合同、render-role、阈值失败均为 0；资源已释放 |

## Handoff

主线程负责审计整合、文件修改、SF-ATS、live checks、提交和推送。独立 agent 只做静态 review，并返回 file:line 证据。

## Next step

保留未归属的文档 WIP、旧 audit worktree 和 P4 worktree，后续由各自 owner 独立处理。
