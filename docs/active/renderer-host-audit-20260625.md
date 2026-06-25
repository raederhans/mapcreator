# Renderer host audit and extraction map, 2026-06-25

## Scope and guardrails

P9 is an audit and boundary-lock step for the renderer host. It records the current `js/core/map_renderer.js` shape, the facade/export surface, the current runtime handle inventory, and the safe extraction order for P10+.

Guardrails:

- P9 does not move production behavior.
- P9 does not change `js/core/map_renderer.js`, `js/core/map_renderer/public.js`, `js/core/map_renderer/*`, or `js/core/renderer/*` production files.
- P9 does not add state-write allowlist entries.
- P9 does not touch `dist`.
- P9 writes only this audit document, `tests/renderer_host_inventory_boundary.test.mjs`, and the related `package.json` script.

This document intentionally names concrete files and symbols so P10 can move only static pass catalog constants while leaving DOM, canvas, SVG, d3, projection, zoom, event, scenario refresh, exact-after-settle, and runtime state write paths alone.

## Current renderer host overview

`js/core/map_renderer.js` is still the renderer host. It owns cross-subsystem orchestration, module-scope runtime handles, owner construction, and render pass composition. The opening comment already describes it as the central rendering shell whose owner/facade modules have been split while cross-domain orchestration remains in the file.

The public facade is `js/core/map_renderer/public.js`. It re-exports stable app/UI names from `../map_renderer.js` and groups them into lifecycle, selection/fill, strategic overlay editing, invalidation/refresh, diagnostics/export pass, and viewport categories. P10 must preserve these names.

Existing owner and facade distribution:

- `js/core/map_renderer/facade_data_runtime.js` owns data/runtime helper facade functions including layer source resolution, context layer loading, urban capability helpers, and facility info-card body helpers.
- `js/core/map_renderer/facade_border_runtime.js` owns border mesh source and coastline runtime helpers.
- `js/core/map_renderer/facade_spatial_runtime.js` owns index builders and spatial runtime facade wiring.
- `js/core/map_renderer/facade_overlay_runtime.js` owns strategic overlay editing helper facade functions.
- `js/core/map_renderer/scenario_refresh_runtime.js` owns scenario apply/chunk-promotion refresh runtime orchestration.
- `js/core/map_renderer/scenario_refresh_plans.js` and `js/core/map_renderer/scenario_visual_invalidation_executor.js` own scenario refresh plans and visual invalidation execution.
- `js/core/map_renderer/exact_after_settle_scheduler.js` owns exact-after-settle scheduling.
- `js/core/map_renderer/canvas_layer_manager.js` owns named canvas layer setup helpers and `CANVAS_LAYER_NAMES`.
- `js/core/map_renderer/hgo_runtime_preview_render_owner.js`, `interaction_hit_candidates.js`, and `political_raster_worker_packet.js` own HGO preview, hit candidate ranking, and worker packet helpers.
- `js/core/renderer/render_pipeline_passes.js`, `render_cache_owner.js`, `spatial_index_runtime_owner.js`, `border_mesh_owner.js`, `border_draw_owner.js`, `strategic_overlay_runtime_owner.js`, `strategic_overlay_render_owner.js`, `physical_layer_render_owner.js`, `ocean_render_owner.js`, `river_layer_render_owner.js`, `city_points_render_owner.js`, `city_lights_render_owner.js`, `scenario_relief_overlay_render_owner.js`, `transport_overview_render_owner.js`, `intensity_field_mask_owner.js`, and `render_transaction_diagnostics.js` own the current renderer owner slices.

## Module-scope runtime handles inventory

DOM/canvas/SVG handles in `js/core/map_renderer.js`:

- `mapContainer`
- `canvasLayers`
- `mapCanvas`
- `politicalPatchCanvas`
- `interactionOverlayCanvas`
- `hitCanvas`
- `mapSvg`
- `interactionRect`
- `tooltip`
- `context`
- `politicalPatchContext`
- `interactionOverlayContext`
- `hitContext`

Projection/path/zoom handles:

- `projection`
- `pathSVG`
- `pathCanvas`
- `pathHitCanvas`
- `zoomBehavior`
- `mapContainerResizeObserver`
- `mapContainerResizeFrame`
- `mapContainerResizeTimer`
- `pendingMapResizeReason`
- `browserPixelRatioMediaQuery`
- `browserPixelRatioMediaQueryHandler`
- `visualViewportResizeHandler`
- `resizeSpatialRefreshHandle`

