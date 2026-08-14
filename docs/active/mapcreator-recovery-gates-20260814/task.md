# Map Creator Recovery Gates Task

## Current status

`GATE_2_IN_PROGRESS` — Gate 1 已完成 Export download、runtime taxonomy、responsive layout、Pages mirror 与 Golden Demo 5/5；Gate 2 开始整合 changed-file PR selector、Demo profile 和 supersession evidence。Frozen source baseline 为 `7ddcee0d613b0210a37e287c77e49c90443bd415`，Gate 1 candidate identity 由包含本记录的 Git commit 标识。

## Checklist

### Gate 0

- [x] 复核 `HEAD`、`origin/main`、status 与 worktree topology。
- [x] 保存用户确认的完整 Gate 0→5 路线图。
- [x] 创建可恢复的 `plan.md`、`task.md`、`context.md`。
- [x] 分配 Demo、verification、architecture/performance 三个独立只读 lane。
- [x] 收集三个独立审计 lane 的精确文件、契约、阻塞与执行切片。
- [x] 固定 Golden Demo error taxonomy、视口、导出和 artifact contract。
- [x] 生成可重建 current status 记录：Git identity、policy latest phase、agent/live ownership 和现有 gate surfaces 已写入本目录。
- [x] 执行 canonical `perf:gate`：3 warmups + 5 measured runs，exact frozen profile。
- [x] 关闭 Gate 0 并记录 Gate 1 baseline SHA 与 performance blockers。

### Gate 1

- [x] Demo-01：Export `showToast` required dependency 装配与 regression。
- [x] Demo-02：Snapshot 下载、PNG、成功 UI 和 pageerror E2E。
- [x] Demo-03：短高度 Export layout 与元素碰撞 regression。
- [x] Demo-04：favicon、guest auth、D3 geometry、preload error taxonomy；polar water 生成缺陷进入 Gate 4 高风险数据工作包。
- [x] Golden Demo frozen candidate 串行 5/5。

### Gate 2

- [ ] 完成 319 scripts 的 canonical/internal/superseded inventory。
- [ ] 建立 PR / Demo / Nightly / Release canonical entrypoints。
- [ ] 将 full state-writer policy 放入 Nightly / Release 组合。
- [ ] smoke issue arrays 与 SF-ATS behavior capability 进入确定性契约。
- [ ] 验证 PR 与 Demo 预算。

### Gate 3

- [ ] Arch-01：Export vertical seam。
- [ ] Arch-02：Startup vertical seam。
- [ ] Arch-03：Interaction vertical seam。
- [ ] Arch-04：Sidebar / Toolbar composition ratchet。
- [ ] Arch-05：Scenario chunk runtime ratchet。
- [ ] 验证第一轮函数长度、import fan-out 和 dependency contract 门槛。

### Gate 4

- [ ] Perf-00：startup module/resource graph。
- [ ] Perf-01：production bundle/code-split 有界实验。
- [ ] Perf-02：first-visible data split 与 deferred features。
- [ ] Artifact-01：Pages/dist reachability inventory。
- [ ] 在 frozen SHA 上验证性能与 artifact budgets。

### Gate 5

- [ ] 完成 P4.3 admission 并写入 `A_ADMITTED_SHA`。
- [ ] 完成 P4.4 replay/admission 并写入 `B_ADMITTED_SHA`。
- [ ] 完成 Appearance / Transport versioned change-set。
- [ ] 完成 `sample → Guide → edit → export → restore`。
- [ ] 完成 final release gate、independent review 和最终 verdict。

## Validation evidence

