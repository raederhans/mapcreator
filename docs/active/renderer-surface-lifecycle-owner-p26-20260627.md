# Renderer Surface Lifecycle Owner P26

## Scope and guardrails

P26 starts from `origin/main@651017e3`, after P25 surface lifecycle preflight. The goal is the first narrow owner for mechanical surface lifecycle setup.

Allowed runtime movement is limited to DOM lookup, named canvas layer registration, hit canvas handle creation, and 2D context acquisition. `js/core/map_renderer.js` remains the composition root and owns call order, facility card setup, projection/path creation, runtimeState bridge writes, canvas sizing, projection fitting, zoom, event binding, render, hit-build semantics, selection/fill, scenario refresh/chunk, exact-after-settle, and strategic overlay runtime.

## Implemented owner boundary

P26 adds `js/core/renderer/renderer_surface_lifecycle_owner.js` with a factory:

```js
createRendererSurfaceLifecycleOwner({ surfaceHost, getters, helpers, canvasLayerManager })
```

The owner receives all dependencies from `map_renderer.js`. It imports no renderer composition root and imports no state module.

The owner exposes four mechanical methods:

- `resolveDomHandles({ containerId })`
- `ensureCanvasLayerHandles({ before })`
- `ensureHitCanvasHandle()`
- `acquireCanvasContexts()`

Required dependencies fail fast through clear `TypeError` messages.

## map_renderer composition

`map_renderer.js` imports and lazily creates the lifecycle owner through `getRendererSurfaceLifecycleOwner()`.

Injected dependencies are:

- `rendererSurfaceHost`
- `getDocument: () => document`
- `createHitCanvasElement`
- `CANVAS_LAYER_NAMES`
- `ensureCanvasLayers`
- `getCanvasLayer`

The lifecycle owner is called at the original surface lifecycle points inside `initMap()` and `ensureHybridLayers()`.

## Mechanical lifecycle moved

P26 moves these mechanics behind the owner:

- Map container and tooltip lookup.
- Canvas layer ensure/get bridge through `CANVAS_LAYER_NAMES`.
- Map canvas, political patch canvas, and interaction overlay canvas registration into `rendererSurfaceHost`.
- Hit canvas handle creation through the injected `createHitCanvasElement`.
- Map, political patch, interaction overlay, and hit 2D context acquisition into `rendererSurfaceHost`.

The map and hit context failure checks remain in `initMap()` after owner acquisition, preserving the previous visible startup failure behavior.

## Lifecycle intentionally retained

P26 keeps these in `map_renderer.js`:

- Facility card DOM references and event listeners.
- Legacy color/line canvas hiding.
- SVG root and group creation in `ensureHybridLayers()`.
- Interaction rect creation and lowering.
- Legend control cleanup/setup through `ensureLegendControlElement()`.
- Projection/path creation.
- RuntimeState bridge writes.
- Canvas sizing, projection fitting, zoom initialization, and event binding.
- Render/update/hit build/selection/fill/scenario/exact-after-settle/strategic overlay semantics.

SVG root/group creation stayed in `map_renderer.js` because the current body is interleaved with D3 group ordering, legend cleanup, strategic overlay groups, editor hit surfaces, and interaction rect layering.

## RuntimeState bridge

The bridge remains direct in `map_renderer.js`:

- `runtimeState.colorCanvas`
- `runtimeState.canvasLayers`
- `runtimeState.colorCtx`
- `runtimeState.politicalPatchCanvas`
- `runtimeState.politicalPatchCtx`
- `runtimeState.interactionOverlayCanvas`
- `runtimeState.interactionOverlayCtx`

P26 adds no state-write allowlist entry.

## Tests and architecture locks

P26 adds `tests/renderer_surface_lifecycle_owner_behavior.test.mjs` for fake-host behavior coverage.

P26 updates lifecycle and surface-host inventory tests to lock:

