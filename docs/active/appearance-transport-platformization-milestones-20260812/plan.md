# Appearance / Transport Platformization Milestones

## Goal

按 `A → B → C` 顺序把现有状态所有权候选收敛为正式准入的主线基础，再交付范围受控的 Appearance / Transport 用户操作生命周期。

## Scope

- A：以 final source review-fix commit `2ee6653f812febd69148f659b5baee7fe1e3edf8` 为技术来源，以包含 Gate 1 Export correctness hotfix 的 Gate 0–4 integrated/pre-A functional baseline `1e6ff40fa1f21f7dec9c6f68306adf6bb20dea08` 为范围起点，完成 P4.3 renderer actions 的 policy、performance、routes 与正式准入。
- B：以 A 的 `A_ADMITTED_SHA` 为唯一基线，从 `65335370c50279c19c9074362567f9d2284e0c39` lineage 按职责重放并准入 P4.4 Appearance、UI、Transport、Strategic 与 Special Zone actions；P4.5 notification fanout 保持独立。
- C：以 B 的 `B_ADMITTED_SHA` 为唯一运行时基线，接入预置的 dormant Appearance / Transport contract，交付统一操作生命周期、首个 versioned change-set，以及可恢复的 Demo 任务链。

## Sources of truth

- 当前代码、Git/worktree 事实、同一候选 SHA 的门禁产物与主监督验收结论。
- 既有 P4 技术记录：[`../state-action-ownership-p4-20260719/plan.md`](../state-action-ownership-p4-20260719/plan.md)、[`context.md`](../state-action-ownership-p4-20260719/context.md)、[`task.md`](../state-action-ownership-p4-20260719/task.md)。
- 本目录只保存跨里程碑状态、精确 SHA、交接与门禁摘要；P4 技术细节继续由既有记录和代码承载。

## Stages

2026-09-05 状态收口：B1/B2/B3 的实现进度与正式 admission 统一读取 [P4 当前状态](../state-action-ownership-p4-20260719/task.md#current-status)。下列复选框表示里程碑正式准入，不用于重复登记局部实现；Scope 中的 lineage 和重放顺序保留原计划含义。

- [x] A — P4.3 Admission Pack：`A_ADMITTED_SHA=5fff7388d6246fa3bfb6c92a33d9ae5535a8af66`（source candidate；tree `ba969a24a4730072245c60efeefba66409f2c88d`）。
- [ ] B — P4.4 Replay and Admission Pack：正式准入与 `B_ADMITTED_SHA` 确认以 [P4 当前状态](../state-action-ownership-p4-20260719/task.md#current-status) 为准，不再以历史的 B1/B2/B3 尚未开始描述当前实现。
- [ ] C — Appearance / Transport user-visible milestone：blocked on `B_ADMITTED_SHA`。

## Acceptance criteria

- A：P4.3 renderer/action ownership 与代码、policy、routes、tests、文档一致；A-specific delta 以 `1e6ff40fa1f21f7dec9c6f68306adf6bb20dea08` 为起点；canonical baseline 由标准命令生成 schema 3 JSON/Markdown；Node、Python、policy、routes、browser、Pages/dist、core main-thread、standard perf 与独立 review 绑定正式候选 SHA。
- B：只重放 P4.4 职责提交；共享 UI 文件由主监督串行处理；exact P4.4、Appearance/Transport browser、heavy-geo/data、Pages/dist、core main-thread、standard perf 与独立 review 绑定正式候选 SHA。
- C：用户操作阶段为 `Preparing → Applying → Rendering → Ready / Recoverable error`；预置 contract 在 B actions、history、render 与 UI owners 上完成正式 wiring；首个 change-set 覆盖 Appearance 与 Transport 的 Preview / Compare / Apply / Undo；Demo 任务链覆盖 `sample → Guide → edit → export → restore`。
- 每个里程碑只有主监督可以写入对应 `*_ADMITTED_SHA`，并在写入前核对 Git、门禁产物和集成状态。
- A 的准入身份固定为 source candidate `5fff7388d6246fa3bfb6c92a33d9ae5535a8af66`；任何后续 docs-only 状态提交都不替代该 source identity。

## Non-goals

- A-specific delta（`1e6ff40f..A_ADMITTED_SHA`）保持 `index.html`、`css/style.css`、`js/ui/toolbar.js` 零变化并保持用户可见行为；Gate 0–4 inherited deltas、已回退的 Export Pipeline normalization、纯 export artifact projection extraction、detached scalar ownership repair，以及 Gate 1 Export zero/null/default 与 fail-fast facade correctness hotfix 由 integrated/pre-A functional baseline 承载。该 facade hotfix 的 targeted state-writer multiset 与前一 accepted baseline 完全一致（251 findings、17 ambiguous、93 state-alias、154 unsupported；delta/missing 均为空）。
- integrated baseline 中的 Appearance / Transport contract 保持 dormant：零 runtime writer、零 UI wiring、零 Apply bridge/history persistence；C admission 负责激活与产品验收。
- B 不包含 P4.5 hooks，也不扩展 C 的产品范围。
- C 不提升 thematic 的 `catalog_only` 状态，不扩展 Cloud Saves 的发布语义。

## Risks and constraints

- 主监督拥有 index、refs、branch/worktree topology、remote、集成、browser、dev server、Playwright、Pages/dist、standard perf、heavy-geo、scenario-data、`.runtime` output locks 与最终验收。
- 当前执行 worktree 保持未暂存；用户 WIP、其他 worktree 与 archive 文档改动保持原样。
- baseline 测量值只接受 `npm run perf:baseline` 的真实输出；生成与 gate 由单一 live-test owner 串行执行。
- A、B、C 的状态只能由已落盘的精确证据推进。
