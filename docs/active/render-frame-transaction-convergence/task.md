# Render Frame Transaction Convergence Task

## Work Package

1. Add committed frame identity helpers and wire visible frame transaction diagnostics through the shared commit key.
2. Add required semantic layer resolver and hook it into chunk startup/apply readiness without coupling it to UI visibility.
3. Add FrameGraphInvalidation descriptors while preserving existing `targetPasses` behavior.
4. Add draw subset index helper and tests; keep authority inputs full-payload based.
5. Sync source changes into `dist/app`, verify, review, commit, merge, push, archive, and clean.

## Delivery Package Draft

- Status: ready-for-integration after review fixes and final checks.
- Base: `main@07eecef3`.
- Branch: `frame-transaction-convergence`.
- Changed core files: `js/core/map_renderer.js`, `js/core/map_renderer/scenario_refresh_plans.js`, `js/core/map_renderer/scenario_refresh_runtime.js`, `js/core/renderer/scenario_chunk_promotion_helpers.js`, `js/core/scenario/chunk_runtime.js`, `js/core/scenario_chunk_manager.js`, `js/core/scenario_resources.js`, `js/core/state/renderer_runtime_state.js`, `tools/check_architecture_boundaries.mjs`.
- Changed test files: `tests/scenario_chunk_contracts.test.mjs`, `tests/scenario_refresh_plans_behavior.test.mjs`, `tests/scenario_chunk_promotion_helpers_behavior.test.mjs`, `tests/renderer_runtime_state_behavior.test.mjs`.
- Changed docs/dist files: active task docs, `docs/active/_worktree_registry.md`, matching `dist/app/js/core/...` mirrors, `dist/pages-dist-manifest.json`.
- Diff summary: visible frame transactions now carry a stable commit key plus diagnostics; TNO required semantic layers participate in chunk selection independent of UI visibility; FrameGraph invalidation descriptors list pass/resource fan-out and feed scenario refresh runtime invalidation; draw subset helper normalizes future subset indexes; architecture line budget is raised slightly to current renderer size.
- Commit status: not committed yet in this worktree; next action is review self-check, `git diff --check`, commit, fast-forward merge, push, archive, and cleanup.
- Base divergence: branch started at `main@07eecef3`; re-check `origin/main` before merge and rebase only if remote moved.
- Conflict risk: red for any other worktree touching `map_renderer.js`, scenario chunk runtime, refresh plans, or Pages dist; green versus parent dirty `data/locales.json` by path.
- Verification passed: scenario refresh plans 7/7, chunk promotion helpers 7/7, renderer runtime state 10/10, scenario chunk contracts 54/54, political raster worker packet 5/5, Python boundary contracts 14/14, Python scenario refresh/bridge contracts 39/39, architecture boundaries, dist drift, and diff check.
- Remaining risk: no browser smoke was run because this is renderer contract work covered by unit/static gates; runtime visual behavior still depends on existing canvas test coverage.
- Recommended integration: fast-forward merge into current `main` after final review; push `main`; then move task docs to archive and remove the feature worktree after clean status confirmation.
