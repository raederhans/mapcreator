# Render Chain Cleanup Context

## 2026-06-14 Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-render-chain-cleanup`
- Branch: `codex/render-chain-cleanup-phases`
- Parent checkout has unrelated dirty files, so implementation is isolated in this worktree.
- Live process owner: main agent only. Subagents are limited to static review and must not run or monitor tests, servers, builds, or browser sessions.
- Skills loaded: `ultrawork`, `ultraqa`, `ai-slop-cleaner`.
- `lessons learned.md` reviewed before editing.
- Current execution starts with Phase 1A only.

## Constraints

- Preserve behavior and public contracts.
- Keep phases separate.
- Do not introduce production dependencies in Phase 1 or Phase 2.
- Use existing D3/browser APIs only in Phase 1.
- Treat `dist/app`, `index.html`, `vendor`, and Pages manifest changes as Pages delivery changes requiring `verify:pages-dist`.

## Findings

- Phase 1A target files are transport preview and related tests.
- Phase 2 and Phase 3 remain planned but not started.

## 2026-06-14 Phase 1A

- Baseline tests passed:
  - `npm run test:node:transport-facility-render-owner`
  - `npm run test:node:transport-workbench-preview-lifecycle-owner`
  - `npm run test:node:transport-overview-line-contract`
  - `python -m unittest tests.test_transport_workbench_manifest_runtime_contract -q`
- Added shared transport line preview helper module.
- Road/rail preview now share path creation, projected length, projected segments, grid bucket filtering, and contained `closest()` dataset lookup.
- Added helper behavior tests and attached them to `test:node:transport-workbench-preview-lifecycle-owner`.
- Fallback review: no masking fallback changed. Atlas fallback remains a grounded tested render-owner fail-safe outside Phase 1A scope.
- Subagent static review found one malformed coordinate risk; helper now treats malformed coordinates as empty geometry with a direct test.

## 2026-06-14 Phase 1B

- Reviewed overview road/rail/global/country drawing seams.
- Full family line-layer merge is deferred because global and country overlay paths carry different source, sidecar, and metric semantics.
- Extracted only the local label bucket selector in `transport_overview_render_owner.js`.
- `npm run test:node:transport-overview-line-contract` passed after the change.

## 2026-06-14 Phase 2 Baseline

- Phase 2 baseline first hit a stale contract failure in `tests.test_scenario_chunk_refresh_contracts`.
- Runtime code already unions `politicalFeatureIds`, `previousFeatureIds`, `nextFeatureIds`, `previousPrimaryFeatureIds`, and `nextPrimaryFeatureIds`.
- Updated the contract regex to lock the current broader refresh set instead of failing on the primary subset entries.

## 2026-06-14 Phase 2

- Extracted `resetRendererRefreshTransactionState()` in `js/core/map_renderer.js`.
- Kept `setMapData`-only render pass cache, tooltip, full pass invalidation, hover overlay cancellation, and secondary spatial build cancellation in the `setMapData` path.
- Kept `scenario apply` topology revision and render pass invalidation order in the scenario apply path.
- Added static boundary checks so future edits keep those two reset contracts separate.
- Verification passed:
  - `node --check js/core/map_renderer.js`
  - `python -m unittest tests.test_map_renderer_spatial_index_runtime_owner_boundary_contract -q`
  - `python -m unittest tests.test_scenario_chunk_refresh_contracts -q`
  - `python -m unittest tests.test_map_renderer_render_cache_owner_boundary_contract tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_map_renderer_spatial_index_runtime_owner_boundary_contract tests.test_scenario_renderer_bridge_boundary_contract tests.test_scenario_chunk_refresh_contracts -q`

## 2026-06-14 Phase 3

- Added `createWorkerTaskClient()` in `js/core/worker_task_client.js`.
- Migrated `startup_worker_client.js` to the shared Promise worker task client while preserving public startup worker APIs.
- Left `political_raster_worker_client.js` on its dedicated metrics-first single-task path because its behavior is different from startup's Promise queue.
- Added `test:node:worker-task-client`.
- Ran current grid spatial spike and wrote `.runtime/reports/generated/spatial_index_spike.md`.
- `flatbush` and `rbush` were checked with current npm metadata; production spatial owner stays on current grid in this plan.
- Verification passed:
  - `node --check js/core/worker_task_client.js && node --check js/core/startup_worker_client.js && node --check tests/worker_task_client_behavior.test.mjs`
  - `npm run test:node:worker-task-client`
  - `npm run test:node:startup-hydration-behavior`
- Final review fixes:
  - Preserved startup worker timeout vs recycled-pending error distinction with `createRecycleError`.
  - Added worker client tests for multi-pending recycle, task `ERROR` messages, and `worker.onerror`.
  - Added ordered static contract for `resetRendererRefreshTransactionState()`.
  - Added positive `LineString` helper coverage.
- Additional suite note:
  - `npm run test:node:scenario-chunk-contracts` still has an unrelated data-contract failure: `hoi4_1939 coarse chunk should expose per-feature bounds`, actual `23375`, expected `23426`.
