# Renderer Render Lifecycle Preflight P40

## Scope and guardrails

P40 is preflight only.

No production runtime behavior changes.

Allowed P40 file scope:

- `docs/active/renderer-render-lifecycle-preflight-20260630.md`
- `tests/renderer_render_lifecycle_inventory_boundary.test.mjs`
- `package.json`
- `tools/check_architecture_boundaries.mjs`
- `docs/active/_worktree_registry.md`

P40 does not add `renderer_render_lifecycle_owner.js`.

No state-write allowlist changes.

P40 does not migrate `render()`, `drawCanvas()`, `renderPassToCache()`, hit canvas build, scenario refresh runtime, exact-after-settle scheduler, strategic overlay runtime, selection/fill, or the public facade.

## Current P38/P39 renderer transaction baseline

P38 added `js/core/map_renderer/set_map_data_transaction_owner.js`.

Current transaction baseline:

- `js/core/map_renderer.js` remains the composition root.
- `setMapData` keeps its public wrapper in `js/core/map_renderer.js`.
- The wrapper delegates to `createSetMapDataTransactionOwner`.
- The setMapData owner owns only setMapData transaction order.
- The setMapData owner receives reset/render/cache effects through injection.
- P39 keeps `resetRendererTransactionState`, `resetRendererRefreshTransactionState`, and `markRendererTopologyChanged` in `js/core/map_renderer.js`.
- P39 added reset-boundary gates and still forbids `renderer_render_lifecycle_owner.js`.

## Current render facade and scheduler entry inventory

`js/core/map_renderer.js` currently owns the render facade and scheduler entry points.

Locked anchors:

- `function render()`
- `requestRendererRender`
- `requestInteractionRender`
- `setRenderPhase`
- `scheduleRenderPhaseIdle`
- `firstVisibleFramePainted`
- `recordVisibleFrameAcceptance`
- `recordRenderDiagnostics`

`render()` remains in `js/core/map_renderer.js` for P40.

## Current drawCanvas lifecycle inventory

`drawCanvas()` remains in `js/core/map_renderer.js` for P40.

Current lifecycle anchors:

- `function drawCanvas()`
- render phase transition logic
- first visible frame handling
- interaction composite handling
- pass cache composition
- legend scheduling
- render diagnostics and perf metrics

P40 does not migrate `drawCanvas()`.

## Current renderPassToCache lifecycle inventory

`renderPassToCache()` remains in `js/core/map_renderer.js` for P40.

Current lifecycle anchors:

- `function renderPassToCache(`
- pass canvas sizing
- transform/reference handling
- draw callback execution
- pass timings
- render cache owner calls through current injected boundaries

P40 does not migrate `renderPassToCache()`.

## Current hit canvas build inventory

Hit canvas build remains in `js/core/map_renderer.js` for P40.

Locked anchor:

- `async function buildHitCanvasAfterStartup`

P40 does not migrate hit canvas build.

## Current render cache and pass catalog boundary

Existing narrow owners remain authoritative:

- `render_cache_owner.js` owns render cache invalidation authority.
- `render_pipeline_passes.js` and `render_pipeline_catalog.js` own pass definitions/catalog.
- `render_invalidation_catalog.js` owns invalidation vocabulary.
- `render_transform_reuse_policy_owner.js` owns transform reuse policy.
- `exact_after_settle_scheduler.js` owns exact-after-settle scheduling.
- `scenario_refresh_runtime.js` owns scenario refresh/chunk visual/infra flow.
- `set_map_data_transaction_owner.js` owns only setMapData transaction order.
- `renderer_startup_transaction_owner.js` owns only initMap startup reset order.

P40 does not duplicate those owners and does not add a render lifecycle owner above them.

## Current exact-after-settle render boundary

`exact_after_settle_scheduler.js` owns exact-after-settle scheduling.

Current boundary:

- `createExactAfterSettleScheduler({` is still wired from `js/core/map_renderer.js`.
- Exact-after-settle finalize/abort/schedule behavior remains in `js/core/map_renderer/exact_after_settle_scheduler.js`.
- P40 does not migrate exact-after-settle scheduler behavior.

## Current scenario refresh render boundary

`scenario_refresh_runtime.js` owns scenario refresh/chunk visual/infra flow.

Current boundary:

- `createScenarioRefreshRuntime({` is still wired from `js/core/map_renderer.js`.
- Scenario refresh runtime remains separate from setMapData transaction ownership.
- Scenario refresh runtime does not import a render lifecycle owner.
- P40 does not migrate scenario refresh runtime behavior.

## Current strategic overlay render boundary

Strategic overlay runtime and render owners remain separate.

Current boundary:

- `createStrategicOverlayRuntimeOwner({` is still wired from `js/core/map_renderer.js`.
- `strategic_overlay_runtime_owner.js` owns strategic overlay runtime operations.
- `strategic_overlay_render_owner.js` owns strategic overlay render drawing helpers.
- P40 does not migrate strategic overlay runtime or render behavior.

## Current public facade and export boundary

The public facade remains stable.

Locked anchors:

- `js/core/map_renderer/public.js` exports `render`, `setMapData`, `initMap`, and `RENDER_PASS_NAMES`.
- `js/core/map_renderer/public.js` still exports from `../map_renderer.js`.
- `js/core/map_renderer.js` still re-exports `RENDER_PASS_NAMES`.
- `js/core/map_renderer.js` still exports render-related anchors including `render`, `setMapData`, `initMap`, `renderExportPassesToCanvas`, `renderLegend`, and `requestInteractionRender`.

P40 makes no public facade changes.

## P41 allowed first move candidates

P41 may choose one small first move after P40 review.

Recommended candidates:

- render request facade inventory hardening
- first visible frame diagnostic owner preflight
- render boundary request adapter preflight
- a tiny render scheduling wrapper, only if tests prove no draw/pass/hit movement

P41 may only choose one candidate first.

## P41 forbidden areas

P41 must not begin with `drawCanvas` or `renderPassToCache` migration.

P41 forbidden areas:

- No `drawCanvas()` migration as the first move.
- No `renderPassToCache()` migration as the first move.
- No hit canvas build migration as the first move.
- No scenario refresh runtime migration.
- No exact-after-settle scheduler migration.
- No strategic overlay runtime migration.
- No public facade changes.
- No state-write allowlist changes unless a later implementation phase proves and documents the need.

## Required validation commands

- `node --check tests/renderer_render_lifecycle_inventory_boundary.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
- `npm run test:node:renderer-render-lifecycle-inventory`
- `npm run test:node:renderer-set-map-data-transaction`
- `npm run test:node:renderer-transaction-reset-hardening-inventory`
- `npm run test:node:renderer-startup-transaction-owner`
- `npm run test:node:renderer-startup-transaction-inventory`
- `npm run test:node:render-cache-owner`
- `npm run test:node:render-transform-reuse-policy-owner`
- `npm run test:node:render-pipeline-catalog`
- `npm run test:node:render-transaction-diagnostics`
- `npm run test:node:exact-after-settle-refresh-plans`
- `npm run test:node:scenario-refresh-plans`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `npm run verify:state-write-allowlist`
- `git diff --check`
