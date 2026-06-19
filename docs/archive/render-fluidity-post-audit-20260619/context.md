# Render Fluidity Post-Audit Context - 2026-06-19

## Baseline

- Audit worktree: `C:\Users\raede\Desktop\dev\mapcreator-render-fluidity-audit`
- Branch: `codex/render-fluidity-post-audit`
- Base: `origin/main@da191163`
- Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` remains dirty and behind with unrelated docs/archive WIP; this audit avoids modifying it.

## Findings

- The worker bitmap path had success, ERROR fallback, late bitmap rejection, and metric coverage.
- Source and `dist/app` contained the same bitmap offload implementation before the post-audit fix.
- The accepted bitmap result was consumed after `drawPoliticalBackgroundFills`, so the worker bitmap path still paid main-thread political background fill cost on ready frames.

## Fix

- Moved `consumePoliticalRasterWorkerBitmapResult(workerIdentity)` before `drawPoliticalBackgroundFills`.
- Mirrored the change to `dist/app/js/core/map_renderer.js`.
- Added a static contract in `tests/scenario_chunk_contracts.test.mjs` to lock the order.

## Verification Log

- `node --check` passed for `js/core/map_renderer.js`, `dist/app/js/core/map_renderer.js`, `js/core/political_raster_worker_client.js`, `js/workers/political_raster.worker.js`, and `tests/scenario_chunk_contracts.test.mjs`.
- `npm run test:node:canvas-layer-manager`: 4/4 passed.
- `npm run test:node:political-raster-worker-packet`: 2/2 passed.
- `npm run test:node:scenario-chunk-contracts`: 47/47 passed.
- `npm run test:node:perf-probe-snapshot-behavior`: 5/5 passed.
- `npm run verify:perf-gate-contract`: 22/22 passed.
- `npm run verify:test-import-graph`: passed, 48 specs.
- `npm run verify:pages-dist`: builder passed, Pages startup shell 37/37, landing showcase 8/8.
- `git diff --check`: passed with Windows CRLF checkout warnings only.
