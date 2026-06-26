# Renderer Surface Host Phase 24 Plan

## Goal

Implement the first renderer surface host without changing renderer semantics. P24 moves only DOM, canvas, SVG, projection/path, and zoom handle storage plus getter/setter registry into `js/core/renderer/renderer_surface_host.js`.

## Constraints

- Keep `initMap`, projection fit, `updateMap`, `drawCanvas`, `renderPassToCache`, hit canvas build, selection/fill, scenario chunk, exact-after-settle, visual invalidation, and strategic overlay runtime behavior in `js/core/map_renderer.js`.
- Keep canvas layer creation, resize, lookup, and clear calls in `js/core/map_renderer.js`.
- Keep public facade exports unchanged.
- Keep state-write allowlist unchanged.
- Treat `origin/main@56f22e73` as the current truth source.
- Main agent owns all live tests/builds. Subagents are read-only and cannot monitor live processes.

## Steps

- [x] Create clean P24 worktree from current `origin/main`.
- [x] Read current P23 preflight doc, inventory test, architecture boundary, and map renderer handle locations.
- [x] Add `renderer_surface_host.js` handle registry and behavior tests.
- [x] Migrate `map_renderer.js` surface handle declarations and owner getter injections to the host.
- [x] Update inventory test and architecture boundary for P24.
- [x] Update P24 docs and worktree registry delivery package.
- [ ] Run required Node/static/Pages/E2E validation gates.
- [ ] Run independent review lanes, fix findings, commit, push, and clean worktree.

## Deferred

- Moving DOM/canvas/SVG lifecycle initialization into the host.
- Moving projection/path lifecycle mutation into the host.
- Moving zoom lifecycle mutation into the host.
- Moving render/draw/hit/selection/strategic overlay runtime behavior.