| Command or check | Result |
| --- | --- |
| `git status --short --branch` | PASS；初始 `## main...origin/main`，无改动。 |
| `git rev-parse HEAD` | PASS；`7ddcee0d613b0210a37e287c77e49c90443bd415`。 |
| `git rev-parse origin/main` | PASS；与 HEAD 相同。 |
| `git worktree list --porcelain` | PASS；仅当前 `main` worktree。 |
| 前序 `verify:architecture-boundaries` | PASS，exit 0；当前 revision 的新改动仍需重跑。 |
| 前序 `verify:test-import-graph` | PASS，51 specs，exit 0。 |
| 前序 `verify:test:e2e-layers` | PASS，47 E2E / 4 smoke，exit 0。 |
| 前序官方 smoke | PASS 4/4，34.4s；同时记录 favicon 404、guest auth 401、D3 warning，形成 Gate 1 契约输入。 |
| 前序 Golden Demo browser path | Snapshot PNG 下载成功后触发 `showToast is not a function`；已定位装配缺口。 |
| 前序 1280×720 layout metrics | panel `854/630`，footer/preview overlap `77588px²`；形成 Gate 1 regression 基线。 |
| Gate 1 independent mapping | PASS；定位 `toolbar.js` 装配、export transaction、E2E 下载与短高度布局覆盖缺口；无写入和 live process。 |
| Gate 2 independent mapping | PASS；定位 PR-fast 全量 198 `test:node:*` 动态循环和可复用 selector/supersession/CI profile surfaces；无写入和 live process。 |
| Gate 3/4/5 independent mapping | PASS；确认 A→B→C admission、Appearance/Transport seams、startup deferred owners 与 Pages reachability surfaces；无写入和 live process。 |
| `npm run -s perf:gate` attempt 1 | ADMISSION REJECTED，exit 3；CPU average 33.8%、peak 38.9%、ChatGPT single-core 63.1%；测量未启动。日志 `.runtime/output/perf/recovery-gate0-perf-gate.log`。 |
| `npm run -s perf:gate` attempt 2 | ENVIRONMENT ADMITTED、generation fence stable、contract/role mismatches 0；完成 3 warmups + 5 runs；PERF REGRESSION，exit 1。TNO total 8353.2ms vs 7058.5ms、scenario applied 3396.2ms vs 2768.0ms、bundle apply 717.2ms vs 459.3ms、refresh apply 351.9ms vs 273.2ms；HOI4 bundle apply 782.8ms vs 679.9ms。artifact `.runtime/output/perf/baseline_2026-07-30/perf-gate-current.json`。 |
| Gate 1 SF-ATS dry-run | PASS，exit 0；risk `high`，route gaps `[]`，artifact `.runtime/reports/generated/supervisor-plan.json`。 |
| Gate 1 child-safe selection | PASS，exit 0；6 个 selector/contract/layer suites 全部通过，日志 `.runtime/tests/recovery-gate1-child-safe.log`。 |
| `verify:toolbar-split-boundary` | FAIL；working `toolbar.js` 3186 lines，contract max 3100；frozen HEAD 已为 3185 lines，记录为 Gate 3 composition ratchet blocker，未扩大阈值。 |
| Gate 1 focused Node/Python | PASS；Export 11/11、project-support 24/24、source editor shell 1/1、frame compositor boundary 5/5。 |
| Gate 1 refreshed child-safe | PASS 至 stale contract 前；前 8 项通过。stale frame contract 已从 direct write token 更新到现有 action owner token，focused 5/5、architecture boundaries、E2E layers 全部 exit 0。 |
| Responsive Playwright | 初次发现 1280×720 与 1366×900 可见碰撞/裁剪契约缺口；修复后 375×760、768×900、1280×720、1366×768、1366×900 全部通过，日志 `.runtime/tests/playwright/recovery-gate1-responsive-rerun3.log`。 |
| Golden Demo 5× | PASS 5/5，4.5m；每次真实 `map_snapshot.png`、PNG signature、success toast，零未分类 pageerror/console/request failure/4xx-5xx；日志 `.runtime/tests/playwright/recovery-gate1-golden-5x.log`。 |
| `verify:pages-dist` | PASS；builder 输出 927.38 MiB manifest；Pages startup shell 48/48、landing 18/18、sample contracts 18/18；日志 `.runtime/tests/recovery-gate1-pages-dist.log`。 |
| Gate 1 selected UI matrix | 初次 27/28；`sidebar_default_collapse` 暴露 deferred listener、既有 scenario auto-open 与 Special Regions empty-state 三项 stale test assumptions。确定性修复后 focused 1/1，合并证据 28/28；日志 `.runtime/tests/playwright/recovery-gate1-selected-ui-regressions.log` 与 `recovery-gate1-sidebar-collapse-rerun3.log`。 |

## Open risks and remaining work

- 当前任务记录本身是首批 tracked change；主线程负责后续 diff、stage、commit 与 integration decision。
- P4.3、test-reform 和 Appearance/Transport 现有记录包含旧 revision 历史；本目录记录当前总控状态。
- Gate 0 standard perf 已完成并发现 5 个 enforced regressions；该结果进入 Gate 4，Gate 1 需保持指标可比较。
- Gate 1 修复会触及共享 `js/ui/toolbar.js` 与 `css/style.css`，只能由主线程串行编辑。
- Gate 1 当前已完成共享文件串行编辑与唯一 live lane；提交后 source/dist mirror 应保持同一 revision。
- D3 unsafe-water 根因位于 primary topology 生成链的 Arctic/Southern polar geometry；需要重生成 topology、startup bundle、Pages mirrors 并验证绘制/hit testing，作为独立高风险数据工作包进入 Gate 4。
- Gate 2、Gate 3、Gate 4 已分别排队为隔离 Codex 任务；主线程按 Gate 顺序审查、串行整合并复跑 live gates。