- `map_renderer.js` as the only production importer of `renderer_surface_host.js` and `renderer_surface_lifecycle_owner.js`.
- The lifecycle owner as mechanical-only.
- Projection/path creation in `map_renderer.js`.
- RuntimeState bridge writes in `map_renderer.js`.
- `setCanvasSize`, `fitProjection`, `initZoom`, `bindEvents`, `updateMap`, `drawCanvas`, `renderPassToCache`, hit canvas build, selection/fill, scenario refresh/chunk, exact-after-settle, and strategic overlay runtime outside the lifecycle owner.
- The absence of `js/core/renderer/renderer_render_lifecycle_owner.js`.

`tools/check_architecture_boundaries.mjs` tracks the new owner, its line budget, import direction, semantic blacklist, and package/test boundary tokens.

## P27 recommendation

P27 should be a projection/path lifecycle preflight, with docs/tests/tooling first.

Recommended P27 scope:

- Inventory projection creation and all path handles.
- Document owner dependency needs for `globalThis.d3`, projection precision, point radius, map/hit contexts, and projection consumers.
- Decide whether projection/path owner should be pure factory, lifecycle owner extension, or separate projection owner.
- Lock that render pass execution, hit canvas build, zoom/event binding, scenario refresh/chunk, exact-after-settle, and strategic overlay runtime remain out of scope.

P27 should not start render pass extraction.

## Required validation commands

```bash
node --check js/core/renderer/renderer_surface_lifecycle_owner.js
node --check js/core/map_renderer.js
node --check tests/renderer_surface_lifecycle_owner_behavior.test.mjs
node --check tests/renderer_surface_lifecycle_inventory_boundary.test.mjs
node --check tools/check_architecture_boundaries.mjs
npm run test:node:renderer-surface-lifecycle-owner
npm run test:node:renderer-surface-lifecycle-inventory
npm run test:node:renderer-surface-host
npm run test:node:renderer-host-inventory
npm run test:node:canvas-layer-manager
npm run test:node:viewport-resize-lifecycle-owner
npm run test:node:zoom-interaction-lifecycle-owner
npm run test:node:renderer-runtime-state-behavior
npm run test:node:render-transaction-diagnostics
npm run test:node:scenario-refresh-plans
npm run test:node:exact-after-settle-refresh-plans
npm run test:node:scenario-chunk-contracts
npm run verify:architecture-boundaries
npm run verify:state-write-allowlist
npm run verify:test-import-graph
npm run test:e2e:dev:tno-ready-state
npm run test:e2e:smoke
npm run test:e2e:dev:scenario-chunk-runtime
git diff --check
```

Because P26 changes production browser JS, Pages dist drift must also be checked:

```bash
npm run verify:pages-dist
npm run verify:dist-drift
```

Validation completed on 2026-06-27:

- Syntax checks passed for the new owner, `map_renderer.js`, lifecycle owner behavior test, lifecycle inventory test, surface host inventory test, and architecture boundary tool.
- Lifecycle owner behavior passed 6/6; lifecycle inventory passed 7/7; combined lifecycle script passed 13/13.
- Surface host combined passed 12/12; surface host inventory passed 6/6; renderer host inventory passed 7/7.
- Canvas layer manager passed 4/4; viewport resize lifecycle owner passed 12/12; zoom interaction lifecycle owner passed 6/6.
- Renderer runtime state passed 10/10; render transaction diagnostics passed 21/21; scenario refresh plans passed 24/24; exact-after-settle refresh plans passed 9/9; scenario chunk contracts passed 57/57.
- Architecture boundaries passed; state-write allowlist passed with 115 tracked files; test import graph passed with 49 specs.
- Pages dist passed with startup shell unittest 39/39 and landing showcase 8/8; dist drift passed after staging the generated dist mirror.
- Browser E2E passed: TNO ready-state 5/5, smoke 4/4, and scenario chunk runtime 8/8.
