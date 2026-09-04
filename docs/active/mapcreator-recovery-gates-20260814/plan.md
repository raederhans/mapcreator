# Map Creator Recovery Gates Plan

## Goal

依次完成 Gate 0 至 Gate 5，把当前基础治理成果转化为稳定 Golden Demo、可负担的验证组合、可量化的架构与性能预算，并以正式 P4.4 准入完成 Appearance / Transport 平台化。

主线程担任总监督、唯一集成者、共享文件 owner 和 live browser/live-test owner。独立子代理承担只读映射、非共享文件实现和静态复核，并向主线程提交有边界的交付。

## Scope

- Gate 0：冻结 exact revision、环境、任务状态、测试层级、性能样本契约和 live-process ownership。
- Gate 1：完成 `landing → TNO sample → Guide → Export → Download Snapshot` Golden Demo。
- Gate 2：建立 PR / Demo / Nightly / Release 四层验证组合并收敛公共入口。
- Gate 3：按 Export / Startup / Interaction / Appearance / Transport capability seam 拆分大型组合根。
- Gate 4：建立启动资源图、first-visible 预算和 Pages/dist reachability gate。
- Gate 5：完成 P4.4、Appearance / Transport change-set 生命周期和 frozen-SHA 最终准入。

## Sources of truth

- 当前 checkout 的代码、Git identity、worktree topology 和同一 SHA 的验证产物。
- 本目录：跨 Gate 状态、所有权、验收和交接。
- [`../appearance-transport-platformization-milestones-20260812/`](../appearance-transport-platformization-milestones-20260812/)：P4.3 / P4.4 / Appearance / Transport milestone 事实。
- [`../state-action-ownership-p4-20260719/`](../state-action-ownership-p4-20260719/)：P4 policy、routes、actions 和 admission 事实。
- [`../test-verification-reform-20260813/`](../test-verification-reform-20260813/)：验证性能、full-policy 和 process-control 事实。
- [`.omx/plans/mapcreator-project-recovery-roadmap-20260814.md`](../../../.omx/plans/mapcreator-project-recovery-roadmap-20260814.md)：用户确认的详细调研与路线图基线；本文件保留可提交的阶段与验收契约。

## Stages

- [x] Gate 0 — Frozen baseline and control plane
  - exact `HEAD == origin/main`、clean status、单一 worktree。
  - Golden Demo 场景、语言、视口、导出参数与错误分类冻结。
  - current status artifact、任务记录和 live-process registry 可重建。
  - 3 cold + 3 warm 性能样本契约确定；正式运行由主线程独占。
- [x] Gate 1 — Golden Demo admission
  - 修复 Export Workbench required dependency 装配和下载完成事务。
  - Golden Demo 实际点击 Snapshot、校验 PNG 和成功 UI。
  - 1280×720、1366×768、1440×900、768×900、375×760 关键区域重叠面积为 0。
  - pageerror、unhandled console error、required-resource 4xx/5xx 为 0；guest auth 使用明确契约。
  - frozen SHA 串行 5/5 通过。
- [x] Gate 2 — Verification portfolio
  - 建立 `verify:pr`、`verify:demo`、`verify:nightly`、`verify:release` canonical entrypoints。
  - 每个现有 script 归类为 canonical、internal 或 superseded。
  - PR p95 `<=10 min`，Demo `<=3 min`；full policy 保留 Nightly / Release 证据。
  - smoke issue arrays 进入失败断言或带 owner、scope、expiry 的 expected-issue contract。
- [ ] Gate 3 — Capability architecture
  - Export capability 先完成独立 lifecycle、dependency contract、artifact、download 和 error taxonomy。
  - Startup、Interaction、Sidebar / Toolbar composition、Scenario chunk runtime 依次切片。
  - 第一轮 ratchet：`initSidebar <=2500` 行、`initToolbar <=1500` 行、scenario chunk controller `<=1700` 行、`handleClick <=200` 行、`map_renderer.js` imports `<=80`。
  - controller required dependencies 100% 构造期校验。
- [ ] Gate 4 — Performance and artifact budgets
  - 生成 startup module/resource graph，标注 critical、deferred、scenario-specific、export-only、dev-only。
  - 同环境目标：TNO first-visible p50 `<=5.0s`、initial scripts `<=100`、initial decoded bytes `<=4.5MB`。
  - Pages/dist artifact 具备 100% reachability 或显式产品归属；正式体积上限由 Gate 0 inventory 固定。
  - 性能 gate 与 Pages/dist gate 绑定同一 frozen SHA。
