# Renderer Fit Projection Lifecycle Preflight P31

## Scope and guardrails

P31 is preflight only. It adds docs, inventory tests, package script wiring, and architecture guardrails for a future fitProjection lifecycle owner. It does not change production renderer runtime, `dist/app/**`, or `tools/eslint-rules/state-writer-allowlist.json`.

P32 may add `js/core/renderer/renderer_fit_projection_owner.js`. P32 may only move fitProjection orchestration through dependency-injected getters and effects. `js/core/map_renderer.js` remains the composition root.

## Current P30 surface/projection/svg lifecycle baseline

The current renderer lifecycle baseline is:

- `js/core/renderer/renderer_surface_host.js` is registry-only for DOM, canvas, SVG, projection, path, context, zoom, and overlay handles.
- `js/core/renderer/renderer_surface_lifecycle_owner.js` owns DOM lookup, canvas layer registration, hit canvas handle creation, and 2D context acquisition.
- `js/core/renderer/renderer_projection_path_owner.js` owns Equal Earth projection creation and SVG/canvas/hit path creation plus registration.
- `js/core/renderer/renderer_svg_surface_lifecycle_owner.js` owns SVG root, static viewport groups, strategic defs, preview group, and interaction rect creation plus registration.
- `js/core/map_renderer.js` remains the composition root and owns fitProjection.

## Current fitProjection call sites

`fitProjection({ skipSpatialIndex = false } = {})` lives in `js/core/map_renderer.js`.

Current call sites include map data setup and resize orchestration. `viewport_resize_lifecycle_owner.js` currently calls fitProjection as an injected effect through `effects.fitProjection?.({ skipSpatialIndex: interactiveLayoutResize });`, while `map_renderer.js` provides the wrapper effect in `getViewportResizeLifecycleOwner()`.

## fitProjection input inventory

Current fitProjection inputs are:

- `runtimeState.landData`
- `runtimeState.width`
- `runtimeState.height`
- `PROJECTION_FIT_PADDING_RATIO`
- `getLogicalCanvasDimensions()`
- `getRenderableLandFeatures(canvasWidth, canvasHeight, { forceProd: true })`
- `rendererSurfaceHost.getProjection()`

These inputs stay owned by `map_renderer.js` during P31. P32 may pass them into a new owner only through injected getters.

## fitProjection side-effect inventory

Current fitProjection side effects are:

- `projection.fitExtent`
- `cityAnchorCache = new WeakMap();`
- `rebuildProjectedBoundsCache();`
- `buildSpatialIndex();` when `skipSpatialIndex` is false
- `runtimeState.hitCanvasDirty = true;`
- `updateSpecialZonesPaths();`
- `renderSpecialZoneEditorOverlay();`
- `updateZoomTranslateExtent();`
- `markAllOverlaysDirty();`

P32 may preserve these side effects through injected effects from `map_renderer.js` or existing state operation helpers. The future owner must not directly write `runtimeState`.

## Projected bounds dependency map

`projected_geometry_bounds_owner.js` owns projected bounds calculations and cache rebuild helpers through injected getters and effects. `map_renderer.js` currently wraps `rebuildProjectedBoundsCache()` and calls `getProjectedGeometryBoundsOwner().rebuildProjectedBoundsCache()`.

P32 may call a projected-bounds rebuild effect supplied by `map_renderer.js`. It must not reimplement projected bounds calculation inside a fitProjection owner.

## Spatial index and hit-canvas dependency map

`buildSpatialIndex()` remains outside the fitProjection owner during P31. Current fitProjection calls it only when `skipSpatialIndex` is false.

`runtimeState.hitCanvasDirty = true;` is a state write owned by `map_renderer.js` today. P32 must keep that write as an injected effect, such as `setHitCanvasDirty`, or route it through an existing state operation boundary.

Render pass execution is not part of P32. Hit canvas build and render lifecycle behavior stay outside fitProjection owner scope.

## Special zone and overlay dependency map

Current fitProjection refreshes special zone paths and the editor overlay through `updateSpecialZonesPaths();` and `renderSpecialZoneEditorOverlay();`.

Current fitProjection also dirties overlays through `markAllOverlaysDirty();`. P32 may call these through injected effects. Strategic overlay runtime, selection/fill, scenario refresh/chunk, exact-after-settle, and render pass execution stay outside the future owner.

## Viewport command/resize dependency map

`viewport_read_model_owner.js` owns read-model calculations such as viewport bounds, pan extent, projected renderable content bounds, centered fit transforms, and zoom percent.

`viewport_command_owner.js` owns zoom command effects including `updateZoomTranslateExtent`, `resetZoomToFit`, and `enforceZoomConstraints`.

`viewport_resize_lifecycle_owner.js` currently calls fitProjection as an injected effect and must keep using the same wrapper/effect shape after P32. P32 must preserve the existing `fitProjection` wrapper name in `map_renderer.js`.

## P32 allowed first move

P32 may add `js/core/renderer/renderer_fit_projection_owner.js`.

P32 may move fitProjection orchestration into the owner only through injected getters and effects:

- Read land data, dimensions, padding ratio, logical canvas dimensions, renderable features, and projection through injected getters.
- Call projection fit, city anchor cache reset, projected bounds rebuild, spatial index build, hit canvas dirtying, special zone path refresh, editor overlay refresh, zoom translate extent update, and overlay dirtying through injected effects.
- Preserve `js/core/map_renderer.js` as the composition root.
- Preserve the existing `fitProjection` wrapper name in `js/core/map_renderer.js`.
- Keep viewport resize lifecycle using the same fitProjection wrapper/effect.

## P32 forbidden areas

P32 must not put these in `js/core/renderer/renderer_fit_projection_owner.js`:

- Direct `runtimeState` writes.
- Import of `js/core/map_renderer.js`.
- `drawCanvas`.
- `renderPassToCache`.
- Hit canvas build.
- Selection/fill.
- Scenario refresh/chunk.
- Exact-after-settle.
- Strategic overlay runtime.
- Render lifecycle owner.
- `setMapData` migration.
- `initZoom` or `bindEvents` migration.
- Renderer public facade change.

## Required validation commands

```bash
node --check tests/renderer_fit_projection_lifecycle_inventory_boundary.test.mjs
node --check tools/check_architecture_boundaries.mjs
npm run test:node:renderer-fit-projection-lifecycle-inventory
npm run test:node:renderer-svg-surface-lifecycle
npm run test:node:renderer-projection-path-lifecycle
npm run test:node:renderer-surface-lifecycle
npm run test:node:renderer-surface-host
npm run test:node:viewport-read-model-owner
npm run test:node:viewport-command-owner
npm run test:node:viewport-resize-lifecycle-owner
npm run test:node:projected-geometry-bounds-owner
npm run verify:architecture-boundaries
npm run verify:state-write-allowlist
npm run verify:test-import-graph
git diff --check
```
