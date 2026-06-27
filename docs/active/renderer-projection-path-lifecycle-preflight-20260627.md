# Renderer Projection/Path Lifecycle Preflight P27

## Scope and guardrails

P27 is a preflight guard pass for the projection/path lifecycle owner planned for P28. The owned surface is documentation, inventory tests, package scripts, and architecture tooling.

Production renderer runtime source stays behavior-stable in P27. `js/core/map_renderer.js`, `js/core/renderer/renderer_surface_host.js`, and `js/core/renderer/renderer_surface_lifecycle_owner.js` are current-state evidence for this document and the inventory test. `dist/app/**` is outside this pass because P27 does not change runtime source or generated app files.

State-write allowlist remains unchanged. P27 does not add `js/core/renderer/renderer_projection_path_owner.js`; that filename is reserved for P28.

## Current P26 surface lifecycle state

P26 added `js/core/renderer/renderer_surface_lifecycle_owner.js` for mechanical surface lifecycle setup. It owns DOM root and tooltip lookup, named canvas layer handle registration, hit canvas handle creation, and 2D context acquisition through injected dependencies.

`js/core/map_renderer.js` remains the composition root. It creates the surface host, lazily creates the surface lifecycle owner, injects all dependencies, and still owns the `initMap` lifecycle order.

The P26 owner remains mechanical-only. It imports no state module, imports no `map_renderer.js`, and does not mention projection/path creation, fitting, zoom, event, render, hit-build, selection/fill, scenario refresh/chunk, exact-after-settle, or strategic overlay semantics.

## Current projection/path creation order

`initMap` currently creates projection/path handles after surface handles and contexts are available:

1. Require `globalThis.d3`.
2. Resolve DOM handles through the surface lifecycle owner.
3. Run facility card setup.
4. Run `ensureHybridLayers()`.
5. Ensure the hit canvas handle.
6. Acquire map, political patch, interaction overlay, and hit 2D contexts.
7. Fail fast when map or hit context acquisition fails.
8. Create `nextProjection` with `globalThis.d3.geoEqualEarth().precision(PROJECTION_PRECISION)`.
9. Register `projection`, `pathSVG`, `pathCanvas`, and `pathHitCanvas` in `rendererSurfaceHost`.
10. Continue cache reset, runtimeState bridge writes, `setCanvasSize()`, `fitProjection(...)`, `initZoom()`, `bindEvents()`, and initial render.

P28 should preserve this position in the ordering by calling the projection/path owner exactly where these four handle registrations currently occur.

## Projection/path handle inventory

The current handle registry stores four projection/path handles:

- `projection`: created from `globalThis.d3.geoEqualEarth().precision(PROJECTION_PRECISION)`.
- `pathSVG`: created from `globalThis.d3.geoPath(nextProjection).pointRadius(PATH_POINT_RADIUS)`.
- `pathCanvas`: created from `globalThis.d3.geoPath(nextProjection, rendererSurfaceHost.getContext()).pointRadius(PATH_POINT_RADIUS)`.
- `pathHitCanvas`: created from `globalThis.d3.geoPath(nextProjection, rendererSurfaceHost.getHitContext()).pointRadius(PATH_POINT_RADIUS)`.

The current required inputs are:

- `globalThis.d3`.
- `PROJECTION_PRECISION`.
- `PATH_POINT_RADIUS`.
- `rendererSurfaceHost.getContext()`.
- `rendererSurfaceHost.getHitContext()`.

P28 may create these handles through injected dependencies and register them into `rendererSurfaceHost`.

## Projection/path consumer inventory

Projection/path handles currently feed these consumer groups:

- Projected geometry bounds owner receives `getProjection`, `getPathCanvas`, and `getPathSvg` through injected getters.
- Viewport read model owner receives `getProjection` and `getPathSvg` through injected getters and uses projected bounds helpers for viewport calculations.
- Viewport command and viewport resize paths depend on projection-derived read models through `fitProjection`, reset wrappers, and zoom extent updates.
- Zoom lifecycle uses viewport transforms and command wrappers; it does not own projection creation.
- HGO runtime preview render owner receives `getProjection`, `getMapSvg`, and target canvas getters.
- Intensity field mask owner receives `getProjection`.
- Render owners such as physical, river, ocean, city lights, transport overview, border draw, special zone layers, and strategic overlay helpers consume projection/path handles through getters.
- Hit canvas paths consume `pathHitCanvas` during hit canvas construction and hit lookup.

