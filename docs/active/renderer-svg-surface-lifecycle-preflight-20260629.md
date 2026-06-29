# Renderer SVG Surface Lifecycle Preflight P29

## Scope and guardrails

P29 is a preflight and guard-hardening pass for the SVG surface lifecycle.

Allowed changes are limited to docs, tests, package scripts, architecture boundary checks, and registry closeout notes. Production renderer behavior stays at the P28 baseline.

P29 reserves `js/core/renderer/renderer_svg_surface_lifecycle_owner.js` for P30. The file should not exist in P29.

P29 does not update `dist/app/**` and does not change `tools/eslint-rules/state-writer-allowlist.json`.

## Current surface/projection lifecycle baseline

The current renderer lifecycle has three established pieces:

- `js/core/renderer/renderer_surface_host.js` is a registry for DOM, canvas, SVG, projection, path, context, and zoom handles.
- `js/core/renderer/renderer_surface_lifecycle_owner.js` owns mechanical DOM lookup, named canvas registration, hit canvas handle creation, and 2D context acquisition.
- `js/core/renderer/renderer_projection_path_owner.js` owns Equal Earth projection creation and SVG/canvas/hit path creation plus registration.

`js/core/map_renderer.js` remains the composition root. It imports the host and both owners, creates them, injects dependencies, and owns call ordering.

## ensureHybridLayers responsibility map

`ensureHybridLayers()` still lives in `js/core/map_renderer.js`.

It currently owns:

- Removal of legacy `#specialZonesSvg` and `#legendSvg`.
- Hiding legacy `#colorCanvas` and `#lineCanvas` after named canvas layers are registered.
- Creation or lookup of `#map-svg`.
- Registration of `mapSvg`, `viewportGroup`, `strategicDefs`, overlay groups, editor groups, preview groups, and `interactionRect` into `rendererSurfaceHost`.
- Static SVG root/group pointer-event, role, label, and visibility attributes.
- Legacy `g.legend-group` cleanup and `ensureLegendControlElement()`.
- Interaction rect creation and lowering behind editor overlays.

It does not own render pass execution semantics. The existing render functions remain in `map_renderer.js` and downstream strategic overlay owners.

## SVG root lifecycle inventory

`createSvgElement()` creates the root SVG element with:

- Namespace `http://www.w3.org/2000/svg`.
- `id="map-svg"`.
- Classes `map-layer` and `map-layer-top`.
- Absolute full-inset positioning.
- `zIndex = "3"`.
- `pointerEvents = "none"`.

`ensureHybridLayers()` looks up `#map-svg` under the registered map container. If missing, it creates the SVG and appends it to the map container. The SVG is then registered through `rendererSurfaceHost.setMapSvg(nextMapSvg)`.

## SVG group ordering inventory

The current static ordering is:

1. `g.viewport-layer` on the SVG root.
2. `defs.strategic-overlay-defs` on the SVG root.
3. `g.frontline-overlay-layer` inside the viewport group.
4. `g.frontline-labels-layer` inside the viewport group.
5. `g.operational-lines-layer` inside the viewport group.
6. `g.operation-graphics-layer` inside the viewport group.
7. `g.operation-graphics-editor-layer` inside the viewport group.
8. `g.unit-counters-layer` inside the viewport group.
9. `g.special-zones-layer` inside the viewport group.
10. `g.special-zone-editor-layer` inside the viewport group.
11. `g.hover-layer` inside the viewport group.
12. `g.dev-selection-layer` inside the viewport group.
13. `g.inspector-highlight-layer` inside the viewport group.
14. `g.intensity-field-preview-layer` on the SVG root.
15. `rect.interaction-layer` on the SVG root, then lowered.

P30 may preserve this order by moving only static SVG root and group creation plus registration.

## Interaction rect layering inventory

`ensureHybridLayers()` owns `rect.interaction-layer` creation.

The rect is transparent, registered through `rendererSurfaceHost.setInteractionRect(nextInteractionRect)`, has pointer events enabled, and is lowered so editor overlays can receive midpoint and vertex hit-testing first.

P30 must preserve the interaction rect lower operation and the current relationship between the global hit surface and editor overlays.

## Legend and legacy SVG cleanup inventory

`ensureHybridLayers()` removes legacy `#specialZonesSvg` and `#legendSvg` elements before current hybrid layer setup.

It also removes stale `g.legend-group` from the current SVG and then calls `ensureLegendControlElement()`.

Legend rendering semantics and legend control behavior stay outside the future SVG lifecycle owner.

## Strategic overlay group boundary

The future SVG lifecycle owner may create and register static groups used by the strategic overlay runtime.

The strategic overlay runtime remains outside that owner. These render semantic anchors remain out of scope:

- `renderFrontlineOverlay`.
- `renderOperationalLinesIfNeeded`.
- `renderOperationGraphicsIfNeeded`.
- `renderUnitCountersIfNeeded`.
- `renderSpecialZonesIfNeeded`.
- `renderDevSelectionOverlayIfNeeded`.
- `renderInspectorHighlightOverlayIfNeeded`.
- `renderHoverOverlayIfNeeded`.
- `drawCanvas`.
- `renderPassToCache`.
- `buildHitCanvas`.

## P30 allowed first move

P30 may add `js/core/renderer/renderer_svg_surface_lifecycle_owner.js`.

P30 may move only SVG root and static group creation/registration.

Allowed P30 work:

- Create or look up `#map-svg`.
- Create or look up static SVG groups and defs.
- Register SVG root, groups, defs, and interaction rect handles into `rendererSurfaceHost`.
- Preserve group ordering and interaction rect layering.
- Keep `js/core/map_renderer.js` as the composition root.
- Keep strategic overlay rendering and editor rendering outside the owner.

## P30 forbidden areas

P30 must not move:

- `drawCanvas`.
- `renderPassToCache`.
- Hit canvas build.
- Selection/fill.
- Scenario refresh/chunk.
- Exact-after-settle.
- Strategic overlay runtime.
- Projection/path creation.
- `fitProjection`.
- `updateMap`.
- `initZoom` or `bindEvents`.
- Direct runtimeState writes.

## Required validation commands

```bash
node --check tests/renderer_svg_surface_lifecycle_inventory_boundary.test.mjs
node --check tools/check_architecture_boundaries.mjs
npm run test:node:renderer-svg-surface-lifecycle-inventory
npm run test:node:renderer-projection-path-lifecycle
npm run test:node:renderer-surface-lifecycle
npm run test:node:renderer-surface-host
npm run verify:architecture-boundaries
npm run verify:state-write-allowlist
npm run verify:test-import-graph
git diff --check
```
