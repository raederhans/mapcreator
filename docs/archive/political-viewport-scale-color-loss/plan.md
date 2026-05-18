# Political Viewport Scale Color Loss Plan

## Goal

Fix the scenario political rendering regression where country colors disappear after viewport resize, zoom, or DPR phase changes. The fix must preserve the full resolved color authority and avoid adding fallback drawing paths.

## Working Theory

1. `setCanvasSize()` can resize render-pass canvases that it does not invalidate or clear. Resizing a canvas clears its backing bitmap, so stale render references can make a blank pass look reusable.
2. Scenario political background entries are cached after `pathBoundsInScreen()` filtering, while the cache key omits viewport and transform state. A later viewport can replay a stale small subset of countries.

## Implementation Plan

1. Keep DPR-only canvas resize targets aligned with the same pass list used for invalidate/clear.
2. Preserve the exact-after-settle special boundary that excludes `political`.
3. Make full scenario political background entries viewport-independent.
4. Keep viewport filtering in visible-item or screen-rect draw paths.
5. Extend existing contract tests for both invariants.
6. Run targeted verification, cleanup review, final code review, then merge back to `main`.

## Verification Plan

- `node --check js/core/map_renderer.js`
- `node --check js/core/renderer/render_cache_owner.js`
- `npm run test:node:scenario-chunk-contracts`
- `npm run test:node:physical-layer-contracts`
- `npm run test:node:renderer-runtime-state-behavior`
- `python -m unittest tests.test_map_renderer_render_cache_owner_boundary_contract tests.test_renderer_runtime_state_boundary_contract -q`

## Live Process Ownership

Main thread owns all live tests, browser smoke, build processes, and log polling for this task.
