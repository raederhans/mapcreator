# Render Chain Slimming V6 Task

## Checklist

- [x] Create isolated V6 worktree from `origin/main@a3e4f8a0`.
- [x] Create active docs.
- [x] Update worktree registry.
- [x] Start two-step repo evidence audit.
- [x] Finalize minimal implementation plan after static subagent returns.
- [x] Implement executor API pass-language retirement.
- [x] Update tests and static contracts.
- [x] Refresh Pages dist output if source/dist mirrors change.
- [x] Run final verification suite.
- [x] Run final review and first-principles bug check.
- [ ] Merge to `main`, commit, push, archive docs, and clean worktree.

## Delivery Package Draft

1. What changed:
   - Retired top-level visual executor pass inputs: `targetPasses` and `legacyTargetPasses` now fail fast.
   - Retired execution-plan pass inputs: `targetPasses` and `legacyTargetPasses` now use the same fail-fast key check.
   - Kept executor pass fan-out language behind `executionPlan.invalidationTargetPasses`.
   - Preserved no-FrameGraph renderer fallback through `resolveFrameGraphInvalidationExecutionPlan(...)`.
   - Locked the retired executor API with Node behavior tests, JS/Python static contracts, and `verify:architecture-boundaries`.
   - Mirrored the source change to `dist/app` and refreshed the Pages dist manifest.

2. Files expected:
   - Core: `js/core/map_renderer/scenario_visual_invalidation_executor.js`.
   - Tests/contracts: `tests/scenario_visual_invalidation_executor_behavior.test.mjs`, `tests/scenario_chunk_contracts.test.mjs`, `tests/test_scenario_chunk_refresh_contracts.py`, `tools/check_architecture_boundaries.mjs`.
   - Dist mirrors: `dist/app/js/core/map_renderer/scenario_visual_invalidation_executor.js`, `dist/pages-dist-manifest.json`.
   - Docs: `docs/active/_worktree_registry.md`, `docs/active/render-chain-slimming-v6/{plan,context,task}.md`, `lessons learned.md`.
   - Temp/logs: `.runtime/tests/pages-dist-startup-shell-v6-rerun.*.log`, `.runtime/tests/pages-dist-startup-shell-base-a3e4f8a.*.log` are untracked runtime evidence only.

3. Diff summary versus `origin/main@a3e4f8a0`:
   - `scenario_visual_invalidation_executor.js`: removes the top-level `targetPasses` parameter and legacy normalization path; adds shared retired-key fail-fast checks for execution-plan and top-level inputs.
   - Contracts: add static and behavior locks for the retired top-level executor pass fields.
   - `dist/pages-dist-manifest.json`: records the mirrored executor size change plus generated ignored asset byte drift from the Pages builder.
   - Active docs/registry: records V6 plan, evidence, validation, and integration state.

4. Commit status:
   - Not committed yet; ready for commit after final status check.

5. Base/main divergence:
   - Base commit: `a3e4f8a0da221bf132f9c5b897f305f947f5090c`.
   - Clean main was still at the same commit during base Pages startup shell comparison.

6. Potential worktree conflicts:
   - Current `git worktree list` contains main plus this V6 worktree.
   - Direct overlap risk is yellow for future render refresh-chain work touching `scenario_visual_invalidation_executor.js`, render-chain contracts, or Pages dist mirrors.

7. Verification:
   - Passed `npm run test:node:scenario-refresh-plans`.
   - Passed `npm run test:node:scenario-chunk-promotion-helpers`.
   - Passed `npm run test:node:scenario-chunk-contracts`.
   - Passed `npm run test:node:exact-after-settle-refresh-plans`.
   - Passed `npm run test:node:renderer-runtime-state-behavior`.
   - Passed `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_main_deferred_detail_promotion_boundary_contract -q`.
   - Passed `npm run verify:architecture-boundaries`.
   - Passed `npm run verify:test-import-graph`.
   - Passed `npm run python -- tools/build_pages_dist.py`.
   - Passed `npm run test:node:landing-showcase-view`.
   - Passed `git diff --check`.
   - Passed source/dist mirror compare for `scenario_visual_invalidation_executor.js`.
   - `npm run verify:pages-dist` partially completed: build succeeded, startup shell failed with base-reproduced `ArrayMemoryError` in landing asset builder, and `landing-showcase-view` passed separately.

8. Remaining risks:
   - `verify:pages-dist` startup shell is currently blocked on a base/main `topojson` memory allocation failure in landing asset builder tests.
   - The V6 code path itself is covered by targeted render-chain behavior/static tests.

9. Recommended next step:
   - Commit and integrate V6. Track the Pages startup shell failure as a base gate issue for a separate landing builder memory-slimming task.
