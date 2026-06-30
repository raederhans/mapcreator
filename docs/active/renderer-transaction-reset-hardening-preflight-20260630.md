# Renderer Transaction Reset Hardening Preflight P39

## Scope and guardrails

P39 is preflight/hardening only.

No production runtime behavior changes.

Allowed P39 file scope:

- `docs/active/renderer-transaction-reset-hardening-preflight-20260630.md`
- `tests/renderer_transaction_reset_hardening_inventory_boundary.test.mjs`
- `package.json`
- `tools/check_architecture_boundaries.mjs`
- `docs/active/_worktree_registry.md`

The reset functions remain in `js/core/map_renderer.js` for P39. This phase records current reset meaning and adds static gates for later work.

## Current P38 transaction owner baseline

P38 added `js/core/map_renderer/set_map_data_transaction_owner.js`.

Current baseline:

- `setMapData` keeps its public signature and defaults in `js/core/map_renderer.js`.
- `setMapData` delegates to `runSetMapDataTransaction`.
- The setMapData owner owns only the setMapData transaction order.
- The setMapData owner calls `resetRendererTransactionState` as an injected effect.
- The setMapData owner does not import `js/core/map_renderer.js`.
- Direct runtime and module-local writes stay in `map_renderer.js` injected effects.

## initMap startup reset inventory

The startup transaction owner remains focused on post-projection `initMap` reset order.

Locked startup owner tokens:

- `runInitMapResetTransaction`
- `resetLayerResolverCache`
- `resetPhysicalLandClipPathCache`
- `resetExactRefreshOptimizationState`
- `bumpTopologyRevision`
- `resetHitCanvasTopologyRevision`
- `clearPendingPoliticalColorEdit`
- `cancelExactAfterSettleRefresh`
- `invalidateAllRenderPasses`

The startup transaction owner does not call the setMapData owner and does not own setMapData reset.

## setMapData transaction reset inventory

The setMapData owner keeps this reset prelude:

- `runEffect("resetRendererTransactionState", {`
- `cancelHoverOverlayRender: true`
- `cancelSecondarySpatialBuild: true`
- `runEffect("clearPendingPoliticalColorEdit", {`
- `runEffect("clearLastGoodFrame", SET_MAP_DATA_REASON)`
- `runEffect("invalidateInteractionComposite", SET_MAP_DATA_REASON)`
- `runEffect("resetFirstVisibleFramePainted", SET_MAP_DATA_REASON)`
- `runEffect("invalidateAllRenderPasses", SET_MAP_DATA_REASON)`

This is the setMapData-specific transaction reset order. Future work must preserve this order before considering any common helper.

## resetRendererTransactionState inventory

`resetRendererTransactionState` remains in `js/core/map_renderer.js` for P39.

Current semantics:

- Accepts `cancelSecondarySpatialBuild = false`
- Accepts `cancelHoverOverlayRender = false`
- Accepts `hitCanvasDirty = false`
- Calls `resetRendererRefreshTransactionState({ cancelHoverOverlay: cancelHoverOverlayRender, cancelSecondarySpatialBuild })`
- Calls `markRendererTopologyChanged({ hitCanvasDirty })`

This function is the shared renderer transaction reset entry point currently consumed by setMapData and scenario refresh.

## resetRendererRefreshTransactionState inventory

`resetRendererRefreshTransactionState` remains in `js/core/map_renderer.js` for P39.

Current reset inventory:

- Clears dynamic border timer with `clearPendingDynamicBorderTimer()`
- Clears render phase timer with `clearRenderPhaseTimer()`
- Cancels index refresh with `cancelPendingIndexUiRefresh()`
- Cancels sidebar refresh with `cancelPendingSidebarRefresh()`
- Optionally cancels hover overlay render with `cancelScheduledHoverOverlayRender()`
- Sets render phase to `RENDER_PHASE_IDLE`
- Clears render diagnostics with `resetRenderDiagnostics()`
- Clears staged tasks with `clearStagedMapDataTasks()`
- Cancels exact-after-settle refresh with `cancelExactAfterSettleRefresh()`
- Cancels scheduled hit canvas work and clears `runtimeState.hitCanvasBuildScheduled`
- Optionally cancels secondary spatial build and clears `pendingSecondarySpatialBuildReasons`
- Clears deferred flags: `runtimeState.deferContextBasePass`, `runtimeState.deferHitCanvasBuild`, `runtimeState.deferExactAfterSettle`
- Clears `layerResolverCache.primaryRef`, `layerResolverCache.detailRef`, `layerResolverCache.bundleMode`, and `layerResolverCache.contextRevision`
- Clears dev hover/selection state: `runtimeState.devHoverHit`, `runtimeState.devSelectedHit`, `runtimeState.devSelectionFeatureIds`, `runtimeState.devSelectionOrder`
- Clears dev clipboard state: `runtimeState.devClipboardFallbackText`, `runtimeState.devClipboardPreviewFormat`
- Resets physical land clip path cache with `resetPhysicalLandClipPathCache()`

