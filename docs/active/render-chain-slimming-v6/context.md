# Render Chain Slimming V6 Context

## 2026-06-20 Start

- Base: `origin/main@a3e4f8a0da221bf132f9c5b897f305f947f5090c`.
- Branch: `codex/render-chain-slimming-v6`.
- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-render-chain-slimming-v6`.
- Main checkout was clean and matched `origin/main` before worktree creation.
- Live tests/builds owner: main Codex agent only.
- Static subagent: code-mapper `019ee737-7236-70c2-9740-26678afb33b5`.

## Initial Findings

- V5 archived docs confirm the bridge-to-executor `executionPlan` no longer exposes generic `targetPasses`.
- `scenario_refresh_runtime.js` calls `executeScenarioVisualInvalidation(...)` with `executionPlan: { targetResources, invalidationTargetPasses, hasExplicitTargetResources }`.
- `scenario_visual_invalidation_executor.js` still accepts top-level `targetPasses = []` and maps it into `invalidationTargetPasses`.
- The only no-FrameGraph renderer fallback that production needs is already in `resolveFrameGraphInvalidationExecutionPlan(frameGraphInvalidation, fallbackTargetPasses)`, where `fallbackTargetPasses` comes from `rendererRefreshPlan.targetPasses`.

## Progress Log

- Created V6 worktree from `origin/main`.
- Loaded `ultrawork`, `ralph`, `docs/shared/agent-tiers.md`, `AGENTS.md`, and relevant `lessons learned.md` render-chain rules.
- Started a read-only code-mapper subagent for executor `targetPasses` call-surface audit.
- Two-step search started with `rg --files`, then precise `rg` over render-chain candidate files.
- Code-mapper result: production callers feed `executeScenarioVisualInvalidation(...)` through `scenario_refresh_runtime.js` with `executionPlan.invalidationTargetPasses`; top-level `targetPasses` is a retired executor edge.
- Implemented V6 scope:
  - `scenario_visual_invalidation_executor.js` now rejects top-level `targetPasses` and `legacyTargetPasses`.
  - The executor fallback without an `executionPlan` still uses default invalidation passes for direct legacy-style calls.
  - `executionPlan.invalidationTargetPasses` remains the only pass-list language accepted by the visual executor.
  - `dist/app/js/core/map_renderer/scenario_visual_invalidation_executor.js` mirrors source.
- Contract updates:
  - Node behavior test locks rejection of top-level `targetPasses`.
  - JS and Python scenario chunk contracts lock absence of executor `targetPasses =` and `const legacyTargetPasses =`.
  - `tools/check_architecture_boundaries.mjs` locks the retired visual invalidation pass input keys.
- Final review found one real bug: `executionPlan.legacyTargetPasses` was still silently accepted.
- Review fix:
  - Added `findRetiredVisualInvalidationPassInputKey(...)`.
  - Reused the same retired key list for `executionPlan` and top-level inputs.
  - Added behavior tests for `executionPlan.legacyTargetPasses` and top-level `legacyTargetPasses`.
  - Mirrored the fix to `dist/app` and refreshed `dist/pages-dist-manifest.json`.
- Verification passed:
  - `npm run test:node:scenario-refresh-plans` (20/20 after review fix)
  - `npm run test:node:scenario-chunk-promotion-helpers`
  - `npm run test:node:scenario-chunk-contracts`
  - `npm run test:node:exact-after-settle-refresh-plans`
  - `npm run test:node:renderer-runtime-state-behavior`
  - `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_main_deferred_detail_promotion_boundary_contract -q`
  - `npm run verify:architecture-boundaries`
  - `npm run verify:test-import-graph`
  - `npm run python -- tools/build_pages_dist.py`
  - `npm run test:node:landing-showcase-view`
  - `git diff --check`
  - source/dist mirror compare for `scenario_visual_invalidation_executor.js`
- `npm run verify:pages-dist`:
  - `tools/build_pages_dist.py` completed and refreshed `dist/pages-dist-manifest.json`.
  - The following startup shell stage failed with two `numpy._core._exceptions._ArrayMemoryError` errors while `topojson` tried to allocate a 3.98 GiB array in `tools/build_landing_europe_1936_showcase.py`.
  - Re-running `npm run python -- -m unittest tests.test_pages_dist_startup_shell -q` in the V6 worktree reproduced the same two errors.
  - Running the same startup shell command on clean main `a3e4f8a0da221bf132f9c5b897f305f947f5090c` reproduced the same two errors, so this is a base gate blocker rather than a V6 regression.
- Live process status: no active tests or builds remain.
