# Renderer Surface Lifecycle Preflight P25

## Scope and guardrails

P25 is a preflight guard pass for the surface lifecycle wrapper planned for P26. The owned surface is docs, tests, package scripts, and architecture tooling.

Production renderer runtime source stays behavior-stable in P25. `js/core/map_renderer.js` and `js/core/renderer/renderer_surface_host.js` are current-state evidence for this document and the inventory test. `dist/app/**` is outside this pass because P25 does not change runtime source or generated app files.

State-write allowlist remains unchanged. `js/core/renderer/renderer_surface_host.js` stays absent from `tools/eslint-rules/state-writer-allowlist.json`.

## Current P24 surface host state

P24 added `js/core/renderer/renderer_surface_host.js` and wired `js/core/map_renderer.js` to use a single `rendererSurfaceHost` instance.

The host is a handle registry. It defines handle keys, initializes null handles, normalizes `undefined` to `null`, exposes getters/setters, supports grouped `setMany`, supports `reset`, and returns metadata-only `snapshot` diagnostics.

The host owns no render, draw, hit, selection, scenario, projection fitting, zoom, event, resize, or runtimeState semantics. `js/core/map_renderer.js` remains the composition root and the only production importer of `renderer_surface_host.js`.

## Current initMap surface lifecycle map

`initMap` still owns the current lifecycle order:

1. Require `globalThis.d3`.
2. Look up the map container, tooltip, and facility card DOM references.
3. Install facility card event listeners.
4. Run `ensureHybridLayers()`.
5. Create the hit canvas if missing.
6. Acquire map, patch, interaction overlay, and hit 2D contexts.
7. Create projection and SVG/canvas/hit path handles.
8. Reset renderer caches and runtime flags.
9. Write the runtimeState bridge handles.
10. Apply pointer/touch styles to canvases.
11. Run `setCanvasSize()`.
12. Build interaction index or mark startup deferral.
13. Rebuild static mesh state and fit projection.
14. Initialize zoom and bind map events.
15. Render the initial frame unless suppressed.

## DOM/root lifecycle inventory

`initMap` directly owns:

- `document.getElementById(containerId)` for the map root.
- `document.getElementById("tooltip")`.
- Facility card references: card root, title, body, zoom button, close button, and more button.
- Facility card click listener binding and initial card state application.

P26 may mechanically move map root and tooltip lookup into a surface lifecycle owner. Facility card behavior should stay in `map_renderer.js` until a dedicated facility surface lifecycle pass exists.

## Canvas lifecycle inventory

`ensureHybridLayers()` still owns the canvas layer bridge:

- Removal or hiding of legacy color/line canvas elements.
- `ensureCanvasLayers(...)` call.
- Registration of map canvas, political patch canvas, and interaction overlay canvas into `rendererSurfaceHost`.
- Canvas layer resize through `setCanvasSize()`.
- Hit canvas creation through `createHitCanvasElement()` and `rendererSurfaceHost.setHitCanvas(...)`.
- Pointer and touch style assignment in `initMap`.

P26 may move only mechanical canvas layer ensure/get registration and 2D context acquisition. Hit canvas creation may move only as an injected helper bridge that preserves current ordering.

## SVG/group lifecycle inventory

`ensureHybridLayers()` still owns SVG root and group creation:

- `createSvgElement()` for `#map-svg`.
- `viewport-layer`.
- Strategic overlay defs and groups.
- Operational lines, operation graphics, editor layers, unit counters, special zones, hover, development selection, inspector highlight, intensity preview, and interaction rect.
- Legacy SVG cleanup and legend group cleanup.

P26 may move SVG root/group creation only if `ensureHybridLayers()` can move without changing its current ordering with canvas setup and interaction rect setup.

## Context acquisition inventory

`initMap` still acquires contexts directly:

- `rendererSurfaceHost.getMapCanvas().getContext("2d")`.
- Political patch context.
- Interaction overlay context.
- Hit context with `{ willReadFrequently: true }`.

P26 may move 2D context acquisition into `rendererSurfaceHost` registration mechanics. It should keep the current hard failures for missing map and hit contexts.

## Projection/path lifecycle inventory

`initMap` still creates the projection and paths:

