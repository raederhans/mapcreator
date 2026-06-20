# Render Transaction Stability Task

## Checklist

- [x] Create isolated worktree from `origin/main`.
- [x] Create active task docs and initialize QA matrix.
- [x] Implement worker identity generation roundtrip.
- [x] Implement optional/Atlantropa data-generation transaction semantics.
- [x] Review visible-frame continuity guardrails.
- [x] Review interaction composite/HGO preview amplifier boundaries.
- [x] Run targeted verification.
- [x] Run independent code review and architecture review.
- [x] Update registry delivery package.
- [x] Prepare merge/push/cleanup handoff after validation.

## Delivery Package Draft

1. Changes:
   - Political raster worker now preserves `sceneGeneration` and `scenarioDataGeneration` in worker replies.
   - Visible optional chunk payload changes now produce `renderVisibleChangedLayerKeys` from the shared scenario visibility helper.
   - Optional-only visible chunk promotions now bump `scenarioDataGeneration` and refresh through the existing chunk promotion refresh plan.
   - The old Atlantropa-only promotion refresh helper was replaced by the generic render-visible optional helper.
   - `strategicvalues` chunk changes now map to political, context marker, and label refresh passes.
   - Regression coverage now includes worker identity roundtrip, Atlantropa-only visible promotion, strategicvalues visible promotion, and hidden optional promotion.
2. Files:
   - Core: `js/core/scenario/chunk_runtime.js`, `js/core/scenario_resources.js`, `js/core/map_renderer/scenario_refresh_plans.js`, `js/workers/political_raster.worker.js`
   - Tests: `tests/political_raster_worker_packet_behavior.test.mjs`, `tests/scenario_chunk_contracts.test.mjs`, `tests/scenario_refresh_plans_behavior.test.mjs`
   - Dist: `dist/app/js/core/scenario/chunk_runtime.js`, `dist/app/js/core/scenario_resources.js`, `dist/app/js/core/map_renderer/scenario_refresh_plans.js`, `dist/app/js/workers/political_raster.worker.js`, `dist/pages-dist-manifest.json`
   - Docs: `docs/active/_worktree_registry.md`, `docs/active/render-transaction-stability/*` during execution, then archived under `docs/archive/render-transaction-stability-20260620/*` during closeout.
3. Diff summary: 13 tracked code/dist/test files changed plus task docs before final archive closeout.
4. Commit status: ready to commit after final status/diff check.
5. Base/main divergence: base is `origin/main@d3671ca5`; branch created from current `origin/main`.
6. Potential conflicts: `js/core/scenario/chunk_runtime.js`, `js/core/scenario_resources.js`, `js/core/map_renderer/scenario_refresh_plans.js`, matching dist mirrors, and registry docs.
7. Validation:
   - PASS `npm run test:node:political-raster-worker-packet` (3/3)
   - PASS `node --test tests/scenario_chunk_contracts.test.mjs` (51/51)
   - PASS `py -3 -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_render_cache_owner_boundary_contract tests.test_runtime_hooks_boundary_contract` (44/44)
   - PASS `py -3 -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_scenario_resources_boundary_contract` (53/53)
   - PASS `npm run test:node:scenario-refresh-plans` (5/5)
   - PASS `npm run test:node:scenario-chunk-promotion-helpers`
   - PASS `npm run verify:pages-dist`
   - PASS `node --check js/core/scenario/chunk_runtime.js js/core/scenario_resources.js js/core/map_renderer/scenario_refresh_plans.js`
   - PASS `node --check js/workers/political_raster.worker.js`
   - PASS `git diff --check`
8. Unverified risks: no browser smoke was run; current evidence is code-level and dist-level because the change is transaction semantics, not layout. LSP diagnostics are unavailable in this session; JS syntax checks and targeted behavior tests cover the changed files.
9. Recommended integration: fast-forward/push from this feature worktree while preserving parent checkout WIP.
10. Integration readiness: ready; architect re-review is CLEAR, code-simplifier PASS, code-reviewer has no code findings, and the stale delivery package note was refreshed.
