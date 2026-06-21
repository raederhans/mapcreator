# Scenario Apply Transaction Ownership Stage 2 Task

## 当前阶段

integrated。实现、目标验证、Pages dist、runtime diagnostics 采样、code-review follow-up、post-merge spot checks 已完成；review 发现的 middle queued request 抢 commit 与 prepare-time runtime 写入残留风险均已补测试和诊断证据。

## 已完成

- 已创建独立 worktree `C:\Users\raede\.codex\worktrees\mapcreator-scenario-apply-transaction-stage2`，branch `codex/scenario-apply-transaction-stage2`。
- 已实现 scenario apply request ownership：same-target reuse、different-target latest queue、A->B->C last-request-wins、fatal recovery lock。
- 已给 post-apply、detail/coarse prewarm、optional layer sync、chunk refresh/promotion、political chunk payload write 增加 request/currentness fence。
- 已扩展 diagnostics：request id、scenarioApplyEpoch、queued target、drain start/skip/complete、stale callback skip、target committed。
- 已同步 `dist/app` 和 Pages manifest。

## 交付包

1. 改动说明

- `applyScenarioById` 不再把不同 target 的 in-flight 请求静默复用为旧 promise；不同 target 进入 latest-request-wins 队列。
- 同一 target 请求继续复用 active promise，并记录 `scenario-apply-reused-active-target`。
- 旧 request 的 delayed post-apply/prewarm/optional layer/chunk callback 会记录 `scenario-apply-stale-callback-skipped` 并退出；commit-start 前发现 stale 时会恢复 rollback snapshot，清掉 prepare-time palette/detail 写入。
- chunk runtime 继续保留现有 selectionVersion/scenario id 逻辑，只把 scenario apply request id 加入 currentness 判断。
- E2E/runtime 采样能看到 A->B->C 的 queued、replaced、stale commit skip、rollback restored、drained、target committed 链路。

2. 文件分组

- 核心文件：`js/core/scenario_manager.js`、`js/core/scenario_apply_pipeline.js`、`js/core/scenario_post_apply_effects.js`、`js/core/scenario/chunk_runtime.js`、`js/core/scenario_resources.js`。
- 测试文件：`tests/scenario_apply_transaction_ownership.test.mjs`、`tests/e2e/scenario_apply_concurrency.spec.js`、`tests/render_transaction_diagnostics_behavior.test.mjs`、`tests/scenario_chunk_contracts.test.mjs`、`tests/scenario_optional_layers_behavior.test.mjs`、`tests/test_scenario_manager_boundary_contract.py`、`tests/test_scenario_resources_boundary_contract.py`。
- 文档文件：`docs/active/scenario-apply-transaction-stage2/{plan,context,task}.md`、`docs/active/_worktree_registry.md`。
- Pages dist：`dist/app/js/core/scenario*.js` mirrors and `dist/pages-dist-manifest.json`.
- 临时文件：一次性 Playwright probe 已删除；保留采样输出 `.runtime/output/render-diagnostics/stage2-scenario-switch-transaction.json`。

3. Diff 摘要

- `20 files changed, 2354 insertions(+), 171 deletions(-)` before including untracked task docs and new focused test in `git diff --stat` output.
- Source and dist mirrors changed together.
- `package.json` adds `test:node:scenario-apply-transaction-ownership`.

4. Commit 状态

- Feature commit: `c98c65da`.
- Closeout commit: pending at this document update.

5. Base 与 main 分叉状态

- Base commit: `29c008f73348752ced55ebd56f916d734b86e37e`.
- Worktree branch created from current main at the same commit. Integration 前会重新 fetch/update main 并确认是否分叉。

6. 潜在冲突

- 路径重叠检查：当前只有 parent main 和本 stage2 worktree 两个 active worktree。
- 风险评级：黄色。改动触及 scenario manager、chunk runtime、post-apply effects、scenario resources、Pages dist 等共享热点文件，但当前没有另一个 active implementation worktree 修改这些文件。

7. 已运行验证

- `node --check js/core/scenario_manager.js`
- `node --check js/core/scenario_post_apply_effects.js`
- `node --check js/core/scenario/chunk_runtime.js`
- `node --check js/core/renderer/render_transaction_diagnostics.js`
- `node --check js/core/scenario_resources.js`
- `node --check js/core/scenario_apply_pipeline.js`
- `npm run test:node:scenario-apply-transaction-ownership`
- `npm run test:node:render-transaction-diagnostics`
- `npm run test:node:scenario-runtime-state-behavior`
- `npm run test:node:scenario-lifecycle-runtime-behavior`
- `npm run test:node:scenario-chunk-contracts`
- `node --test tests/scenario_optional_layers_behavior.test.mjs`
- `npm run python -- -m unittest tests.test_scenario_resources_boundary_contract tests.test_scenario_manager_boundary_contract -q`
- `npm run test:e2e:scenario-apply-concurrency`
- Runtime diagnostics sample via temporary Playwright probe, saved to `.runtime/output/render-diagnostics/stage2-scenario-switch-transaction.json`.
- `npm run verify:pages-dist`
- `git diff --check`

9. Review finding fixed

- High-risk review finding 1: once a middle queued request starts draining, a later request could arrive before the middle request commits; the middle request could still look current and commit.
- Fix: `isScenarioApplyRequestCurrent` now treats `latestScenarioApplyTargetId` as part of currentness, and `runScenarioApplyRequest` adds a `commit-start` stale fence before `applyPreparedScenarioState`.
- Coverage: `tests/e2e/scenario_apply_concurrency.spec.js` now waits for the middle queued request to start, then requests a later scenario and asserts the middle scenario never records `scenario-apply-target-committed`.
- High-risk review finding 2: stale `prepareScenarioApplyState` could write palette/detail runtime before the commit-start fence.
- Fix: stale `commit-start` now calls `restoreScenarioApplyRollbackSnapshot(rollbackSnapshot)`, then `runPostRollbackRestoreEffects({ renderNow })`, and records `scenario-apply-stale-rollback-complete`.
- Coverage: `tests/scenario_apply_transaction_ownership.test.mjs` locks the stale commit-start rollback path, and refreshed runtime sampling records `scenario-apply-stale-rollback-complete` before the latest request drains.

10. 尚未验证风险

- Full browser visual sweep remains out of scope for this phase.
- Phase 3 should use the cleaner transaction diagnostics to investigate color/zoom political layer visibility.
- Phase 4 should separately investigate Atlantropa/required semantic layer coverage.

11. 推荐下一步

- Push closeout to `origin/main`，then cleanup temporary integration and feature worktrees.

12. 可否整合

- 当前状态：integrated in clean integration worktree。code-review follow-up returned CLEAR。