Interaction handles:

- `interactionInfrastructureBasicPromise`
- `interactionInfrastructureFullPromise`
- `activeContextMetricSession`
- `lastHitCanvasBuildStats`
- `brushSession`
- `suppressNextClickAfterBrush`
- hover, facility card, tooltip, current tool, selected water/special region, dev selection, and inspector highlight state through `runtimeState`

Cache and diagnostic handles:

- texture caches: `textureAssetCache`, `texturePatternCache`, `textureGeometryCache`, `textureNoiseTileCache`
- `layerResolverCache`
- `objectIdentityTokenCache`
- `admin0MergedCache`
- `staticMeshCache`
- `countryDominantFillColorCache`
- `contourHostFillColorCache`
- `staticMeshSourceCountries`
- `scenarioPoliticalBackgroundCache`
- `scenarioPoliticalBackgroundDeferredFullCacheHandle`
- `scenarioPoliticalBackgroundDeferredFullCacheState`
- `physicalLandClipPathCache`
- warning sets and weak maps for spherical/water diagnostics
- `scenarioWaterPartPathCache`
- `scenarioWaterFeaturePathCache`
- `renderDiag`
- owner refs such as `renderCacheOwner`, `renderPipelinePassesOwner`, `spatialIndexRuntimeOwner`, `contextLayerResolverOwner`, `riverLayerRenderOwner`, `oceanRenderOwner`, `physicalLayerRenderOwner`, `cityLightsRenderOwner`, and `transportOverviewRenderOwner`

Overlay/editor handles:

- `viewportGroup`
- `strategicDefs`
- `frontlineOverlayGroup`
- `frontlineLabelsGroup`
- `operationalLinesGroup`
- `operationGraphicsGroup`
- `operationGraphicsEditorGroup`
- `unitCountersGroup`
- `specialZonesGroup`
- `specialZoneEditorGroup`
- `hoverGroup`
- `devSelectionGroup`
- `inspectorHighlightGroup`
- `intensityFieldPreviewGroup`
- `legendControlElement`
- `legendControlHeaderElement`
- `legendControlBodyElement`
- `legendOpacityPanelElement`
- `legendOpacityInputElement`
- `legendDragSession`
- `legendResizeSession`
- `lastLegendKey`

## Import dependency map

State/data/runtime imports:

- `./state.js` supplies `runtimeState` plus color/style/intensity state helpers.
- `./state/renderer_runtime_state.js` supplies renderer runtime state helpers.
- `./state/strategic_overlay_state.js` supplies strategic overlay editor defaults.
- `./dirty_state.js`, `./history_manager.js`, `./perf_probe.js`, `./render_boundary.js`, and `./state/index.js` connect dirty tracking, history, perf, render boundary, and runtime hooks.

Renderer owners:

- `./renderer/render_pipeline_passes.js`
- `./renderer/render_cache_owner.js`
- `./renderer/render_transaction_diagnostics.js`
- `./renderer/spatial_index_runtime_owner.js`
- `./renderer/border_mesh_owner.js`
- `./renderer/border_draw_owner.js`
- `./renderer/physical_layer_render_owner.js`
- `./renderer/ocean_render_owner.js`
- `./renderer/river_layer_render_owner.js`
- `./renderer/city_points_render_owner.js`
- `./renderer/city_lights_render_owner.js`
- `./renderer/scenario_relief_overlay_render_owner.js`
- `./renderer/transport_overview_render_owner.js`
- `./renderer/strategic_overlay_runtime_owner.js`
- `./renderer/strategic_overlay_render_owner.js`
- `./renderer/intensity_field_mask_owner.js`

Map renderer facades/runtime modules:

- `./map_renderer/facade_data_runtime.js`
- `./map_renderer/facade_border_runtime.js`
- `./map_renderer/facade_spatial_runtime.js`
- `./map_renderer/facade_overlay_runtime.js`
- `./map_renderer/scenario_refresh_runtime.js`
- `./map_renderer/scenario_refresh_plans.js`
- `./map_renderer/scenario_visual_invalidation_executor.js`
- `./map_renderer/exact_after_settle_scheduler.js`
- `./map_renderer/exact_after_settle_refresh_plans.js`
- `./map_renderer/canvas_layer_manager.js`
- `./map_renderer/hgo_runtime_preview_render_owner.js`
- `./map_renderer/interaction_hit_candidates.js`
- `./map_renderer/political_raster_worker_packet.js`

