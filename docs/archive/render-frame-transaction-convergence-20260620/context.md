# Render Frame Transaction Convergence Context

## 2026-06-20 Intake

- Parent checkout: `C:\Users\raede\Desktop\dev\mapcreator`, `main@07eecef3`, `origin/main@07eecef3`, dirty unrelated `data/locales.json`.
- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-frame-transaction`, branch `frame-transaction-convergence`, base `main@07eecef3`.
- Live process owner: main agent owns all tests/builds/Pages dist. Subagents are static only.
- Loaded skills: `ultrawork` for parallel execution discipline, `ralph` for completion audit discipline.
- Read `lessons learned.md`; relevant rules are render pass single lifecycle, progressive cache generation binding, source/dist sync, worktree registry accuracy, and one owner for long tests.

## Initial Findings

- `map_renderer.js` already has `getVisibleFrameIdentity`, `recordVisibleFrameTransactionMetric`, `captureLastGoodFrame`, `drawLastGoodFrameFallback`, `markFirstVisibleFramePainted`, partial repaint baseline checks, and progressive full-cache ready repaint request.
- `scenario_refresh_plans.js` already owns pure targetPasses mapping and is the right place to add `FrameGraphInvalidation`.
- `scenario_chunk_promotion_helpers.js` already owns promotion metric helpers and is the right place to add draw subset normalization.
- Existing tests are string-contract heavy; implementation should preserve existing snippets and add targeted behavior tests where possible.

## Implementation Notes

- Added `CommittedFrameIdentity` helpers in `map_renderer.js`; visible transaction metrics, last-good capture/reject/reuse, and first-visible commit now share the same stable `commitKey`.
- Added required semantic resolver in `scenario_chunk_manager.js` and passed it through chunk runtime creation. `tno_1962` defaults to `scenario_atlantropa` and `water`; manifest `required_semantic_layers` can override or extend.
- Added `FrameGraphInvalidation` and target resource mapping in `scenario_refresh_plans.js` while preserving legacy `renderer.targetPasses` compatibility.
- Added `DrawSubsetIndex` helper in `scenario_chunk_promotion_helpers.js` for empty, duplicate, unknown/out-of-range, and generation-currentness cases.
- Review fix: `FrameGraphInvalidation` now survives `normalizeRendererRefreshPlan()` and is consumed by `scenario_refresh_runtime.js` for target passes plus last-good/reference/interaction/border/water invalidation signals.
- Review fix: `DrawSubsetIndex` rejects all indexes for chunks with a known feature count of zero while still allowing indexes for chunks whose counts are not provided.
- Synchronized all touched source JS files to matching `dist/app` mirrors and refreshed `dist/pages-dist-manifest.json`.
- Architecture line budget for `js/core/map_renderer.js` was raised from `23450` to `24100` after user direction; current file is about `24051` lines, and the gate still enforces a tight budget.

## Verification Evidence

- `npm run test:node:scenario-refresh-plans` passed: 7/7.
- `npm run test:node:scenario-chunk-promotion-helpers` passed: 7/7.
- `npm run test:node:renderer-runtime-state-behavior` passed: 10/10.
- `npm run test:node:scenario-chunk-contracts` passed: 54/54.
- `npm run test:node:political-raster-worker-packet` passed: 5/5.
- `npm run python -- -m unittest tests.test_map_renderer_political_collection_boundary_contract tests.test_map_renderer_render_cache_owner_boundary_contract tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_scenario_renderer_bridge_boundary_contract -q` passed: 14/14.
- `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_scenario_renderer_bridge_boundary_contract -q` passed: 39/39.
- `npm run verify:architecture-boundaries` passed.
- `npm run verify:dist-drift` passed after staging generated dist.
- `git diff --check` passed.

## Closeout

- Functional commit `be9acb74` was fast-forwarded into `main` and pushed to `origin/main`.
- The feature worktree `C:\Users\raede\Desktop\dev\mapcreator-frame-transaction` and local branch `frame-transaction-convergence` were removed after merge.
- Post-merge `main` validation passed `npm run verify:architecture-boundaries` and `git diff --check`.
- Parent checkout `npm run verify:dist-drift` was polluted by the existing dirty `data/locales.json` and changed generated ignored file sizes; `dist/pages-dist-manifest.json` was restored, and the same command passed in the clean feature worktree at the same commit `be9acb74`.
- Parent checkout final expected dirty state is only `data/locales.json`.