These consumers should continue receiving handles through `rendererSurfaceHost` getters after P28.

## fitProjection side-effect inventory

`fitProjection({ skipSpatialIndex = false } = {})` currently owns fitting and side effects:

- Guard on `runtimeState.landData`, `runtimeState.width`, and `runtimeState.height`.
- Compute padding from `PROJECTION_FIT_PADDING_RATIO`.
- Resolve logical canvas dimensions and renderable land features.
- Call `rendererSurfaceHost.getProjection().fitExtent([[padding, padding], [x1, y1]], fitTarget)`.
- Reset `cityAnchorCache`.
- Call `rebuildProjectedBoundsCache()`.
- Optionally call `buildSpatialIndex()`.
- Set `runtimeState.hitCanvasDirty = true`.
- Call `updateSpecialZonesPaths()`.
- Call `renderSpecialZoneEditorOverlay()`.
- Call `updateZoomTranslateExtent()`.
- Call `markAllOverlaysDirty()`.

`fitProjection` is not P28 scope.

## Projected bounds and viewport dependency map

Projected geometry bounds are already isolated in `projected_geometry_bounds_owner.js`, but that owner depends on injected getters for `projection`, `pathCanvas`, and `pathSvg`. It does not import `map_renderer.js`.

Viewport read model logic is already isolated in `viewport_read_model_owner.js`, but it depends on injected getters for `projection`, `pathSvg`, zoom identity, land features, HGO preview bounds, and projected feature bounds. It does not import `map_renderer.js`.

Viewport command and resize owners call wrappers such as `calculatePanExtent`, `getCenteredFitZoomTransform`, `fitProjection`, `resetZoomToFit`, and `updateZoomTranslateExtent` through injected callbacks. These wrappers should remain owned by `map_renderer.js` until a later fitting or viewport orchestration pass.

## P28 allowed first move

P28 may add `js/core/renderer/renderer_projection_path_owner.js`.

P28 may move only projection/path handle creation and registration:

- Create the Equal Earth projection through injected `d3` and `projectionPrecision`.
- Create SVG, canvas, and hit-canvas paths through injected `d3`, `pointRadius`, map context getter, and hit context getter.
- Register `projection`, `pathSVG`, `pathCanvas`, and `pathHitCanvas` into `rendererSurfaceHost`.
- Preserve `initMap` ordering by calling the owner exactly where projection/path creation currently happens.
- Keep `js/core/map_renderer.js` as the composition root.

## P28 forbidden areas

P28 must not move `fitProjection`.

P28 must not add `projection.fitExtent` to `js/core/renderer/renderer_projection_path_owner.js`.

P28 must not move:

- Direct runtimeState writes.
- `setCanvasSize`.
- `updateMap`.
- `drawCanvas`.
- `renderPassToCache`.
- Hit canvas build.
- Selection/fill.
- Scenario refresh/chunk.
- Exact-after-settle.
- Strategic overlay runtime.
- Render lifecycle owner work.

Any new renderer owner must keep the existing import direction: owners do not import `js/core/map_renderer.js`; `map_renderer.js` remains the composition root.

## Required validation commands

P27 required validation:

```bash
node --check tests/renderer_projection_path_lifecycle_inventory_boundary.test.mjs
node --check tools/check_architecture_boundaries.mjs
npm run test:node:renderer-projection-path-lifecycle-inventory
npm run test:node:renderer-surface-lifecycle
npm run test:node:renderer-surface-host
npm run test:node:renderer-host-inventory
npm run test:node:projected-geometry-bounds-owner
npm run test:node:viewport-read-model-owner
npm run verify:architecture-boundaries
npm run verify:state-write-allowlist
npm run verify:test-import-graph
git diff --check
```

Suggested runtime confidence validation when time and local dependencies allow it:

```bash
npm run test:node:renderer-runtime-state-behavior
npm run test:node:canvas-layer-manager
npm run test:node:viewport-command-owner
npm run test:node:viewport-resize-lifecycle-owner
npm run test:node:zoom-interaction-lifecycle-owner
npm run test:e2e:dev:tno-ready-state
npm run test:e2e:smoke
```
