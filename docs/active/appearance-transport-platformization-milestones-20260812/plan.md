# Appearance / Transport Platformization Milestones

## Goal

按 `A → B → C` 顺序把现有状态所有权候选收敛为正式准入的主线基础，再交付范围受控的 Appearance / Transport 用户操作生命周期。

## Scope

- A：以 review-fix source commit `21bfb35aeaa18ba1b35723f2f1972ce2e07a7f92` 及其 coordination descendant 为候选源，完成 P4.3 renderer actions 的 policy、performance、routes 与正式准入。
- B：以 A 的 `A_ADMITTED_SHA` 为唯一基线，从 `65335370c50279c19c9074362567f9d2284e0c39` lineage 按职责重放并准入 P4.4 Appearance、UI、Transport、Strategic 与 Special Zone actions；P4.5 notification fanout 保持独立。
- C：以 B 的 `B_ADMITTED_SHA` 为唯一基线，交付统一操作生命周期、首个 Appearance / Transport versioned change-set，以及可恢复的 Demo 任务链。

## Sources of truth

- 当前代码、Git/worktree 事实、同一候选 SHA 的门禁产物与主监督验收结论。
- 既有 P4 技术记录：[`../state-action-ownership-p4-20260719/plan.md`](../state-action-ownership-p4-20260719/plan.md)、[`context.md`](../state-action-ownership-p4-20260719/context.md)、[`task.md`](../state-action-ownership-p4-20260719/task.md)。
- 本目录只保存跨里程碑状态、精确 SHA、交接与门禁摘要；P4 技术细节继续由既有记录和代码承载。

## Stages

- [ ] A — P4.3 Admission Pack：review fixes committed；new exact checkpoint 与 final live gates pending；`A_ADMITTED_SHA` pending。
- [ ] B — P4.4 Replay and Admission Pack：blocked on `A_ADMITTED_SHA`，recovery source `65335370c50279c19c9074362567f9d2284e0c39`。
- [ ] C — Appearance / Transport user-visible milestone：blocked on `B_ADMITTED_SHA`。

## Acceptance criteria

- A：P4.3 renderer/action ownership 与代码、policy、routes、tests、文档一致；canonical baseline 由标准命令生成 schema 3 JSON/Markdown；Node、Python、policy、routes、browser、Pages/dist、core main-thread、standard perf 与独立 review 绑定正式候选 SHA。
- B：只重放 P4.4 职责提交；共享 UI 文件由主监督串行处理；exact P4.4、Appearance/Transport browser、heavy-geo/data、Pages/dist、core main-thread、standard perf 与独立 review 绑定正式候选 SHA。
- C：用户操作阶段为 `Preparing → Applying → Rendering → Ready / Recoverable error`；首个 change-set 覆盖 Appearance 与 Transport 的 Preview / Compare / Apply / Undo；Demo 任务链覆盖 `sample → Guide → edit → export → restore`。
- 每个里程碑只有主监督可以写入对应 `*_ADMITTED_SHA`，并在写入前核对 Git、门禁产物和集成状态。

## Non-goals

- A 不修改 `index.html`、`css/style.css`、`js/ui/toolbar.js`，不改用户可见行为。
- B 不包含 P4.5 hooks，也不扩展 C 的产品范围。
- C 不提升 thematic 的 `catalog_only` 状态，不扩展 Cloud Saves 的发布语义。

## Risks and constraints

- 主监督拥有 index、refs、branch/worktree topology、remote、集成、browser、dev server、Playwright、Pages/dist、standard perf、heavy-geo、scenario-data、`.runtime` output locks 与最终验收。
- 当前执行 worktree 保持未暂存；用户 WIP、其他 worktree 与 archive 文档改动保持原样。
- baseline 测量值只接受 `npm run perf:baseline` 的真实输出；生成与 gate 由单一 live-test owner 串行执行。
- A、B、C 的状态只能由已落盘的精确证据推进。
