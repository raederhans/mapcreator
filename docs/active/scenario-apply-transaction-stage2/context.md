# Scenario Apply Transaction Ownership Stage 2 Context

## 2026-06-21 Baseline

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-scenario-apply-transaction-stage2`
- Branch: `codex/scenario-apply-transaction-stage2`
- Base commit: `29c008f73348752ced55ebd56f916d734b86e37e`
- Parent checkout: `C:\Users\raede\Desktop\dev\mapcreator` on clean `main@29c008f73348752ced55ebd56f916d734b86e37e`
- Existing worktrees: parent main plus this stage2 worktree.
- First-stage diagnostics: available through `__scenarioForgeRenderTransactions`, warning codes including `scenario-apply-inflight-target-mismatch`, `render-snapshot-scenario-mismatch`, `visible-required-layer-missing`, and `render-reuse-across-data-generation`.
- Live process owner: main Codex agent. Subagents may do static mapping/review only; they must not run or monitor live tests, dev server, browser smoke, Pages dist, or long builds.

## Current Constraints

- Stage boundary: repair scenario apply transaction ownership and stale async callback fences only.
- Preserve chunk selection, color fallback, Atlantropa layer loading, render budget hints, and renderer backend defaults.
- Request/epoch identity must belong to the concrete apply request, then flow into delayed diagnostics. Lessons learned warn that delayed records reading global latest epoch can drift into the next scenario.

## Initial Evidence To Collect

- Apply entry and active promise handling in `scenario_manager.js`.
- Pipeline stage commit points in `scenario_apply_pipeline.js`.
- Post-apply effect and UI/data-health callbacks in `scenario_post_apply_effects.js`.
- Chunk prewarm, payload commit, promotion, rollback, and render refresh fences in `chunk_runtime.js`.
- Optional layer sync behavior in `scenario_resources.js`.
- Diagnostics snapshot and warning contracts in `render_transaction_diagnostics.js`.

## 2026-06-21 Implementation Evidence

- Root bug: `js/core/scenario_manager.js` returned `activeScenarioApplyPromise` for every in-flight apply request, including different target scenario ids.
- Ownership fix shape: add a request id, keep same-target reuse, queue a single latest different-target request, and drain it after the active request settles unless fatal recovery is locked.
- Stale write surfaces to fence: `scenario_post_apply_effects.js` post-frame/detail prewarm, coarse prewarm refresh scheduling, optional layer sync; `scenario_resources.js` optional layer payload application; `scenario/chunk_runtime.js` chunk refresh timers, post-commit replay, pending promotion, and political chunk payload writes.
- Existing chunk selection checks already use `selectionVersion` and scenario id; this phase will extend identity with request id without changing chunk selection inputs.

## 2026-06-21 Validation Evidence

- Syntax checks passed for `scenario_manager.js`, `scenario_post_apply_effects.js`, `scenario/chunk_runtime.js`, `renderer/render_transaction_diagnostics.js`, `scenario_resources.js`, and `scenario_apply_pipeline.js`.
- Targeted Node tests passed: `scenario-apply-transaction-ownership`, `render-transaction-diagnostics`, `scenario-runtime-state-behavior`, `scenario-lifecycle-runtime-behavior`, `scenario-chunk-contracts`, and `scenario_optional_layers_behavior`.
- Python boundary contracts passed for `tests.test_scenario_resources_boundary_contract` and `tests.test_scenario_manager_boundary_contract`.
- Browser E2E passed: `npm run test:e2e:scenario-apply-concurrency`.
- Runtime sampling passed and wrote `.runtime/output/render-diagnostics/stage2-scenario-switch-transaction.json`.
- Pages dist verification passed: build, 38 startup shell tests, and 8 landing showcase tests.
- `git diff --check` passed with line-ending warnings only.
- Final focused E2E includes the reviewed edge case where queued `blank_base` starts draining, `modern_world` arrives before commit, and `blank_base` records `scenario-apply-stale-callback-skipped` at `callbackPhase=commit-start` instead of committing.
- Follow-up review finding fixed: stale commit-start now restores the pre-apply rollback snapshot to clear prepare-time palette/detail runtime writes before returning.

## 2026-06-21 Runtime Sample Summary

- Sample chain: `tno_1962` active request 1, queued `hoi4_1936` request 2, latest queued `modern_world` request 3.
- Diagnostics warning: `scenario-apply-inflight-target-mismatch` recorded for `hoi4_1936` and `modern_world` with `resolution: queued-latest-request`.
- Queue snapshots show `hoi4_1936` skipped with `resolution: replaced-by-latest-request`.
- Stale callback snapshot recorded for `tno_1962` request 1 at `callbackPhase=commit-start` with `resolution: skipped-stale-request`.
- Stale rollback snapshot recorded for `tno_1962` request 1 at `callbackPhase=commit-start` with `resolution: restored-rollback-snapshot`.
- Final runtime identity: `activeScenarioId=modern_world`, `activeScenarioManifestId=modern_world`, `scenarioApplyInFlight=false`.
- Phase 3 evidence from the same sample: repeated `resolved-colors-empty-with-land`, `visible-required-layer-missing` for `water` and `scenario_atlantropa`, and `political-visible-subset-empty-with-required-chunks`.
- Sampling console output included one resource `401 Unauthorized` message; page errors were empty and the transaction chain completed.
- Final code-review follow-up returned CLEAR after stale commit-start rollback repair.
- Integration note: parent `C:\Users\raede\Desktop\dev\mapcreator` checkout contains unrelated docs WIP; use an isolated integration worktree to preserve it.
- No live process currently active; main Codex agent remains the only owner for future tests/builds.
