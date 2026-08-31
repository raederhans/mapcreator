# Map Creator Recovery Gates Task

## Current status

`RUNTIME_ARCHITECTURE_RESET_STAGE_C_IN_PROGRESS` — 原 Recovery Gates 的 Gate 0、Gate 1、Gate 2，以及 Runtime Architecture Reset v1 的 Stage A、Stage B 已完成。Stage C 以 `main@2bd9493f9f93e19689b6865b0822160cd787b171` 为进入身份，并行执行本地内容寻址 artifact cache 与 transport-road 成熟度投影；主线程负责任务记录、串行集成、Git/refs 和最终验证。原 Gate 3→5 仍是历史路线图，不因本次 Stage C 自动宣称完成。

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

- [x] 完成 325 scripts 的 canonical/internal/superseded inventory：4 canonical、292 internal、29 superseded。
- [x] 建立 PR / Demo / Nightly / Release canonical entrypoints。
- [x] 将 full state-writer policy 放入 Nightly / Release 组合。
- [x] smoke issue arrays 与 SF-ATS behavior capability 进入确定性契约。
- [x] 将 P4.1/P4.2a/P4.2b/P4.2c/P4.3 Python state-writer phase boundaries 标记为 `main-thread` / `heavy` / `full` / `.runtime-output`；action-route focused contracts 保持 child-safe。
- [x] 验证 PR 与 Demo 预算：代表性单 UI PR 本机 5-run p95 35.615 秒；canonical Demo 139.480 秒。
- [x] 最终 canonical `verify:pr`：204 条实际命令全部通过，47 条 main-thread 命令 deferred，执行结果失败 0、unmatched 0。

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
| Gate 2 portfolio contracts | PASS；325 scripts 全部唯一归类，4 canonical、292 internal、29 exact-superseded；core runner 39/39、portfolio 9/9、metadata 30/30、structural 43/43、369 routes、47 E2E manifest 全部通过。 |
| Gate 2 smoke profile | PASS 4/4，37.8s；HOI4 两次、TNO 一次 exact polar-water expected issue，actionable console 0、network failure 0；日志 `.runtime/tests/playwright/recovery-gate2-smoke.log`。 |
| Gate 2 full sample-guide regression | PASS 5/5，4.4m；真实 Snapshot、五视口、中文路径和 recoverable bad deeplink 全部通过；日志 `.runtime/tests/playwright/recovery-gate2-demo-attempt3.log`。 |
| `verify:demo` canonical | PASS 1/1，139.480s；只执行 `@golden-demo` 核心产品旅程，满足 180s 预算；日志 `.runtime/tests/playwright/recovery-gate2-demo-canonical.log`。 |
| Gate 2 representative PR budget | PASS 5/5；33.567s、31.561s 日志跨度、35.615s、32.406s、32.683s，nearest-rank p95 35.615s。每次固定门禁、127 Python tests、TNO strict、4 adaptive child-safe 均通过，7 browser commands deferred，production unmatched 0；日志 `.runtime/tests/recovery-gate2-pr-budget*.log`，报告 `.runtime/reports/generated/recovery-gate2-pr-budget*.{json,md}`。 |
| Gate 2 integrated SF-ATS history dry-run | PASS；37 changed files，249 recommendations，208 retained、32 main-thread blocked；production unmatched 0，三个本任务记录 docs 为允许的非生产 unmatched；artifact `.runtime/reports/generated/recovery-gate2-main-selection.{json,md}`。 |
| Gate 2 independent reviews | 最终 CLEAR；已闭合 deferred Demo consumer、exact history failure、execute empty set、unknown workflow profile、blank command 和 mixed-owner evidence 问题。YAML parser dependency 当前不可用，workflow 由 43 项 structural contracts 覆盖。 |
| Gate 2 final `npm run verify:pr` | PASS，exit 0；204 条 child-safe 命令全部通过，47 条 main-thread/full 命令以结构化 evidence deferred，失败 0、`unmatchedChangedFiles=[]`；artifact `.runtime/reports/generated/test-adaptive-selection.{json,md}`。 |
| Gate 2 post-edit SF-ATS dry-run | PASS，exit 0；260 recommendations、204 retained、47 main-thread blocked，production unmatched 0。 |
| Gate 2 P4-ready focused closure | PASS；scenario chunk/lifecycle/refresh 138/138，state-writer quick contracts 259/259；post-apply diagnostics direct-call budget恢复至既有 multiplicity，resolver authority fixture改为 scanner 可证明的纯读合同。 |