- `globalThis.d3.geoEqualEarth().precision(PROJECTION_PRECISION)`.
- `globalThis.d3.geoPath(nextProjection).pointRadius(PATH_POINT_RADIUS)`.
- `globalThis.d3.geoPath(nextProjection, rendererSurfaceHost.getContext()).pointRadius(PATH_POINT_RADIUS)`.
- `globalThis.d3.geoPath(nextProjection, rendererSurfaceHost.getHitContext()).pointRadius(PATH_POINT_RADIUS)`.

Projection/path creation remains renderer semantics for P26. The P26 surface lifecycle owner should receive already-created or host-registered handles only for DOM/canvas/SVG mechanics.

## Zoom/event lifecycle inventory

`initZoom()` and `bindEvents()` remain in `js/core/map_renderer.js` as wrapper functions:

- `initZoom()` delegates to `getZoomInteractionLifecycleOwner().initZoom()`.
- `bindEvents()` delegates to `getMapInteractionEventBindingOwner().bindEvents()`.
- `initMap` still calls `initZoom();` then `bindEvents();` after projection fitting.

P26 should leave zoom behavior creation, zoom transform semantics, interaction event binding, and renderer event side effects in the current owners and `map_renderer.js` wrappers.

## RuntimeState bridge write inventory

`initMap` still writes the bridge from surface handles to `runtimeState`:

- `runtimeState.colorCanvas = rendererSurfaceHost.getMapCanvas()`.
- `runtimeState.canvasLayers = rendererSurfaceHost.getCanvasLayers()`.
- `runtimeState.lineCanvas = null`.
- `runtimeState.colorCtx = rendererSurfaceHost.getContext()`.
- `runtimeState.politicalPatchCanvas = rendererSurfaceHost.getPoliticalPatchCanvas()`.
- `runtimeState.politicalPatchCtx = rendererSurfaceHost.getPoliticalPatchContext()`.
- `runtimeState.interactionOverlayCanvas = rendererSurfaceHost.getInteractionOverlayCanvas()`.
- `runtimeState.interactionOverlayCtx = rendererSurfaceHost.getInteractionOverlayContext()`.
- `runtimeState.lineCtx = null`.

These direct writes stay in `map_renderer.js` for P26. Moving them would turn the lifecycle wrapper into a state writer and would require a separate state-write allowlist decision.

## P26 allowed first move

P26 candidate extraction is limited to DOM/canvas/SVG surface lifecycle wrapper; projection/path/zoom/event/render semantics are not yet moved.

P26 may add `js/core/renderer/renderer_surface_lifecycle_owner.js`.

P26 may move only mechanical DOM/canvas/SVG lifecycle helpers:

- Map container and tooltip lookup.
- Named canvas layer ensure/get bridge.
- Hit canvas creation bridge if implemented as an injected helper.
- Map canvas, political patch canvas, and interaction overlay canvas registration into `rendererSurfaceHost`.
- 2D context acquisition into `rendererSurfaceHost`.
- SVG root/group creation if and only if `ensureHybridLayers()` can be moved without changing ordering.

## P26 forbidden areas

P26 must not move:

- Projection/path creation.
- `fitProjection`.
- `setCanvasSize` internals.
- `initZoom`.
- `bindEvents`.
- `updateMap`.
- `drawCanvas`.
- `renderPassToCache`.
- Hit canvas build.
- Selection/fill.
- Scenario refresh/chunk.
- Exact-after-settle.
- Strategic overlay runtime.
- Direct runtimeState writes.

P26 must not add `js/core/renderer/renderer_render_lifecycle_owner.js`.

Any new renderer owner must keep the existing import direction: owners do not import `js/core/map_renderer.js`; `map_renderer.js` remains the composition root.

## Required validation commands

P25 required validation:

```bash
node --check tests/renderer_surface_lifecycle_inventory_boundary.test.mjs
node --check tools/check_architecture_boundaries.mjs
npm run test:node:renderer-surface-lifecycle-inventory
npm run test:node:renderer-surface-host
npm run test:node:renderer-surface-host-inventory
npm run test:node:renderer-host-inventory
npm run verify:architecture-boundaries
npm run verify:state-write-allowlist
npm run verify:test-import-graph
git diff --check
```

Suggested follow-up validation when time and local dependencies allow it:

```bash
npm run test:node:renderer-runtime-state-behavior
npm run test:node:canvas-layer-manager
npm run test:node:viewport-resize-lifecycle-owner
npm run test:node:zoom-interaction-lifecycle-owner
npm run test:e2e:dev:tno-ready-state
npm run test:e2e:smoke
```
