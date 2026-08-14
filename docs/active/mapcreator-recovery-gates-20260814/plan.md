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
  - P4.3 按现有 contract 有界收口并写入正式 `A_ADMITTED_SHA`。
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
