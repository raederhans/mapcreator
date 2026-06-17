# Geometry Simplification Helper Contracts Plan

## Goal

Extract generic polyline simplification helpers from `js/core/map_renderer.js` into `js/core/renderer/polyline_simplification_helpers.js`, with direct behavior tests and boundary checks that keep coastline mesh simplification behavior unchanged.

## Constraints

- Start from clean `main@06604075`.
- No new production dependencies.
- Preserve current invalid-input, duplicate-point, epsilon, latitude clamp, and effective-area behavior.
- Main agent owns all live validation.
- Keep the diff narrow and dependency-ready.

## Acceptance

- `tests/polyline_simplification_helpers_behavior.test.mjs` covers helper behavior.
- Boundary test confirms `map_renderer.js` imports helpers and no longer defines them directly.
- `border_mesh_owner.js` continues passing helpers into `simplifyCoastlineMeshRuntime`.
- Source and dist both contain the helper module.
- Required targeted checks and `verify:pages-dist` pass.

## Steps

- [x] Confirm clean baseline, branch, lessons learned, and worktree state.
- [x] Create active task docs and initialize workflow state.
- [x] Add red-first behavior and boundary tests.
- [x] Extract helper module with minimal wiring changes.
- [x] Run targeted source checks.
- [x] Sync dist through `verify:pages-dist`.
- [x] Run final review / bug / first-principles pass.
- [x] Archive docs, update registry delivery package, commit, and push.

## Live Process Owner

Main Codex agent owns all tests/builds and `verify:pages-dist`. Subagents are limited to static inspection and review.