UI/runtime hooks:

- `./i18n.js`
- `./legend_manager.js`
- `./interaction_funnel.js`
- UI callbacks attached through `runtimeState`, such as list refresh, inspector refresh, overlay UI, recent color UI, and zoom UI functions

Scenario/chunk/context layer:

- `./scenario/presentation_hint_helpers.js`
- `./scenario/strategic_values.js`
- `./scenario_country_display.js`
- context layer helpers through `facade_data_runtime`
- scenario refresh and visual invalidation modules under `js/core/map_renderer`

Worker/perf/history/i18n/render boundary:

- `./political_raster_worker_client.js`
- `./frame_scheduler.js`
- `./perf_probe.js`
- `./history_manager.js`
- `./i18n.js`
- `./render_boundary.js`

P10 low-risk extraction prerequisite:

- The pass catalog constants are currently static metadata: `RENDER_PASS_NAMES`, `TRANSFORM_REUSED_RENDER_PASS_NAMES`, `VIEWPORT_STABLE_RENDER_PASS_SIGNATURE_NAMES`, `INTERACTION_COMPOSITE_PASS_NAMES`, `TRANSFORMED_FRAME_PASS_NAMES`, and `RENDER_PASS_OVERSCAN_RATIO_PER_SIDE`.
- These constants are consumed by owners and render helpers but do not require DOM, d3, canvas, projection, event handlers, or `runtimeState` writes.

High-risk coupling points:

- `initMap`, `setMapData`, and render refresh reset order.
- DOM/canvas/SVG/projection/zoom handle lifecycle.
- click/hover/fill/selection runtime authority.
- scenario refresh and exact-after-settle state writes.
- render cache and visible frame transaction state.

## Public export map

`js/core/map_renderer/public.js` is the stable app/UI facade. P10 must not break these names.

Lifecycle exports:

- `buildInteractionInfrastructureAfterStartup`
- `initMap`
- `render`
- `setMapData`

Selection/fill exports:

- `addFeatureToDevSelection`
- `applyDevMacroFillCurrentCountry`
- `applyDevMacroFillCurrentOwnerScope`
- `applyDevMacroFillCurrentParentGroup`
- `applyDevSelectionFill`
- `autoFillMap`
- `clearDevSelection`
- `removeLastDevSelection`
- `toggleFeatureInDevSelection`

Strategic overlay editing exports:

- `startOperationalLineDraw`
- `startOperationGraphicDraw`
- `startUnitCounterPlacement`
- `startSpecialZoneDraw`
- related cancel, finish, undo, select, delete, update, and preview helpers

Invalidation/refresh exports:

- `invalidateAllRenderPasses`
- `invalidateContextLayerVisualStateBatch`
- ocean invalidation helpers
- `recomputeDynamicBordersNow`
- `reconcileDetailPromotionPoliticalPass`
- `refreshColorState`
- `refreshResolvedColorsForFeatures`
- `scheduleDynamicBorderRecompute`

Diagnostics/export pass exports:

- `renderExportPassesToCanvas`
- `renderLegend`
- `RENDER_PASS_NAMES`
- read-model helpers used by UI, diagnostics, and export tooling

Viewport exports:

- `getZoomPercent`
- `resetZoomToFit`
- `setDebugMode`
- `setZoomPercent`
- `zoomByStep`

## Direct runtime state write map

Direct writes are concentrated in allowlisted files and should remain visible during migration.

Init/setMapData/render refresh reset:

- `initMap` writes canvas and context handles into `runtimeState`, resets render phase fields, tooltip state, staged/deferred flags, and renderer callbacks.
- `setMapData` resets topology revision, hit canvas state, color maps, special/water region selection, dev selection, staged handles, and chunk/topology state.

Render transaction/cache flags:

- `runtimeState.deferContextBasePass`
- `runtimeState.deferHitCanvasBuild`
- `runtimeState.deferExactAfterSettle`
- `runtimeState.hitCanvasDirty`
- `runtimeState.hitCanvasBuildScheduled`
- `runtimeState.stagedContextBaseHandle`
- `runtimeState.stagedHitCanvasHandle`
- `runtimeState.firstVisibleFramePainted`
- cache and metric state under render pass cache helpers

Scenario refresh runtime:

- `js/core/map_renderer/scenario_refresh_runtime.js` is allowlisted and owns scenario/chunk refresh writes such as visible chunk data and hit canvas invalidation.

Exact-after-settle scheduler:

