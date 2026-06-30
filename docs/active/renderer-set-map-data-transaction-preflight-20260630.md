# Renderer setMapData Transaction Preflight P37

## Scope and guardrails

P37 is preflight only. It records the current `setMapData` transaction in `js/core/map_renderer.js` and adds static gates for the next extraction phase. It does not change production runtime behavior, Pages dist output, the public facade, or the state-writer allowlist.

Allowed P37 file scope:

- `docs/active/renderer-set-map-data-transaction-preflight-20260630.md`
- `tests/renderer_set_map_data_transaction_inventory_boundary.test.mjs`
- `package.json`
- `tools/check_architecture_boundaries.mjs`

P37 must keep `js/core/map_renderer/set_map_data_transaction_owner.js` absent.

## Current P36 renderer lifecycle baseline

The current renderer baseline already has focused owners for startup reset, viewport update, and fitProjection work:

- P36 startup transaction owner: `js/core/renderer/renderer_startup_transaction_owner.js` owns the `initMap` reset transaction after projection/path initialization.
- P34 viewport update owner: `js/core/renderer/renderer_viewport_update_owner.js` remains effects-only and owns `updateMap` orchestration.
- P32 fitProjection owner: `js/core/renderer/renderer_fit_projection_owner.js` owns `fitProjection` through injected getters and effects.
- `js/core/map_renderer.js` remains the composition root and still contains `function setMapData({`.

## setMapData transaction overview

`setMapData` currently starts by resetting transaction state, render pass state, visible-frame state, overlay dirtiness, tooltip visibility, and primary political collections. It then sanitizes color state, rebuilds runtime metadata, prepares projection and interaction infrastructure, optionally resets zoom, renders first paint, and records `setMapDataFirstPaint` plus `setMapData` perf metrics.

The current transaction anchors are intentionally broad because P38 needs a complete owner boundary before moving code. P37 locks the inventory so a later extraction can preserve order.

## Pre-reset and render frame invalidation inventory

The pre-reset branch currently includes:

- `resetRendererTransactionState({`
- `clearPendingPoliticalColorEdit({`
- `clearRenderPassReferenceTransforms()`
- `clearLastGoodFrame("set-map-data")`
- `invalidateInteractionComposite("set-map-data")`
- `resetFirstVisibleFramePainted("set-map-data")`
- `invalidateAllRenderPasses("set-map-data")`
- `markAllOverlaysDirty()`
- `queueTooltipUpdate({ visible: false })`

## Political collection rebuild and coverage logging inventory

The political rebuild branch currently includes `rebuildPrimaryPoliticalCollections()`, then logs composite topology coverage when the runtime is in composite mode.

Locked diagnostic tokens:

- `Composite coverage`
- `Composite country coverage detail/primary`

## Color and scenario state sanitation inventory

The sanitation branch currently includes:

- `sanitizeCountryColorMap`
- `sanitizeColorMap`
- `runtimeState.specialRegionOverrides = {}`
- `migrateLegacyColorState()`
- `setCanvasSize()`
- `buildRuntimePoliticalMeta()`
- `runtimeState.sovereigntyInitialized = false`
- `islandNeighborsCache = {`
- `ensureSphericalFeatureDiagnosticsCache().clear()`

## Canvas, runtime meta, and interaction infrastructure branch

The interaction branch currently computes `shouldDeferInteractionInfrastructure`.

When interaction infrastructure is immediate, `setMapData` calls:

- `buildIndex()`
- `ensureSovereigntyState()`

When interaction infrastructure is deferred, it sets hit-canvas defer state and calls:

- `runtimeState.deferHitCanvasBuild = true`
- `setInteractionInfrastructureState("deferred-startup"`

At the end of the transaction, the immediate branch calls:

- `setInteractionInfrastructureState("ready"`

## Projection, spatial index, special zone, and zoom branch

The projection branch currently includes:

- `rebuildProjectedBoundsCache()`
- `rebuildStaticMeshes()`
- `invalidateBorderCache()`
- `updateDynamicBorderStatusUI()`
- `rebuildResolvedColors()`
- `fitProjection({ skipSpatialIndex: shouldDeferInteractionInfrastructure })`
- `buildSpatialIndex()`
- `updateSpecialZonesPaths()`
- `renderSpecialZoneEditorOverlay()`
- `updateZoomTranslateExtent()`
- `resetZoomToFit()`
- `enforceZoomConstraints()`
- `runtimeState.hitCanvasDirty = true`

## Staged warmup, render, and perf metrics branch

The staged warmup branch currently includes:

- `beginStagedMapDataWarmup(startedAt)`
- `render()`
- `recordRenderPerfMetric("setMapDataFirstPaint"`
- `recordRenderPerfMetric("setMapData"`

The render/hit/scenario/exact/strategic anchors remain outside the P38 first move:

- `function render()`
- `function drawCanvas()`
- `function renderPassToCache(`
- `async function buildHitCanvasAfterStartup`
- `createScenarioRefreshRuntime({`
- `createExactAfterSettleScheduler({`
- `createStrategicOverlayRuntimeOwner({`

## P38 allowed first move

P38 may make these first moves:

- Add `js/core/map_renderer/set_map_data_transaction_owner.js`.
- Move setMapData orchestration into owner through injected getters/effects.
- Keep public setMapData wrapper in `js/core/map_renderer.js` stable.
- Keep scenario refresh runtime separate.
- Keep `render()`, `drawCanvas()`, `renderPassToCache()`, hit canvas build, exact-after-settle scheduler, strategic overlay runtime out of the owner.
- Keep direct state writes either in map_renderer injected effects or existing state ops.
- Do not add a new state-write allowlist entry unless explicitly justified.
- Preserve `recordRenderPerfMetric` semantics and ordering.

## P38 forbidden areas

P38 forbidden areas:

- No `renderer_render_lifecycle_owner.js`.
- No drawCanvas migration.
- No renderPassToCache migration.
- No hit canvas build migration.
- No scenario refresh runtime migration.
- No exact-after-settle scheduler migration.
- No strategic overlay runtime migration.
- No public facade changes.
- No owner importing `js/core/map_renderer.js`.
- No broad state-write allowlist expansion.

## Required validation commands

Required P37 validation:

- `node --check tests/renderer_set_map_data_transaction_inventory_boundary.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
- `npm run test:node:renderer-set-map-data-transaction-inventory`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `git diff --check`
