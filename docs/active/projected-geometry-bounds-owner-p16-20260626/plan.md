# P16 Projected Geometry Bounds Owner Plan

## Goal

Move projected geometry bounds, spherical geometry diagnostics, safe hit geometry helpers, and D3-unsafe water geometry sanitization policy out of `js/core/map_renderer.js` into `js/core/renderer/projected_geometry_bounds_owner.js`.

## Boundaries

- Preserve `map_renderer.js` wrapper function names used by spatial index, viewport, rendering, and hit logic.
- Preserve helper names injected into `createSpatialIndexRuntimeOwner`.
- Do not modify `dist/app/**`, `tools/eslint-rules/state-writer-allowlist.json`, or `js/core/map_renderer/public.js`.
- Do not modify DOM, canvas, SVG, projection, zoom lifecycle, `drawCanvas`, `renderPassToCache`, render pipeline execution, `exact_after_settle_scheduler.js`, or `scenario_refresh_runtime.js`.
- Keep `scenarioWaterPartPathCache` and `scenarioWaterFeaturePathCache` in the host unless a complete migration becomes necessary.
- Keep runtimeState writes in `map_renderer.js` through wrapper or injected callback; the new owner must not be added to the state-write allowlist.

## Steps

1. Baseline and context
   - Confirm parent WIP, clean P16 worktree from latest `origin/main`, and registry state.
   - Map existing projected bounds, spherical diagnostics, safe water geometry, and spatial owner helper call sites.
2. Owner extraction
   - Add `createProjectedGeometryBoundsOwner`.
   - Move owner-local caches and pure policy/helper logic.
   - Delegate existing `map_renderer.js` wrappers to the owner.
3. Contract coverage
   - Add pure synthetic owner behavior tests without importing `map_renderer.js`.
   - Add package script and architecture boundary checks.
   - Update existing contracts that still point at old host-owned bodies.
4. Verification
   - Run required syntax, Node, architecture, state-write, import graph, and requested e2e gates from the main agent only.
   - Run final static review and first-principles bug check.
5. Closeout
   - Commit functional change with Lore protocol.
   - Push branch and `main`.
   - Archive docs, update registry, push closeout, then clean the worktree.