- `js/core/map_renderer/exact_after_settle_scheduler.js` is allowlisted and owns exact settle handles plus `deferExactAfterSettle` and `pendingExactPoliticalFastFrame` transitions.

Viewport/zoom transform:

- `runtimeState.zoomTransform`
- `runtimeState.pendingZoomTransform`
- zoom gesture fields
- hit canvas dirty flags
- `updateZoomUIFn` callback usage

Click/hover/selection/fill:

- hovered land/water/special IDs
- selected water/special IDs
- selected color and active sovereign code
- dev selection sets and order
- hover/dev/inspector overlay dirty flags

Strategic overlay runtime:

- operation graphics, operational lines, unit counters, and special zone editor state
- cached frontline mesh and label anchors
- strategic overlay dirty flags and UI callbacks

Sidebar/diagnostics/perf counters:

- list refresh callbacks
- inspector callbacks
- legend UI callback
- render perf metrics and counters
- render diagnostics snapshots

Current allowlist entries:

- `js/core/map_renderer.js`
- `js/core/map_renderer/exact_after_settle_scheduler.js`
- `js/core/map_renderer/scenario_refresh_runtime.js`

Future migration direction:

- Pure static metadata should move to owner-local modules.
- Runtime state updates with a stable transaction boundary should move toward owner-local context or explicit `renderer_runtime_state` state ops.
- DOM/canvas/projection/zoom context migration needs separate ordered tests and should remain out of P10.

## Current test coverage map

Node renderer tests:

- `tests/render_runtime_binding_behavior.test.mjs`
- `tests/main_render_runtime_binding_boundary.test.mjs`
- `tests/test_map_renderer_public_contract.py`
- `tests/test_map_renderer_public_api_import_contract.py`

Renderer runtime state tests:

- `tests/renderer_runtime_state_behavior.test.mjs`
- `tests/test_renderer_runtime_state_boundary_contract.py`

Render transaction diagnostics tests:

- `tests/render_transaction_diagnostics_behavior.test.mjs`
- related architecture boundary checks for diagnostics ownership

Scenario refresh plans / visual invalidation tests:

- `tests/scenario_refresh_plans_behavior.test.mjs`
- `tests/scenario_visual_invalidation_executor_behavior.test.mjs`

Exact-after-settle refresh plan tests:

- `tests/exact_after_settle_refresh_plans_behavior.test.mjs`

Canvas layer manager tests:

- `tests/canvas_layer_manager_behavior.test.mjs`

Owner tests:

- border: `tests/border_draw_owner_behavior.test.mjs`, `tests/border_mesh_owner_behavior.test.mjs`, Python boundary contracts
- physical/ocean/river: `tests/physical_layer_render_owner_behavior.test.mjs`, `tests/ocean_render_owner_behavior.test.mjs`, `tests/river_layer_render_owner_behavior.test.mjs`
- city: `tests/city_points_render_owner_behavior.test.mjs`, `tests/city_lights_render_owner_behavior.test.mjs`, city label boundary contracts
- strategic overlay: `tests/strategic_overlay_runtime_owner_behavior.test.mjs`, `tests/strategic_overlay_render_owner_behavior.test.mjs`, boundary contracts
- intensity field: `tests/test_map_renderer_asset_url_and_facility_surface_contract.py` and renderer owner boundary checks

E2E smoke / TNO ready-state / scenario chunk runtime coverage:

- `npm run test:e2e:dev:tno-ready-state`
- `npm run test:e2e:smoke`
- `tests/scenario_chunk_contracts.test.mjs`

Architecture boundaries:

- `npm run verify:architecture-boundaries`
- owner boundary Python contracts under `tests/test_map_renderer_*_boundary_contract.py`

State-write allowlist:

- `npm run verify:state-write-allowlist`
- `tools/eslint-rules/state-writer-allowlist.json`

Known gaps before P9/P10:

- No renderer host inventory boundary test.
- No module-scope handles inventory lock.
- No public facade category lock focused on P9/P10.
- No future extraction candidate lock.
- No dedicated render pass catalog behavior test.

## Extraction candidate ranking

1. P10 low-risk candidates

- Render pass catalog/constants extraction:
  - `RENDER_PASS_NAMES`
  - `TRANSFORM_REUSED_RENDER_PASS_NAMES`
  - `VIEWPORT_STABLE_RENDER_PASS_SIGNATURE_NAMES`
  - `INTERACTION_COMPOSITE_PASS_NAMES`
  - `TRANSFORMED_FRAME_PASS_NAMES`
  - `RENDER_PASS_OVERSCAN_RATIO_PER_SIDE`
