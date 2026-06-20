# Render Chain Slimming V2 Task

## Checklist

- [x] Create isolated worktree.
- [x] Create active task documentation.
- [x] Update worktree registry.
- [x] Run baseline targeted tests.
- [x] Add behavior-lock tests for FrameGraph execution bridge.
- [x] Add visual invalidation executor tests.
- [x] Implement FrameGraph execution bridge.
- [x] Implement and connect visual invalidation executor.
- [x] Tighten architecture boundary contracts and budgets.
- [x] Run full validation set.
- [x] Run final review / bug check / first-principles self-audit.
- [x] Prepare integration-ready delivery package.

## Expected Changed Files

Core:
- `js/core/map_renderer/scenario_refresh_plans.js`
- `js/core/map_renderer/scenario_refresh_runtime.js`
- `js/core/map_renderer/scenario_visual_invalidation_executor.js`
- `js/core/map_renderer/exact_after_settle_scheduler.js`
- `js/core/map_renderer/exact_after_settle_refresh_plans.js`

Tests and contracts:
- `tests/scenario_refresh_plans_behavior.test.mjs`
- `tests/scenario_visual_invalidation_executor_behavior.test.mjs`
- `tests/exact_after_settle_refresh_plans_behavior.test.mjs`
- `tests/test_scenario_chunk_refresh_contracts.py`
- `tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`
- `tools/check_architecture_boundaries.mjs`

Docs:
- `docs/active/render-chain-slimming-v2/plan.md`
- `docs/active/render-chain-slimming-v2/context.md`
- `docs/active/render-chain-slimming-v2/task.md`
- `docs/active/_worktree_registry.md`

## Delivery Package

1. Changes made:
   - Added a single FrameGraph invalidation execution bridge in
     `scenario_refresh_plans.js`.
   - Added `scenario_visual_invalidation_executor.js` for renderer side
     effects: clear, invalidate, overlay, extent, and render.
   - Slimmed `scenario_refresh_runtime.js` so chunk-promotion visual
     invalidation calls the executor while runtime sequencing stays local.
   - Moved exact-after-settle pass-definition selection through a local helper
     without changing scheduling fields or algorithms.
   - Tightened architecture/static contracts and regenerated Pages dist.
2. File groups:
   - Core files: `js/core/map_renderer/scenario_refresh_plans.js`,
     `js/core/map_renderer/scenario_refresh_runtime.js`,
     `js/core/map_renderer/scenario_visual_invalidation_executor.js`,
     `js/core/map_renderer/exact_after_settle_refresh_plans.js`,
     `js/core/map_renderer/exact_after_settle_scheduler.js`,
     `js/core/renderer/scenario_chunk_promotion_helpers.js`.
   - Test files: `tests/scenario_refresh_plans_behavior.test.mjs`,
     `tests/scenario_visual_invalidation_executor_behavior.test.mjs`,
     `tests/exact_after_settle_refresh_plans_behavior.test.mjs`,
     `tests/scenario_chunk_contracts.test.mjs`,
     `tests/test_scenario_chunk_refresh_contracts.py`,
     `tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`.
   - Tooling/dist files: `tools/check_architecture_boundaries.mjs`,
     `package.json`, `dist/app/js/core/map_renderer/*`,
     `dist/app/js/core/renderer/scenario_chunk_promotion_helpers.js`,
     `dist/pages-dist-manifest.json`.
   - Docs: this task folder and `docs/active/_worktree_registry.md`.
   - Temporary files: validation logs only under `.runtime/`; none staged.
3. Diff summary:
   - Runtime lost inline visual invalidation execution and gained executor
     routing.
   - Plans gained the compatibility bridge while legacy pass fields remain for
     one observation phase.
   - Exact-after-settle gained a small pass-definition filter helper.
   - New tests lock explicit resources, explicit empty resources, fallback
     passes, executor call order, `suppressRender`, fail-fast deps, and static
     import boundaries.
4. Commit status:
   - Ready to commit on `codex/render-chain-slimming-v2`.
5. Base/main divergence:
   - Base: `origin/main@5351c25d2a0dd951fb69da91be4a10263844febd`.
   - At validation time, the feature branch was still based on the same commit
     as `main`; re-check before final merge.
6. Conflict scan:
   - Current direct overlap risk is limited to this worktree. Hot files are the
     renderer refresh-chain files and Pages dist mirrors.
7. Validation:
   - Passed `npm run test:node:scenario-refresh-plans`.
   - Passed `npm run test:node:scenario-chunk-promotion-helpers`.
   - Passed `npm run test:node:exact-after-settle-refresh-plans`.
   - Passed `npm run test:node:renderer-runtime-state-behavior`.
   - Passed `npm run test:node:scenario-chunk-contracts`.
   - Passed `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_render_pipeline_passes_boundary_contract -q`.
   - Passed `npm run verify:architecture-boundaries`.
   - Passed `npm run verify:test-import-graph`.
   - Passed `npm run verify:pages-dist`.
   - Passed `git diff --check`.
8. Remaining risks:
   - Browser inspection, HGO LOD changes, exact scheduling changes, and full
     legacy pass-field deletion are outside this phase.
9. Recommended next step:
   - Commit this worktree, fast-forward merge into `main`, run post-merge
     focused checks, archive this task folder, push, then remove the worktree.
10. Integration verdict:
   - This branch is integration-ready after the final commit.
