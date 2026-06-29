# Renderer SVG Surface Lifecycle Owner P30

## Scope and guardrails

P30 adds `js/core/renderer/renderer_svg_surface_lifecycle_owner.js`.

The change is limited to SVG root/static group creation and registration. `js/core/map_renderer.js` remains the composition root and still owns lifecycle ordering around legacy cleanup, canvas lifecycle, legend cleanup, sizing, projection fitting, zoom, event binding, and render startup.

## Current implementation state

`renderer_svg_surface_lifecycle_owner.js` owns SVG root/static group creation and registration.

The owner receives `surfaceHost`, `getD3`, and the existing `createSvgElement` helper by dependency injection. It registers `mapSvg`, `viewportGroup`, `strategicDefs`, static overlay groups, `intensityFieldPreviewGroup`, and `interactionRect` into `rendererSurfaceHost`.

## ensureHybridLayers ordering

`ensureHybridLayers()` remains the wrapper.

The wrapper still removes legacy `#specialZonesSvg` and `#legendSvg`, calls the canvas lifecycle owner, hides legacy `#colorCanvas` and `#lineCanvas`, calls `getRendererSvgSurfaceLifecycleOwner().ensureSvgSurface();`, removes `g.legend-group`, and calls `ensureLegendControlElement()`.

## Owner responsibilities

The SVG owner creates or reuses `#map-svg`, applies the static root classes/styles, creates or reuses `g.viewport-layer`, creates or reuses `defs.strategic-overlay-defs`, and creates or reuses static viewport groups in this order: frontline overlay, frontline labels, operational lines, operation graphics, operation graphics editor, unit counters, special zones, special zone editor, hover, dev selection, inspector highlight.

It also creates or reuses `g.intensity-field-preview-layer`, creates or reuses `rect.interaction-layer`, keeps the rect transparent with pointer events enabled, and lowers the rect so editor handles can stay above it.

## Forbidden areas

`drawCanvas`, `renderPassToCache`, hit canvas build, selection/fill, scenario refresh/chunk, exact-after-settle, strategic overlay runtime, projection/path creation, `fitProjection`, `updateMap`, `initZoom`, `bindEvents`, and direct `runtimeState` writes remain outside the owner.

The owner must not import `js/core/map_renderer.js`, state modules, legend modules, or strategic overlay runtime modules.

## Validation commands

- `node --check js/core/renderer/renderer_svg_surface_lifecycle_owner.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/renderer_svg_surface_lifecycle_owner_behavior.test.mjs`
- `node --check tests/renderer_svg_surface_lifecycle_inventory_boundary.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `npm run test:node:renderer-svg-surface-lifecycle-owner`
- `npm run test:node:renderer-svg-surface-lifecycle-inventory`
- `npm run test:node:renderer-projection-path-lifecycle`
- `npm run test:node:renderer-surface-lifecycle`
- `npm run test:node:renderer-surface-host`
- `npm run test:node:renderer-host-inventory`
- `npm run test:node:strategic-overlay-runtime-owner`
- `npm run verify:architecture-boundaries`
- `npm run verify:state-write-allowlist`
- `npm run verify:test-import-graph`
- `npm run verify:pages-dist`
- `npm run verify:dist-drift`
- `git diff --check`

## P31 handoff

P31 can build on the SVG owner only after preserving group ordering and interaction rect layering.

Safe follow-up work can tighten SVG lifecycle tests or move additional static SVG registration if the same composition-root boundary remains intact. Render semantics, strategic overlay runtime, projection/path lifecycle, zoom/event lifecycle, and runtime state bridge writes stay in their current owners.