- These are static catalog/policy values with no DOM, no d3, no browser event dependency, and no direct `runtimeState` writes.
- `map_renderer.js` can continue importing them and directly re-export `RENDER_PASS_NAMES` so the public facade stays stable.

2. P11 medium-risk candidates

- Render cache and visible frame transaction wrapper consolidation.
- Diagnostics read-model/helper consolidation.
- Viewport shell preparation, only after ordered zoom/projection/render tests are in place.
- Render pass invalidation vocabulary consolidation, if it remains static and owner-readable.

3. High-risk deferred candidates

- DOM/canvas/SVG/projection/zoom handle context migration.
- `initMap` / `setMapData` restructuring.
- click/fill/hover/selection runtime authority migration.
- scenario refresh and exact-after-settle direct state write migration.
- strategic overlay runtime authority migration.

## Recommended first renderer extraction

P10 should extract `render pass catalog/constants` into `js/core/map_renderer/render_pass_catalog.js`.

Why this is safer than the other candidates:

- It is primarily static catalog/policy data.
- It does not touch DOM, canvas, SVG, d3, projection, zoom, or browser events.
- It does not add `runtimeState` writes.
- It preserves the `RENDER_PASS_NAMES` public export through `map_renderer.js`.
- It can be locked by a Node catalog test with exact order and group membership checks.
- It gives render pipeline/cache/exact-after-settle follow-up work a stable naming source.

P10 acceptance standards:

- Public facade export names stay unchanged.
- No production behavior change beyond moving static constants.
- No state-write allowlist change.
- Architecture boundaries pass and lock catalog ownership.
- Render pass catalog test passes.
- Renderer runtime, render transaction diagnostics, scenario refresh plans, exact-after-settle refresh plans, canvas layer manager, TNO ready-state, and smoke tests pass or any environment blocker is reported exactly.

## Validation commands for P9

Required P9 commands:

```bash
node --check tests/renderer_host_inventory_boundary.test.mjs
npm run test:node:renderer-host-inventory
npm run verify:architecture-boundaries
npm run verify:state-write-allowlist
npm run test:node:renderer-runtime-state-behavior
npm run test:node:render-transaction-diagnostics
npm run test:node:scenario-refresh-plans
npm run test:node:exact-after-settle-refresh-plans
npm run test:node:canvas-layer-manager
npm run test:e2e:dev:tno-ready-state
npm run test:e2e:smoke
```

P10 adds:

```bash
node --check js/core/map_renderer/render_pass_catalog.js
node --check js/core/map_renderer.js
node --check tests/render_pass_catalog_behavior.test.mjs
npm run test:node:render-pass-catalog
```

## Validation results, 2026-06-25

Passed:

- `node --check js/core/map_renderer/render_pass_catalog.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/render_pass_catalog_behavior.test.mjs`
- `node --check tests/renderer_host_inventory_boundary.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `node --check tests/scenario_chunk_contracts.test.mjs`
- `npm run python -- -m py_compile tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`
- `npm run test:node:renderer-host-inventory` 7/7
- `npm run test:node:render-pass-catalog` 6/6
- `npm run verify:architecture-boundaries`
- `npm run verify:state-write-allowlist`
- `npm run test:node:renderer-runtime-state-behavior` 10/10
- `npm run test:node:render-transaction-diagnostics` 21/21
- `npm run test:node:scenario-refresh-plans` 22/22
- `npm run test:node:exact-after-settle-refresh-plans` 8/8
- `npm run test:node:canvas-layer-manager` 4/4
- `npm run verify:test-import-graph` 49 specs
- `npm run test:node:renderer-splits` 51/51
- `npm run test:node:scenario-chunk-contracts` 57/57
- `npm run python -- -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q` 5/5
- `npm run test:e2e:dev:tno-ready-state` 5/5
- `npm run test:e2e:smoke` 4/4
- `git diff --check`

Notes:

- Browser smoke reported the existing local backend `/api/backend/auth/me` 401 probe and D3 unsafe water geometry warnings; the smoke suite passed.
- The isolated worktree used a temporary ignored `node_modules` junction to the parent checkout dependencies for Playwright execution, then removed it before final diff checks.
- `dist/app/**` and `tools/eslint-rules/state-writer-allowlist.json` were left untouched.
