# Renderer surface host preflight, 2026-06-26

## Scope and guardrails

P23 is a preflight lock for the future renderer surface host. It documents the current surface handles, adds a read-only inventory test, and keeps the P24 first move narrow.

P23 does not migrate production behavior. It does not change `dist/app/**`, `tools/eslint-rules/state-writer-allowlist.json`, or `js/core/map_renderer/public.js`. It does not move DOM, canvas, SVG, projection, path, or zoom handles out of `js/core/map_renderer.js`.

The current runtime host keeps the only active renderer scene. P24 should start from a handle registry shape and preserve existing wrapper names, owner creation order, and side-effect timing.

## Current surface handle inventory

- DOM/root: `mapContainer`, `tooltip`. Facility card refs are UI-adjacent surfaces and should stay outside the first P24 move unless a later inventory proves direct renderer-surface coupling.
- Canvas layers: `canvasLayers`, `mapCanvas`, `politicalPatchCanvas`, `interactionOverlayCanvas`, `hitCanvas`.
- 2D contexts: `context`, `politicalPatchContext`, `interactionOverlayContext`, `hitContext`.
- SVG: `mapSvg`, `viewportGroup`, `interactionRect`, overlay groups.
- Projection/path: `projection`, `pathSVG`, `pathCanvas`, `pathHitCanvas`.
- Zoom: `zoomBehavior`.
- Resize/viewport owners now extracted after P20: `viewport_command_owner.js` and `viewport_resize_lifecycle_owner.js` receive host getters for zoom, interaction rect, and container state.
- Event/zoom owners after P21/P22: `zoom_interaction_lifecycle_owner.js` and `map_interaction_event_binding_owner.js` receive host effects and getters, while core handles remain in `map_renderer.js`.

## Current owner dependency map

- Render cache owner: `getContext`.
- HGO preview owner: `getProjection`, `getMapSvg`, `getTargetCanvas`.
- Intensity field mask owner: `getProjection`.
- Projected geometry bounds owner: `getProjection`, `getPathCanvas`, `getPathSvg`.
- Viewport read model owner: `getProjection`, `getPathSvg`, `getZoomIdentity`.
- Viewport command owner: `getZoomBehavior`, `getInteractionRect`, `getD3`.
- Viewport resize lifecycle owner: `getMapContainer`.
- Spatial index owner: `getPathSvg`.
- Strategic overlay render/runtime owner group: getters for projection, path, canvases, contexts, overlay state, and runtime effects.
- Canvas layer manager: `ensure`, `get`, `resize`, and `clear` operations still depend on host-owned canvas layers and contexts.

## P24 candidate surface host API

Draft only. P23 does not implement this module.

```js
createRendererSurfaceHost({ document, d3, state, helpers });
surfaceHost.initializeSurface({ containerId });
surfaceHost.getMapContainer();
surfaceHost.getCanvasLayer(name);
surfaceHost.getMapCanvas();
surfaceHost.getContext();
surfaceHost.getHitCanvas();
surfaceHost.getHitContext();
surfaceHost.getMapSvg();
surfaceHost.getInteractionRect();
surfaceHost.getProjection();
surfaceHost.getPathSvg();
surfaceHost.getPathCanvas();
surfaceHost.getPathHitCanvas();
surfaceHost.setZoomBehavior(zoomBehavior);
surfaceHost.getZoomBehavior();
surfaceHost.resetSurfaceHandles(reason);
```

The API should expose getters first. It should avoid moving semantic renderer flows during the first extraction step.

## P24 allowed first move

P24 should only migrate DOM, canvas, SVG handle grouping and the matching getters. It should keep `map_renderer.js` wrappers and preserve owner construction order.

P24 should keep the semantic bodies of `initMap`, projection fit, `updateMap`, and `drawCanvas` in place for the first surface-host phase. This keeps behavior reviewable: first lock where the handles live, then migrate mutation-heavy lifecycle code in later phases.

## High-risk deferred items

- Projection/path lifecycle mutation.
- Zoom behavior lifecycle mutation if the P21 contract is stale.
- `setCanvasSize` internals.
- `drawCanvas`.
- `renderPassToCache`.
- Hit canvas build.
- Selection/fill.
- Strategic overlay runtime ownership.

## Acceptance standards for P24

- Add `js/core/renderer/renderer_surface_host.js` only when P24 starts the actual surface host extraction.
- Keep `map_renderer.js` wrapper names and owner construction order stable.
- Move DOM/canvas/SVG handle grouping and getters before moving mutation-heavy renderer flows.
- Preserve current behavior for `initMap`, projection fit, `updateMap`, `drawCanvas`, `renderPassToCache`, hit canvas build, selection/fill, zoom lifecycle, and strategic overlay runtime.
- Extend `tests/renderer_surface_host_inventory_boundary.test.mjs` so the old top-level handle declarations disappear from `map_renderer.js` only when the new surface host owns equivalent getters.
- Keep `npm run test:node:renderer-host-inventory`, `npm run test:node:renderer-surface-host-inventory`, `npm run verify:architecture-boundaries`, `npm run verify:state-write-allowlist`, `npm run verify:test-import-graph`, and `git diff --check` green.
