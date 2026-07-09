# Renderer Runtime Context Viewport Mutation Chain P1.4

Status: ready-for-commit / verified
Date: 2026-07-09

## Goal

Migrate the fit projection, viewport update, and resize lifecycle receiver construction paths so their read dependencies come through `RendererRuntimeContext.viewport`.

## Non-goals

- No `drawCanvas()` migration.
- No pass drawing migration.
- No `renderPassToCache()` behavior change.
- No click selection migration.
- No public facade change.
- No scenario, UI, CSS, or data behavior change.

## Context Shape

`RendererRuntimeContext` remains import-free and read-only. P1.4 extends the existing `viewport` read model with live accessors:

- `getMapContainer`
- `getViewportGroup`
- `getGlobal`
- `getDevicePixelRatio`
- `hasLandFeatures`

Scheduling, cancellation, timing, render perf metrics, draw effects, dirty writes, zoom UI updates, and lifecycle effects remain local injections in `js/core/map_renderer.js`.

## Receiver Migration

- `getRendererFitProjectionOwner()` reads runtime state, surface host, projection fit padding ratio, and viewport helpers through `getViewportReceiverContext().viewport`.
- `getRendererViewportUpdateOwner()` reads runtime state and viewport group through `getViewportReceiverContext().viewport`; SVG transform application is owned by `renderer_viewport_update_owner.js` through `getters.getViewportGroup`.
- `getViewportResizeLifecycleOwner()` reads runtime state, map container, global object, device pixel ratio, and land-feature presence through `getViewportReceiverContext().viewport`.

## Risks

- Context must remain a read model and must not become an effects bus.
- `drawFrame` remains a composition-root closure that calls `drawCanvas()`.
- Resize timing defaults remain owned by `viewport_resize_lifecycle_owner.js`.
- Pages dist mirror sync and full core verification have passed; `verify:core:main-thread`, browser, dev-server, and Playwright remain explicit not-run lanes.

## Verification

Focused executor validation passed:

- `node --check` on changed JS/MJS files.
- `npm run test:node:renderer-runtime-context-viewport-mutation`
- `npm run test:python:map-renderer-viewport-mutation-context-boundary`
- Focused owner/context tests touched by P1.4, including fit projection, viewport update, resize lifecycle, foundation, render-cache, receiver, projection/viewport, and Python projection/viewport boundary contracts.
- `npm run test:node:verification-metadata`
- `npm run test:node:verify-core-runner`
- Initial P1.4 selector dry-run wrote `.runtime/reports/generated/p1-4-adaptive-selection.json` and `.runtime/reports/generated/p1-4-adaptive-selection.md` with no unmatched changed files.

Main-thread validation passed:

- `npm run verify:pages-dist` exited 0.
- `npm run verify:dist-drift` exited 0 after the builder generated and staged the checked-in dist mirror sync.
- `npm run verify:core` exited 0 with 50 commands and wrote `.runtime/reports/generated/verify-core.json`.
- Final selector dry-run wrote `.runtime/reports/generated/p1-4-adaptive-selection-final.json` and `.runtime/reports/generated/p1-4-adaptive-selection-final.md` with `changed=22`, `recommended=181`, and `unmatched=[]`.

Not-run lanes:

- `verify:core:main-thread`
- browser/dev-server/Playwright lanes

## P1.5 Recommendation

Begin P1.5 after P1.4 is committed. Keep the next scope to another narrow receiver chain and continue to leave draw/pass/click-selection behavior in place until its own phase.