## Open risks and remaining work

- P4.3、test-reform 和 Appearance/Transport 现有记录包含旧 revision 历史；本目录记录当前总控状态。
- Gate 0 standard perf 已完成并发现 5 个 enforced regressions；该结果进入 Gate 4，Gate 1 需保持指标可比较。
- Gate 1 修复会触及共享 `js/ui/toolbar.js` 与 `css/style.css`，只能由主线程串行编辑。
- Gate 1 当前已完成共享文件串行编辑与唯一 live lane；提交后 source/dist mirror 应保持同一 revision。
- D3 unsafe-water 根因位于 primary topology 生成链的 Arctic/Southern polar geometry；需要重生成 topology、startup bundle、Pages mirrors 并验证绘制/hit testing，作为独立高风险数据工作包进入 Gate 4。
- PR p95 的本轮证据来自同机、同一代表性 UI changed-file 的 5 次样本；真实 GitHub runner p95 将由后续 timing artifacts 持续累积。
- P4 Python phase boundary 实测单条曾耗时 734.191 秒并进入 full state-writer 扫描；Gate 2 已修正 route metadata，正式执行归属 Gate 3 admission / Nightly / Release 主线程。
- 当前 P4.3 policy artifact来自 dirty `dff0b800` 诊断运行，无法用于 A admission；Gate 3 将在 Gate 2 clean commit 上生成同阶段 observation refresh，并在最终 policy commit 上运行 clean-identity full/exact gates。
- Gate 3 pure domain seam candidate 位于隔离 worktree `8288`，需要正式 B admission 后重放；Gate 4 startup/dist candidate 保持隔离。

## Runtime Architecture Reset v1 — Stage A execution (2026-08-31)