## markRendererTopologyChanged inventory

`markRendererTopologyChanged` remains in `js/core/map_renderer.js` for P39.

Current topology inventory:

- Calls `resetExactRefreshOptimizationState()`
- Calls `resetVisibleInternalBorderMeshSignature()`
- Bumps `runtimeState.topologyRevision`
- Optionally sets `runtimeState.hitCanvasDirty = true`
- Resets `runtimeState.hitCanvasTopologyRevision = 0`

## Scenario refresh reset consumers

Scenario refresh runtime remains separate and only receives `resetRendererTransactionState` as an injected dependency.

Current boundary:

- `js/core/map_renderer/scenario_refresh_runtime.js` owns scenario apply and scenario chunk promotion refresh semantics.
- `refreshMapDataForScenarioApply` consumes `resetRendererTransactionState({ hitCanvasDirty: true })`.
- Scenario refresh runtime does not import `set_map_data_transaction_owner.js`.
- P39 does not migrate scenario refresh runtime.

## Exact-after-settle reset boundary

Exact-after-settle scheduler remains separate.

Current boundary:

- `js/core/map_renderer/exact_after_settle_scheduler.js` owns exact scheduler cancel, schedule, apply, abort, and finalize semantics.
- `resetRendererRefreshTransactionState` calls the injected wrapper `cancelExactAfterSettleRefresh()`.
- Exact-after-settle scheduler does not import `set_map_data_transaction_owner.js`.
- Exact-after-settle scheduler does not import a shared reset helper.
- P39 does not migrate exact scheduler semantics.

## State-write and composition-root boundary

`js/core/map_renderer.js` remains the composition root.

Current boundary:

- No new state-write allowlist entry.
- No production reset owner/helper.
- No renamed renderer transaction reset owner/helper/controller under `js/core/**`.
- No `renderer_render_lifecycle_owner.js`.
- setMapData owner keeps injected effects.
- startup owner keeps injected effects.
- scenario refresh runtime keeps injected dependencies.

## P40/P41 allowed follow-up

P40 may compare startup reset, setMapData reset, scenario refresh reset, `resetRendererTransactionState`, `resetRendererRefreshTransactionState`, and `markRendererTopologyChanged` after this inventory is green.

P41+ may consider a small shared reset helper only if it preserves:

- Existing reset order.
- Existing injection boundaries.
- Existing composition-root ownership.
- setMapData-specific prelude semantics.
- scenario refresh runtime separation.
- exact-after-settle scheduler separation.

Based on the P39 inventory, a future helper looks possible as a P41+ candidate around pure reset sequencing. It should start from `resetRendererRefreshTransactionState` and `markRendererTopologyChanged` boundaries, then prove no render lifecycle, hit canvas build, scenario refresh, exact scheduler, or strategic runtime migration is bundled into the helper.

## Forbidden areas

P39 forbidden areas:

- No production runtime changes.
- No renamed renderer transaction reset owner/helper/controller under `js/core/**`.
- No `js/core/map_renderer.js` changes.
- No `js/core/map_renderer/set_map_data_transaction_owner.js` changes.
- No `js/core/renderer/renderer_startup_transaction_owner.js` changes.
- No `js/core/map_renderer/scenario_refresh_runtime.js` changes.
- No `js/core/map_renderer/exact_after_settle_scheduler.js` changes.
- No `js/core/map_renderer/public.js` changes.
- No `js/core/state/renderer_runtime_state.js` changes.
- No `tools/eslint-rules/state-writer-allowlist.json` changes.
- No `dist/app/**` changes.
- No `renderer_render_lifecycle_owner.js`.
- No drawCanvas migration.
- No renderPassToCache migration.
- No hit canvas migration.
- No scenario refresh migration.
- No exact scheduler migration.
- No strategic runtime migration.

## Required validation commands

- `node --check tests/renderer_transaction_reset_hardening_inventory_boundary.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
- `npm run test:node:renderer-transaction-reset-hardening-inventory`
- `npm run test:node:renderer-set-map-data-transaction`
- `npm run test:node:renderer-startup-transaction-owner`
- `npm run test:node:renderer-startup-transaction-inventory`
- `npm run test:node:renderer-runtime-state-behavior`
- `npm run test:node:render-transaction-diagnostics`
- `npm run test:node:scenario-refresh-plans`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `npm run verify:state-write-allowlist`
- `git diff --check`