- [ ] Gate 5 — Appearance / Transport platformization admission
  - [x] P4.3 按现有 contract 有界收口；`A_ADMITTED_SHA=5fff7388d6246fa3bfb6c92a33d9ae5535a8af66`。
  - P4.4 从正式 A baseline 重放、验证并写入 `B_ADMITTED_SHA`；P4.5 保持独立。
  - Appearance / Transport change-set 覆盖 Preview / Compare / Apply / Undo。
  - 用户操作生命周期为 `Preparing → Applying → Rendering → Ready / Recoverable error`。
  - Demo 覆盖 `sample → Guide → edit → export → restore`。
  - Release gate 在 frozen SHA 上完成并形成最终 verdict。

## Acceptance criteria

- 所有 Gate 按顺序完成，前一 Gate 的 artifact 和 exact SHA 成为后一 Gate 输入。
- 主线程独占 `index.html`、`css/style.css`、`js/ui/toolbar.js` 的修改与集成。
- 主线程独占 dev server、browser、Playwright、Pages/dist、standard perf、heavy-geo、scenario-data、checkpoint builder 和 `.runtime` output locks。
- 每个真实缺陷都补充确定性 regression；所有生产路径在 SF-ATS 中 production unmatched 0、route gaps 0。
- 最终报告包含 exact revision、改动文件、命令、退出码、artifacts、跳过项和残余风险。
- 源码、policy、generated status、task records 和 release artifact 对正式 candidate identity 一致。

## Non-goals

- 本计划不提升 thematic 的 `catalog_only` 状态。
- 本计划不扩展 Cloud Saves 的发布、受众和社区语义。
- 本计划不执行外部生产部署、force-push、远端历史重写或凭据操作。
- P4.5 notification fanout 保持独立里程碑。
- 数据内容扩展和新场景进入 Gate 5 后的产品队列。

## Risks and constraints

- `tools/state_writer_policy.json`、Pages/dist、browser、performance 和 shared `.runtime` 是单 owner 写入面。
- P4 full-policy 历史完整运行约 15m55s；重跑需要 exact command、稳定日志和停止条件。
- 当前 first-visible 数据来自单次 localhost 诊断；Gate 0 的 3 cold + 3 warm 样本将形成正式比较基线。
- 现有 active docs 含历史 SHA 和 pending 状态；generated current status 优先表达机器事实。
- 子代理共享同一工作目录；文件所有权、Git/index/refs 和 live-process 限制对所有子代理生效。

## Runtime Architecture Reset v1 — Stage C amendment (2026-08-31)

### Goal and entry identity

- 从已收口的 `main@2bd9493f9f93e19689b6865b0822160cd787b171` 开始，把 Stage B 的“内容身份”推进为可验证、可恢复的本地内容寻址 artifact 合同。
- 同时建立一个真实 vertical-module 的成熟度投影，先覆盖 transport `road`，避免把 workbench preview、main-map eligibility、apply bridge 与 Pages owner 混成单一状态。
- 这是原 Recovery Gates 路线图上的独立执行 amendment；不静默重解释或关闭历史 Gate 3→5。

### Parallel lanes and ownership

1. **C1 — Content-addressed artifact cache + startup-support adapter**
   - 独占新增 `map_builder/content_addressed_artifact_cache.py` 与对应 focused test。
   - 可修改 `tools/patch_tno_1962_bundle.py`、`map_builder/scenario_build_session.py`、`tests/test_tno_bundle_builder.py`、`tests/test_scenario_build_session.py`。
   - 若能保持窄接口，可由同一 owner 为 `tools/pages_artifact_admission.py` 增加只读/admit adapter；不得修改 Pages builder、shadow、workflow、tracked `dist` 或发布路径。
2. **C2 — Transport-road maturity projection**
   - 独占 `js/core/transport_capability_registry.js` 与新增 focused Node test；只在必要时读取既有 road manifest 和 family registry。
   - 状态必须按 surface 分开，且 `mainMapEligible`、`apply_bridge_supported` 来自已加载 manifest evidence；`previewOnly` 仍只描述 workbench 边界。
   - 不修改 migration ledger、Pages artifact digest/命名、legacy projection 或 tracked `dist`。
3. **Integration owner — `/root`**
   - 独占 task records、Git/index/refs、PR、worktree 生命周期、共享验证路由和所有长/共享测试。
   - 两个候选只交付单职责 commit 与验证证据；主线程按 C1 → C2 串行审查和集成。

### Acceptance criteria

