# Task Checklist

- [x] Load required skills and project rules.
- [x] Preserve parent checkout WIP by creating isolated worktree from `origin/main`.
- [x] Create Ultragoal plan and active Codex goal.
- [x] Read lessons learned and active registry.
- [x] Update active worktree registry for this stage.
- [x] Complete G001: runtime sampling and warning classification.
- [x] Complete G002: political payload stable-frame readiness fix if evidence requires it.
- [x] Complete G003: resolved color stable-frame readiness fix if evidence requires it.
- [x] Complete G004: visible-frame reuse generation fix if evidence requires it.
- [x] Complete G005: preserve non-goals, run final verification, independent review, delivery package.

## Validation Queue

- `node --check js/core/map_renderer.js`
- `node --check js/core/scenario/chunk_runtime.js`
- `node --check js/core/scenario_post_apply_effects.js`
- `node --check js/core/renderer/render_transaction_diagnostics.js`
- `npm run test:node:render-transaction-diagnostics`
- `npm run test:node:scenario-apply-transaction-ownership`
- `npm run test:node:scenario-runtime-state-behavior`
- `npm run test:node:renderer-runtime-state-behavior`
- `npm run test:node:scenario-chunk-contracts`
- `npm run verify:pages-dist`
- `npm run test:e2e:scenario-apply-concurrency`
- `npm run test:e2e:dev:scenario-chunk-runtime`
- `git diff --check`
- Runtime/browser sampling for `/app/?render_diag=1&perf_overlay=1&runtime_chunk_perf=1`

## Delivery Package Draft

1. Changed stable-frame diagnostics so known early apply/chunk phases are marked transient and stable readiness checks remain explicit.
2. Added stable visible-frame resolved color readiness before draw when land features exist but resolved colors are empty.
3. Separated lifecycle pending color edit resets from fill-path missing render proof warnings.
4. Added exact-after-settle abort recovery for interrupted or identity-mismatched pre-paint work so `deferExactAfterSettle` cannot strand an idle frame.
5. Added source identity to stable visible-frame color readiness retries so `landData` to `landDataFull` swaps can rebuild colors.

## Files Changed

Core files:
- `js/core/renderer/render_transaction_diagnostics.js`
- `js/core/map_renderer.js`
- `js/core/map_renderer/exact_after_settle_scheduler.js`

Tests:
- `tests/render_transaction_diagnostics_behavior.test.mjs`
- `tests/scenario_chunk_contracts.test.mjs`
- `tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js`

Docs:
- `docs/active/_worktree_registry.md`
- `docs/active/stage3-political-color-readiness/plan.md`
- `docs/active/stage3-political-color-readiness/context.md`
- `docs/active/stage3-political-color-readiness/task.md`

Generated mirrors:
- `dist/app/js/core/map_renderer.js`
- `dist/app/js/core/renderer/render_transaction_diagnostics.js`
- `dist/app/js/core/map_renderer/exact_after_settle_scheduler.js`
- `dist/pages-dist-manifest.json`

Runtime evidence, ignored by git:
- `.runtime/output/render-diagnostics/stage3-political-color-readiness.json`
- `.runtime/tmp/stage3_collect_render_diagnostics.cjs`

## Final Validation Results

- `node --check js/core/map_renderer.js`: passed.
- `node --check js/core/map_renderer/exact_after_settle_scheduler.js`: passed.
- `node --check js/core/scenario/chunk_runtime.js`: passed.
- `node --check js/core/scenario_post_apply_effects.js`: passed.
- `node --check js/core/renderer/render_transaction_diagnostics.js`: passed.
- `node --check js/core/scenario/scenario_renderer_bridge.js`: passed.
- `node --check tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js`: passed.
- `npm run test:node:render-transaction-diagnostics`: 16/16 passed.
- `npm run test:node:scenario-apply-transaction-ownership`: 3/3 passed.
- `npm run test:node:scenario-runtime-state-behavior`: 6/6 passed.
- `npm run test:node:renderer-runtime-state-behavior`: 10/10 passed.
- `npm run test:node:scenario-chunk-contracts`: 55/55 passed.
- `npm run test:e2e:scenario-apply-concurrency`: 1/1 passed.
- `npm run test:e2e:dev:scenario-chunk-runtime`: 8/8 passed.
- `npm run verify:pages-dist`: dist build, startup shell 38/38, landing showcase 8/8 passed.
- Runtime/browser sampling: `stableCoreStage3WarningCount=0`, `stableDeferredStage4WarningCount=2`.
- Independent code review: approve-with-notes, no must-fix findings.
- Independent architecture review: initial BLOCK on color source identity and exact-after-settle re-arm; both blocker fixes landed and targeted tests passed.

## Integration Notes

- Current worktree is ready for final `git diff --check`, commit, and push.
- Base commit: `origin/main@b2f3a97ef073bf5cc4c7743ede3ea079f0530471`.
- Parent checkout remains dirty with unrelated docs WIP and should not be used for implementation.
- Direct file-overlap risk is yellow: renderer diagnostics, map renderer, exact-after-settle scheduler, E2E and scenario chunk contracts are shared hot paths.
- Recommended integration path: commit this branch after final `git diff --check`; if `origin/main` has not advanced, push this commit directly to `origin/main` from the clean worktree.
- Deferred finding for Phase 4: final runtime sampling still reports 2 stable `visible-required-layer-missing` warnings for `relief` at `visible-frame-committed`; water and scenario_atlantropa were transient in the final sample.
