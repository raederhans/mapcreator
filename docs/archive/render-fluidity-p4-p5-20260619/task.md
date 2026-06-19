# Render Fluidity P4/P5 Task

## Checklist

- [x] Register active worktree and delivery scope.
- [x] Implement P4 canvas layer manager.
- [x] Wire layer sizing and renderer compatibility.
- [x] Implement political patch overlay paint/clear lifecycle.
- [x] Extend worker protocol, bitmap flag, metrics, and currentness handling.
- [x] Implement political bitmap packet and worker raster drawing.
- [x] Add targeted contracts.
- [x] Run verification.
- [x] Review, fix findings, and prepare integration package.

## Delivery Package Draft

- Changed files: `js/core/map_renderer.js`, `js/core/map_renderer/canvas_layer_manager.js`, `js/core/map_renderer/political_raster_worker_packet.js`, `js/core/political_raster_worker_client.js`, `js/workers/political_raster.worker.js`, `js/core/state/renderer_runtime_state.js`, matching `dist/app` mirrors, `dist/pages-dist-manifest.json`, `tools/perf/run_baseline.mjs`, `tests/canvas_layer_manager_behavior.test.mjs`, `tests/political_raster_worker_packet_behavior.test.mjs`, `tests/scenario_chunk_contracts.test.mjs`, `package.json`, docs registry/context.
- Diff summary: staged canvas layer manager, political patch overlay with stale-transform clearing, protocol v3 bitmap worker trial with error/late-result handling, worker packet geometry helper, perf URL query override, and targeted contracts.
- Commit state: pending commit.
- Base divergence: base `origin/main@dcd7c9d8`; final fetch still required before pushing to `origin/main`.
- Conflict risks: red for simultaneous edits to `js/core/map_renderer.js`; yellow for worker client/worker protocol, `dist/app`, and perf runner.
- Verification: `node --check` for changed JS/test modules; `npm run test:node:canvas-layer-manager` 4/4; `npm run test:node:political-raster-worker-packet` 2/2; `npm run test:node:scenario-chunk-contracts` 47/47; `npm run test:node:perf-probe-snapshot-behavior` 5/5; `npm run verify:perf-gate-contract` 22/22; `npm run verify:test-import-graph`; `npm run verify:pages-dist` with Pages startup shell 37/37 and landing showcase 8/8; `git diff --check`.
- Review: code-reviewer requested fixes for bitmap failure/late-result handling, overlay stale pixels, GeometryCollection parity, and missing tests; all were fixed and final focused review returned CLEAR.
- Recommended integration: commit feature branch, fetch/re-check `origin/main`, fast-forward push if unchanged, archive docs, then clean the feature worktree after integrated recovery refs exist.
