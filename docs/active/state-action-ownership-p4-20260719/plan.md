# P4 Global State Action Ownership Plan

## Goal

保留全局 `state` 兼容 facade 和根形状，把写入权逐步收敛到 `js/core/state/actions/` 下的显式 domain actions；每个 action 接收显式 target，只修改登记键，DOM、渲染、调度、指标、bus、持久化和恢复副作用继续留在 composition root。

## Scope

- P4.0：建立 binding-scoped writer/key/alias policy、fail-closed mutation scanner、基线分母和验证路由。
- P4.1：迁移 boot/startup mutations。
- P4.2a：迁移 scenario readiness/activation/rollback mutations，锁定 `prepare → commit → publish → rollback`。
- P4.2b：迁移 scenario chunk、promotion、generation、error mutations，并锁定跨 apply ownership 的 continuation fencing。
- P4.2c：迁移 scenario hydration/data-health/performance-hint mutations。
- P4.3：迁移 renderer phase、interaction、cache、diagnostics mutations。
- P4.4：在 appearance/transport 平台化前置验收后，串行迁移 UI、appearance、transport、strategic mutations。
- P4.5a/P4.5b：先锁定 hook oracle，再实现 multi-subscriber notification、single-owner handler 与 legacy single-slot 兼容。
- Closeout：达到报告绑定的 writer/membership burn-down 目标，完成全量验证、review、UltraQA、main 集成、推送和清理。

## Sources of truth

- 当前代码与 Git/worktree 事实。
- `.omx/plans/consensus-plan-global-state-action-ownership-p4.md` 的 Revision 3 acceptance matrix。
- `.omx/plans/test-spec-global-state-action-ownership-p4.md`。
- `tools/eslint-rules/state-writer-allowlist.json` 作为 P4.0 前兼容投影。
- 提交的 `tools/state_writer_policy.json` P4.0 基线与 exact-SHA `.runtime/reports/generated/p4-state-actions/P4.0/policy-report.json` attestation 共同作为后续量化真源。

## Stages

- [x] P4.0 Writer policy foundation
- [x] P4.1 Boot/startup actions
- [x] P4.2a Scenario readiness and atomic activation actions
- [x] P4.2b Scenario chunk and promotion actions
- [x] P4.2c Scenario health and presentation-hint actions
- [ ] P4.3 Renderer actions
- [ ] P4.4 UI/appearance/transport/strategic actions
- [ ] P4.5 Hook semantics
- [ ] Closeout, integration, push, and cleanup

## Acceptance criteria

- P4.0 tracked `js/**` diff 为零，legacy allowlist 等于 policy 的 `legacy-direct` 投影。
- Acorn AST scanner 绑定真实 state alias，覆盖 nested/destructuring/update/delete/Object.define*/Reflect/collection mutation，并对语法错误、未知 executable mutation 和未知 authority fail closed。
- Comments/strings 产生零 finding；unknown writers/keys/sites 和 default-key collisions 为零。
- P4.0 报告固定 production/test writers、legacy-direct、legacy-target、allowed-key membership 和 dynamic-site 分母。
- P4.1–P4.5 每阶段 legacy authority 单调不增。
- Production legacy-direct writers 最终 `<=54`；legacy-direct + legacy-target unique membership 最终 `<=80%` P4.0 基线。
- Actions 只位于 `js/core/state/actions/`，`*_state.js` 只保留 defaults/read/normalization 和移除期 compatibility re-export。
- `RendererRuntimeContext` 始终保持 read-only。
- `index.html`、`css/style.css`、`js/ui/toolbar.js` 只允许主线程串行修改。
- 每阶段通过 named verification、adaptive zero-gap、exact-SHA checkpoint/attestation 和 registry/task truth。

## Non-goals

- 引入新 store、Proxy、immutable-state rewrite 或 runtime dependency。
- 改变 state 根形状、用户可见交互、renderer public facade 或 scenario 数据合同。
- 创建全域通用 action owner。
- 把 DOM、render scheduling、metrics、bus 或 persistence effects 放入 actions。
- 在 P4.0 迁移任何产品 state mutation。

## Risks and constraints

- Parent checkout 含审计、performance、archive cleanup WIP，必须保持原样。
- P4.4 与 appearance/transport 平台化共享热点；共享文件采用单 writer 串行策略。
- Browser、ports、dist、`.runtime`、perf、scenario-data 和 heavy-geo 由主线程 live-test owner 独占。
- P4.0 使用 pinned dev-only Acorn 解析 JavaScript grammar/scope，并由仓库 policy 负责 mutation classification、binding locator 与 authority。
- 任何 tracked 修正都会创建新的候选 SHA，并触发对应阶段 acceptance matrix 全量重跑。
