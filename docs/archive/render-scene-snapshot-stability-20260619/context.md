# Render Scene Snapshot Stability Context

## Current State

- Branch: `codex/render-scene-snapshot-stability`
- Base: `main@8c13c395b9704cb8c380d4aa8c0f05e302326074`
- Worktree status at start: clean
- Current status: ready for integration after local validation
- Current live process owner: main Codex agent

## Evidence From Planning

- `preloadScenarioCoarseChunks()` can prewarm full-world political payloads and immediately apply `coarse-prewarm` payloads for large scenarios.
- `drawPoliticalPass()` can draw progressive admin0 underlay and skip fine feature loops.
- `tryPartialPoliticalPassRepaint()` checks dirty reason, transform, static signature, and thresholds, but needs a trusted fine-baseline scene gate.
- Worker bitmap currentness already checks scenario, selection, topology, color, transform, DPR, viewport, and pass signature.
- `rebuildResolvedColors()` already prefers `landDataFull`; background collection selection needs the same authority.
- `resolveFeatureColor()` is the central color resolver; the risk is write-path drift between land and water/political override storage.

## Validation Already Run During Planning

- Related JS syntax checks passed.
- Small Node suite passed 37/37.
- Focused Python boundary contracts passed 46/46.
- `npm run test:node:scenario-chunk-contracts` passed 47/47.

## Progress Log

- 2026-06-19: Loaded `$ultrawork`, confirmed current main is clean and synced with `origin/main`, created execution branch, created task docs.
- 2026-06-19: Added runtime scene snapshot helpers and generation counters for scene commits and scenario data commits.
- 2026-06-19: Threaded scene/data generations through visible frame identity, last-good frame capture, interaction composite reuse, render pass cache metadata, worker bitmap identity/currentness, and deferred full-cache scheduling.
- 2026-06-19: Split political pass readiness into `coarse`, `fine`, `data-ready`, and `not-ready`; partial political repaint now requires a fine same-scene baseline.
- 2026-06-19: Made scenario political background collection prefer `landDataFull || landData`, so resolved colors and background fills read the same full visual authority when available.
- 2026-06-19: Added one feature visual override transaction for political feature color writes. Water-region color writes remain on `waterRegionOverrides`, which is a separate water/ocean visual domain.
- 2026-06-19: Review found rollback was missing the new scene snapshot identity. Fixed rollback snapshot/restore to include `scenarioPoliticalVisibleChunkData`, bump `scenarioDataGeneration`, and bump/sync `sceneGeneration` when rollback changes the active scenario.
- 2026-06-19: Rebuilt Pages dist after source changes; `dist/app` mirrors current source.

## Delivery Package

### Changed Files

- Core: `js/core/map_renderer.js`, `js/core/state/renderer_runtime_state.js`, `js/core/political_raster_worker_client.js`, `js/core/renderer/render_cache_owner.js`, `js/core/scenario/chunk_runtime.js`, `js/core/scenario_rollback.js`.
- Tests: `tests/renderer_runtime_state_behavior.test.mjs`, `tests/scenario_chunk_contracts.test.mjs`, `tests/scenario_lifecycle_runtime_behavior.test.mjs`, `tests/test_renderer_runtime_state_boundary_contract.py`, `tests/test_map_renderer_render_cache_owner_boundary_contract.py`, `tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`, `tests/test_map_renderer_color_resolution_strategy_boundary_contract.py`, `tests/test_scenario_chunk_refresh_contracts.py`, `tests/test_scenario_rollback_boundary_contract.py`.
- Dist/docs: matching `dist/app/js/core/**` mirrors, `dist/pages-dist-manifest.json`, `docs/active/_worktree_registry.md`, this task folder.

### Diff Summary

- Adds explicit scene and scenario-data generations to runtime state.
- Rejects stale last-good frames, interaction composites, worker bitmaps, deferred full-cache work, and partial repaint baselines when scene identity drifts.
- Records political pass data stage/readiness in cache metadata and uses fine same-scene readiness as the trusted baseline.
- Uses `landDataFull` as the full visual authority for scenario political background fills.
- Centralizes political feature override writes so `visualOverrides` and `featureOverrides` cannot drift on normal edit paths.
- Keeps rollback in the same scene snapshot contract by restoring visible chunk data and advancing scene/data generations after rollback.

### Integration Notes

- Current branch has not diverged from base main except for this task diff.
- Only current worktree path is `C:\Users\raede\Desktop\dev\mapcreator`.
- Direct overlap risk is green because no other active worktree exists. Semantic risk remains yellow because the diff touches renderer hot paths and Pages dist.
- Recommended integration: commit branch, push branch, fast-forward merge into current `main`, run a final short post-merge check, push `main`, archive task docs.
- Commit status before integration: uncommitted local diff while this context is being updated.

### Validation

- `node --check js/core/map_renderer.js`
- `node --check js/core/state/renderer_runtime_state.js`
- `node --check js/core/scenario/chunk_runtime.js`
- `node --check js/core/political_raster_worker_client.js`
- `node --check js/core/renderer/render_cache_owner.js`
- `node --test tests/renderer_runtime_state_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs tests/palette_runtime_bridge.node.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs` passed 87/87.
- `py -3 -m unittest tests.test_renderer_runtime_state_boundary_contract tests.test_map_renderer_render_cache_owner_boundary_contract tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_map_renderer_color_resolution_strategy_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_scenario_resources_boundary_contract tests.test_scenario_rollback_boundary_contract -q` passed 70/70.
- `npm run test:node:scenario-chunk-contracts` passed 47/47.
- `npm run verify:pages-dist` passed: builder completed, startup shell 37/37, landing showcase 8/8.
- First post-rollback `verify:pages-dist` attempt hit a transient Python/topojson memory allocation error in one landing showcase asset test. The failing test passed alone, and the full `npm run verify:pages-dist` rerun passed afterward.
- `git diff --check` passed with existing Windows CRLF working-copy warnings only.
- Code-review subagent re-check reported CLEAR after the rollback fix, with zero remaining P0/P1/P2 findings.
- Post-merge main validation passed: `node --test tests/scenario_lifecycle_runtime_behavior.test.mjs tests/renderer_runtime_state_behavior.test.mjs` passed 22/22, and `py -3 -m unittest tests.test_scenario_rollback_boundary_contract tests.test_map_renderer_render_pipeline_passes_boundary_contract -q` passed 7/7.
- Functional commit `0c13e8e0` was fast-forwarded into `main`; this archive records the integration closeout.

### Open Risks

- No browser visual inspection was run because the requested issue is render-chain correctness and the existing contract/test gates cover the changed invariants more directly.
- The water-region color path is documented as a separate domain; it was not folded into political feature override transactions.
