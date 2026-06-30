# Renderer Startup Transaction Preflight P35

## Scope and guardrails

P35 is preflight only. It documents and locks the current `initMap` startup transaction inventory so P36 can move a narrow block with less guesswork.

P35 changes only docs, tests, package scripts, and architecture tooling. It must not change production runtime behavior, `js/core/map_renderer.js`, `dist/app/**`, or `tools/eslint-rules/state-writer-allowlist.json`.

## Current P34 renderer lifecycle baseline

P33 surface runtime bridge state ownership is already integrated through `applyRendererSurfaceBridgeState(target, handles = {})` in `js/core/state/renderer_runtime_state.js`.

P34 renderer viewport update ownership is already integrated through `createRendererViewportUpdateOwner({ effects = {}, getters = {} } = {})`. The owner is effects-only, keeps `drawFrame()` last, and leaves `map_renderer.js` as the composition root.

The current focused renderer helpers/owners already cover surface lifecycle, SVG lifecycle, projection/path creation, fitProjection, viewport update, and surface bridge state. `initMap` still owns startup transaction ordering.

## initMap owned sequence after surface/projection setup

The current reset transaction starts after:

- `ensureHybridLayers()`
- `getRendererSurfaceLifecycleOwner().ensureHitCanvasHandle()`
- `getRendererSurfaceLifecycleOwner().acquireCanvasContexts()`
- `getRendererProjectionPathOwner().initializeProjectionPaths()`

The sequence after `getRendererProjectionPathOwner().initializeProjectionPaths()` is the only P36 first-move candidate. P36 should probably move only this reset transaction block first and leave the later startup branch in `map_renderer.js` unless tests prove ordering safety.

## Cache and topology reset inventory

Current `initMap` reset transaction inventory:

- `layerResolverCache.primaryRef = null`
- `layerResolverCache.detailRef = null`
- `layerResolverCache.bundleMode = null`
- `layerResolverCache.contextRevision = 0`
- `resetPhysicalLandClipPathCache()`
- `resetExactRefreshOptimizationState()`
- `runtimeState.topologyRevision = Number(runtimeState.topologyRevision || 0) + 1`
- `runtimeState.hitCanvasTopologyRevision = 0`
- `clearPendingPoliticalColorEdit({ resetReason: "init-map" })`
- `ensureLayerDataFromTopology()`
- `rebuildPoliticalLandCollections()`

## Render pass and visible-frame reset inventory

Current render/cache reset inventory:

- `clearRenderPassReferenceTransforms()`
- `clearLastGoodFrame("init-map")`
- `invalidateInteractionComposite("init-map")`
- `resetFirstVisibleFramePainted("init-map")`
- `renderPassCache.perfOverlayEnabled = isPerfOverlayEnabled()`
- `applyRendererSurfaceBridgeState(runtimeState, { ... })`
- `migrateLegacyColorState()`
- `ensureSovereigntyState()`
- `normalizeColorStateForRender(state, { ... })`
- `resetRenderDiagnostics()`
- `invalidateAllRenderPasses("init-map")`

`applyRendererSurfaceBridgeState(runtimeState, { ... })` must stay after `rebuildPoliticalLandCollections()` and before `migrateLegacyColorState()`.

## Runtime phase and deferred-flag reset inventory

Current runtime phase and pending-work reset inventory:

- `runtimeState.debugMode = debugMode`
- `clearRenderPhaseTimer()`
- `runtimeState.renderPhase = RENDER_PHASE_IDLE`
- `runtimeState.phaseEnteredAt = nowMs()`
- `runtimeState.renderPhaseTimerId = null`
- `runtimeState.tooltipPendingState = { visible: false }`
- `runtimeState.tooltipRafHandle = null`
- `cancelScheduledHoverOverlayRender()`
- `markAllOverlaysDirty()`
- `clearStagedMapDataTasks()`
- `cancelExactAfterSettleRefresh()`
- `cancelPendingIndexUiRefresh()`
- `runtimeState.deferContextBasePass = false`
- `runtimeState.deferHitCanvasBuild = false`
- `runtimeState.deferExactAfterSettle = false`
- `runtimeState.hitCanvasBuildScheduled = null`
- `resetProjectedBoundsCacheState()`

## Day-night and canvas pointer style inventory

Current day-night and canvas pointer inventory:

- `runtimeState.syncDayNightClockTimerFn = syncDayNightClockTimer`
- `syncDayNightClockTimer()`
- `rendererSurfaceHost.getMapCanvas().style.pointerEvents = "none"`
- `rendererSurfaceHost.getMapCanvas().style.touchAction = "none"`
- `rendererSurfaceHost.getPoliticalPatchCanvas().style.pointerEvents = "none"`
- `rendererSurfaceHost.getPoliticalPatchCanvas().style.touchAction = "none"`
- `rendererSurfaceHost.getInteractionOverlayCanvas().style.pointerEvents = "none"`
- `rendererSurfaceHost.getInteractionOverlayCanvas().style.touchAction = "none"`

Canvas pointer styles belong to the later startup branch for P36 and are optional/deferred.

## Interaction infrastructure startup branch

Later startup branch inventory, marked P36 optional/deferred:

- canvas pointer styles
- `buildRuntimePoliticalMeta()`
- `setCanvasSize()`
- `buildIndex()` or deferred startup infrastructure through `setInteractionInfrastructureState("deferred-startup", ...)`
- `rebuildStaticMeshes()`
- `invalidateBorderCache()`
- `updateDynamicBorderStatusUI()`
- `fitProjection({ skipSpatialIndex: shouldDeferInteractionInfrastructure })`
- `initZoom()`
- `bindEvents()`
- `runtimeState.getViewportGeoBoundsFn = getViewportGeoBounds`
- interaction infrastructure ready through `setInteractionInfrastructureState("ready", ...)`
- initial render through `render()`

P36 should leave this later startup branch in `map_renderer.js` unless a dedicated test proves the ordering is safe to move.

## P36 allowed first move

P36 may add `js/core/renderer/renderer_startup_transaction_owner.js`.

P36 may only move the `initMap` reset/startup transaction after projection/path creation through injected getters and effects.

P36 must keep `initMap` as the composition root and must preserve the public wrapper in `js/core/map_renderer.js`.

P36 must keep state writes as injected effects from `map_renderer.js` or existing state ops.

P36 must preserve `applyRendererSurfaceBridgeState(runtimeState, { ... })` call location relative to `rebuildPoliticalLandCollections()` and `migrateLegacyColorState()`.

## P36 forbidden areas

P36 must not move or create ownership for:

- render lifecycle owner
- `drawCanvas`
- `renderPassToCache`
- hit canvas build
- `setMapData` migration
- scenario refresh/chunk migration
- exact-after-settle scheduler migration
- strategic overlay runtime migration
- `initZoom` or `bindEvents` migration
- renderer public facade change
- direct `runtimeState` writes inside the new owner
- import of `js/core/map_renderer.js` from the new owner

## Required validation commands

- `node --check tests/renderer_startup_transaction_inventory_boundary.test.mjs`
- `npm run test:node:renderer-startup-transaction-inventory`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `git diff --check`
