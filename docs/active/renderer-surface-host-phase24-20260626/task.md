# Renderer Surface Host Phase 24 Task

## Delivery Package Draft

### Changed Files

Core:
- `js/core/renderer/renderer_surface_host.js`
- `js/core/map_renderer.js`

Tests:
- `tests/renderer_surface_host_behavior.test.mjs`
- `tests/renderer_surface_host_inventory_boundary.test.mjs`

Docs:
- `docs/active/renderer-surface-host-phase24-20260626/plan.md`
- `docs/active/renderer-surface-host-phase24-20260626/context.md`
- `docs/active/renderer-surface-host-phase24-20260626/task.md`

Tooling:
- `tools/check_architecture_boundaries.mjs`
- `package.json`

### Diff Summary

- Added a renderer surface host factory with registry-driven getters/setters, `reset`, `setMany`, and metadata-only `snapshot`.
- Replaced `map_renderer.js` module-scope surface handles with `rendererSurfaceHost` reads/writes.
- Kept canvas layer manager, DOM/SVG setup, projection/path creation, zoom lifecycle, render/update/hit/selection/scenario/strategic overlay behavior in `map_renderer.js`.
- Updated P24 tests and architecture boundary to require the host, ban renderer semantics in it, and keep owner getters stable.
- Added combined package script `test:node:renderer-surface-host`.

### Commit State

Not committed yet; final commit follows full validation.

### Base Divergence

Base is `origin/main@56f22e7380416429d6cc5e2ce58fd8472cae8542`; this worktree was created from current remote main for P24.

### Conflict Surface

Expected hot files:
- `js/core/map_renderer.js`
- `tools/check_architecture_boundaries.mjs`
- `tests/renderer_surface_host_inventory_boundary.test.mjs`
- `package.json`
- `docs/active/_worktree_registry.md`

### Validation

Passed:
- `node --test tests/renderer_surface_host_behavior.test.mjs`
- `node --check js/core/renderer/renderer_surface_host.js`
- `node --check js/core/map_renderer.js`
- `npm run test:node:renderer-surface-host` 12/12
- `npm run test:node:renderer-surface-host-inventory` 6/6
- `npm run test:node:renderer-runtime-state-behavior` 10/10
- `npm run test:node:render-transaction-diagnostics` 21/21
- `npm run test:node:scenario-refresh-plans` 24/24
- `npm run test:node:exact-after-settle-refresh-plans` 9/9
- `npm run test:node:canvas-layer-manager` 4/4
- `npm run test:node:physical-layer-owner` 6/6
- `npm run test:node:river-layer-owner` 8/8
- `npm run test:node:border-draw-owner-behavior` 4/4
- `npm run test:node:border-mesh-owner-behavior` 4/4
- `npm run verify:architecture-boundaries`
- `npm run verify:state-write-allowlist`
- `npm run verify:test-import-graph`
- `npm run verify:pages-dist` with startup shell 39/39 and landing showcase 8/8
- `npm run verify:dist-drift` after staging generated dist mirrors
- `npm run test:e2e:dev:tno-ready-state` 5/5
- `npm run test:e2e:smoke` 4/4
- `npm run test:e2e:ui-rework-mainline` 5/5
- `npm run test:e2e:dev:scenario-chunk-runtime` 8/8
- `git diff --check`
- `node tools/check_architecture_boundaries.mjs`

Still pending:
- Final staged review/self-check.

### Remaining Risks

- `context` and `projection` are high-volume identifiers; replacements must avoid local semantic variables.
- P24 must preserve side-effect timing in `initMap`, resize, zoom, and render paths.
- `map_renderer.js` getter calls are more verbose after storage migration; later phases can introduce local aliases inside hot functions if profiling or readability demands it.
- Final reviewer found no behavior blocker; the staging risk was resolved by adding the new host, behavior test, and dist mirror files before commit.

### Recommended Integration

Recommended after validation: merge this branch into main as the P24 implementation, then keep P25 as a separate decision about lifecycle movement.