- CAS manifest 以排序后的相对 POSIX 路径、byte length 与文件 SHA-256 形成 canonical digest；拒绝绝对路径、路径穿越、重复路径、symlink/reparse、缺失或损坏对象。
- restore 在完整校验通过前不改变目标；中断或失败时既有目标保持不变。source/builder/manifest/tree identity 不精确匹配时 fail closed。
- startup-support checkpoint/session 记录 CAS manifest/tree digest，并在命中时真实 materialize/verify 本地对象；旧 signature 保持兼容重建路径，不把短 snapshot 目录名当内容地址。
- road maturity projection 是 deterministic、只读且不可变的纯数据；缺失/矛盾 manifest evidence 返回明确 reason code，不凭 registry 默认值推断已成熟。
- focused C1/C2 tests、现有 startup-support/session tests、transport road/manifest contracts 与架构边界检查通过；只有触及 Pages adapter 时才追加 Pages admission/shadow tests。
- 远端 protected-main PR 的 required checks 全绿后才收口 Stage C；未运行 browser、Nightly、Release、deployment 或 performance 时必须明确保留该边界。

### Explicit non-goals

- 不建立共享、跨机器或远端 cache，不修改浏览器 IndexedDB startup cache。
- 不删除 tracked `dist`，不退休 legacy catalog projection，不改变 migration ledger authorization。
- 不扩展 thematic catalog-only surface，不声称 transport 全 family 已完成 vertical-module migration。
- 不执行 live apply/undo、产品发布、生产部署或重复前期性能模拟。

### Local execution result

- Stage C baseline amendment 已由 PR #115 合并为 `9bf4bc135dd8a23b2226c7dbf6d312a2ffd0ad76`。
- C1、C2、canonical verification route 与 tracked Pages mirror 已按独立 commit 集成；本地 focused、shadow、route schema、architecture 与 Pages 合同全部通过。
- PR #116 的 10 项最终检查全部通过，并以 `df1b14fa3cee45b539e1a8d4f7976ec816c765dc` 合并到 protected `main`；候选 refs、tasks、worktrees 与临时分支均已按可恢复顺序收口，Stage C 完成。

## Original-plan continuation amendment — R1 (2026-08-31)

### Reconciled scope

- Stage A 已覆盖原 Phase A 的 City-light boot cut、ready-before-full-UI 与 `verify:commit` 基础；不代表全部 panel 已按首次打开动态加载。
- Stage B 已覆盖 `RenderSnapshot/v1` 与 `RenderChangeSet/v1` 的纯合同；live apply/undo、history/runtime/render wiring 仍属于 Gate 5。
- Stage C 已覆盖本地 CAS 的一个真实 startup-support adapter 与 road maturity 首个 projection；全 stage 产品面、artifact cutover、tracked-dist retirement、vertical feature migration 和 runtime-hook 退休均未完成。
- Gate 3、Gate 4 与 Gate 5 继续使用本计划原验收，不因 Stage A–C amendment 自动勾选。

### R1 work packages and ownership

1. **Gate 4 static startup graph**
   - 独立新增 startup module/resource graph 与聚焦合同；分类 `critical`、`deferred`、`scenario-specific`、`export-only`、`dev-only`。
   - 不运行真实 perf、Pages/dist、browser 或 shared `.runtime`；不修改共享 Pages builder、canonical routes 或 UI composition roots。
   - 2026-09-04：隔离审计 commit `a1f0885c6617622d260bc633c257b3f67b941686` ready/not integrated；graph 仍 rejected（46 issues），故该 work package 与 Gate 4 均未完成。
2. **Gate 3 Export vertical seam**
   - 收口 Export lifecycle、required dependency、artifact/download transaction 与 error taxonomy 的窄接口。
   - worker 只修改 Export 专属模块和 focused tests；`js/ui/toolbar.js` 的任何最终 wiring 由主监督单 owner 串行完成。
3. **Gate 5A P4.3 candidate**
   - 2026-09-04 complete：P4.3 current-main drift、聚焦 source fixes 与 canonical route 已在 frozen source `5fff7388d6246fa3bfb6c92a33d9ae5535a8af66` 收口。
   - checkpoint、Pages/dist、browser、core main-thread、standard perf 与 final independent verdict 已由主监督串行完成；该 SHA 是唯一 A admission identity。

### Dependency and admission order

`A_ADMITTED_SHA=5fff7388 → B1/B2/B3 semantic replay（not started）→ supervisor serial integration/control-plane work → P4.4 exact admission/B_ADMITTED_SHA → Appearance/Transport live lifecycle → recoverable Demo → final release verdict`。

P4.4、live ChangeSet、tracked-dist retirement、共享 cache 与 P4.5 runtime-hook 退休都不得越过各自前置准入或授权。性能实测只在结构切片落定且 frozen SHA 可比较后运行一次，不在 R1 早期重复模拟。
