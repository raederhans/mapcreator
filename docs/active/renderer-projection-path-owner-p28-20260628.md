# Renderer Projection/Path Owner P28

## Scope and guardrails

P28 is the first implementation pass for projection/path lifecycle ownership.

Allowed production movement is limited to creating and registering these handles:

- `projection`.
- `pathSVG`.
- `pathCanvas`.
- `pathHitCanvas`.

`js/core/map_renderer.js` remains the composition root. Runtime semantics remain in their prior owners.

## Current implementation state

P28 adds `js/core/renderer/renderer_projection_path_owner.js`.

The owner receives:

- `surfaceHost`.
- `getters.getD3`.
- `constants.projectionPrecision`.
- `constants.pathPointRadius`.

It fails fast when `d3`, `geoEqualEarth`, `geoPath`, map context, hit context, or the registered projection `clipExtent` method is missing.

## initMap ordering

`initMap` still resolves DOM handles, ensures hybrid layers, registers canvas handles, creates the hit canvas handle, and acquires canvas contexts before projection/path initialization.

After context acquisition succeeds, `initMap` calls:

```js
getRendererProjectionPathOwner().initializeProjectionPaths();
```

The cache reset, runtime state bridge writes, `setCanvasSize`, `fitProjection`, `initZoom`, `bindEvents`, and initial render remain after that point.

## Owner responsibilities

`initializeProjectionPaths()` creates the Equal Earth projection, applies `precision`, registers the projection into `rendererSurfaceHost`, calls `clipExtent(null)` on the registered projection, and registers SVG/canvas/hit-canvas path handles with the configured point radius.

The method returns the registered handles for behavior tests.

## Forbidden areas

The projection/path owner must not own:

- `fitProjection` or `projection.fitExtent`.
- `setCanvasSize`.
- zoom setup or event binding.
- render/update/draw/cache passes.
- hit canvas build.
- selection/fill behavior.
- scenario refresh/chunk behavior.
- exact-after-settle behavior.
- strategic overlay runtime.
- direct `runtimeState` writes.

## Validation commands

Required P28 static and Node validation:

```bash
node --check js/core/renderer/renderer_projection_path_owner.js
node --check js/core/map_renderer.js
node --check tests/renderer_projection_path_owner_behavior.test.mjs
node --check tests/renderer_projection_path_lifecycle_inventory_boundary.test.mjs
node --check tools/check_architecture_boundaries.mjs
npm run test:node:renderer-projection-path-owner
npm run test:node:renderer-projection-path-lifecycle-inventory
npm run test:node:renderer-surface-lifecycle
npm run test:node:renderer-surface-host
npm run test:node:projected-geometry-bounds-owner
npm run test:node:viewport-read-model-owner
npm run test:node:viewport-command-owner
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
npm run verify:pages-dist
npm run verify:dist-drift
git diff --check
```

Browser E2E remains the strongest runtime smoke for this area and should run under the live-process owner lane when available.

## P29 handoff

P29 should treat projection/path creation as owned by `renderer_projection_path_owner.js` and continue routing consumers through `rendererSurfaceHost` getters.

Future fitting or viewport orchestration work should start from `fitProjection` and its existing read-model owner dependencies, with a separate preflight before moving side effects.