- [x] 将 City Lights 现代图标脚本从启动依赖图切到图层首次实际请求；首次请求仍复用同一个 promise，旧图标路径不加载该脚本。
- [x] 将首帧 map-ready 与延迟 UI hydration 分成正交生命周期；四条 map-ready 路径统一收口，延迟控件在 hydration ready 前保持 inert，UI import 失败不回滚已经可用的地图。
- [x] 建立 canonical `verify:commit`：真实 working-tree/显式 changed-file 输入、固定 control-plane 批次、共享源双重覆盖、产品源 adaptive child-safe 路由，以及高 fan-out fail-closed escalation。
- [x] 在隔离集成分支将候选重放为 `7023eea8`、`614659d6`、`5bb13c7f`；合并树暴露的 startup-ready/deferred-UI 目录接缝由 `5d8ca24a` 修复，独立审查均为 `ACCEPT`。
- [x] 聚焦合并验证：runtime Node 123/123、metadata/shadow 53/53、portfolio 54/54、verify-core runner 84/84、Python startup boundaries 19/19、342-script portfolio、51-spec import graph、398-route selector schema、`verify:dist-drift` 全部通过。
- [x] [PR #112](https://github.com/raederhans/scenario-forge/pull/112) 的 10 项远端检查全部通过，并以 merge commit `c346eb708e8868396b0ae8c63f8173d1880c9498` 收口到 protected `main`；桌面 `HEAD`、本地 `main`、`origin/main` 与 live remote ref 已核对一致。本阶段没有在本机重复性能模拟，也不声称 browser、nightly、release 或部署验证。

Stage A remaining boundaries: UI hydration 失败目前只有 console/recovery hook，尚无用户可见重试提示；City Lights 首次请求没有有界超时重试；旧 startup-failure recovery 的兼容参数仍保留。Stage B 才处理 RenderSnapshot/ChangeSet 与后续内容寻址构建切片；本阶段不删除 tracked `dist` 或 legacy projection。

## Runtime Architecture Reset v1 — Stage B execution (2026-08-31)

- [x] 建立严格、深冻结、可序列化的 `RenderSnapshot/v1`，只覆盖 palette、ownership 与 viewport；`map_renderer` 仅新增 lazy snapshot owner 与只读 facade。
- [x] 建立纯 `RenderChangeSet/v1` 的 parse/create/compare、exact base-stale 与 declarative preview/compare/apply/undo intent；独立审查发现并关闭 apply/undo 缺 base 与稀疏数组身份碰撞两条 fail-open 路径。
- [x] 为 `startup_support_assets` 的三个既有输出记录稳定 `filename + byte length + SHA-256` 内容身份；旧签名、缺失输出及同长度内容漂移均 fail closed。
- [x] 将新增 Node/Python 合同绑定到 canonical child-safe direct routes，并只在本地 edit/impact 投影中用 exact indivisible test route 替代 generic selector fallback；retained shadow 仍由 canonical source 投影。metadata/portfolio 98/98、control batch 193/193、focused `verify:commit` 200/200 Node + 63/63 Python、shadow equal、401 routes、357 commands、零 mismatch 已通过。
- [x] 按当前 tracked-dist 合同将两个 render handoff 模块登记为同一 on-demand product owner，生成 913.73 MiB Pages 镜像；source/dist 三组文件一致，Pages startup/inventory 合同 62/62 通过。
- [x] [PR #113](https://github.com/raederhans/scenario-forge/pull/113) 的 10 项远端检查全部通过，并以 merge commit `46cd2d9bae9564a9ebfe55a951226d23943dde9a` 收口到 protected `main`；桌面 `HEAD`、本地 `main`、`origin/main` 与 live remote ref 已核对一致。两条原始候选已写入 archive refs，三个 Stage B worktree 均解除注册，功能分支已正常删除。

Stage B remaining boundaries: ChangeSet 仍不执行 live apply/undo、不写 history/runtime state，也不触发 render；startup-support identity 只决定本地 checkpoint reuse，不复制、恢复或发布共享缓存。本阶段不退休 tracked `dist`/legacy projection，不做额外本地性能模拟、浏览器、Nightly、Release 或部署。

## Runtime Architecture Reset v1 — Stage C execution (2026-08-31)

- [x] 冻结进入身份 `main@2bd9493f9f93e19689b6865b0822160cd787b171`，确认工作树干净且 `origin/main` 同步。
- [x] 完成两条只读代码勘察，确定 C1/C2 文件所有权、接口合同、冲突边界和最窄目标测试。
- [ ] C1：建立 provider-neutral 的本地 `ContentAddressedArtifactCache/v1`，以完整 `sha256:<64 hex>` 对象身份承载 deterministic manifest、admit、lookup 与 fail-closed restore。
- [ ] C1：将 Stage B 的 startup-support 三文件身份接入 CAS；保留现有 stage signature/provenance，并让 session metadata 记录 manifest/tree digest。任何对象缺失、损坏、身份漂移或 restore 失败都不得改变既有目标目录。
- [ ] C2：为 transport `road` 建立只读 maturity projection，分别表达 workbench preview、main-map overview、apply bridge 与 Pages product owner；manifest truth 与 `previewOnly` 边界不得折叠为单一 `ready`。
- [ ] 主线程串行审查并集成 C1/C2，运行各自 focused tests、架构/验证路由检查，并以 protected-main PR 远端检查收口。

Stage C boundaries: CAS 仅限仓库本机 `.runtime` / caller-provided local roots，不发布或恢复共享/远端 cache，不修改浏览器 IndexedDB startup cache；maturity projection 不登记 migration ledger。tracked `dist` 继续保留，legacy catalog projection 继续保留；不做额外性能模拟、浏览器、Nightly、Release、部署或任何未经授权的 retirement。
