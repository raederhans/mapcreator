# P16 Context

## Baseline

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-projected-geometry-bounds-owner-p16-20260626`
- Branch: `codex/projected-geometry-bounds-owner-p16-20260626`
- Base: `origin/main@760f08291cd6425870ed63b327f6709092e13601`
- Parent checkout: `C:\Users\raede\Desktop\dev\mapcreator` is dirty with unrelated `docs/archive/**` deletions and `lessons learned.md`.
- Main agent owns all live tests and browser/e2e processes. Subagents are static/read-only unless explicitly assigned a non-live task.

## Initial Findings

- P16 follows P12-P15 renderer extraction work now present on `origin/main`.
- The new owner must keep runtimeState writes outside the owner and avoid state-write allowlist edits.
- `scenarioWaterPartPathCache` and `scenarioWaterFeaturePathCache` remain host-owned for P16 unless all call sites are completely migrated.

## Progress Log

- Created clean P16 worktree from refreshed `origin/main`.
- Registered the active worktree and wrote this plan/context/task set.
- Mapped the old `map_renderer.js` projected bounds and D3-unsafe water sanitization block, plus the `createSpatialIndexRuntimeOwner` helper injection surface.
- Added `js/core/renderer/projected_geometry_bounds_owner.js` with owner-local projected bounds, spherical diagnostics, safe hit geometry, and water sanitization caches.
- Kept `runtimeState.projectedBoundsDiagnostics` writes in `map_renderer.js` through `recordProjectedBoundsDiagnosticsState` injected into the owner.
- Kept `scenarioWaterPartPathCache` and `scenarioWaterFeaturePathCache` in `map_renderer.js`; owner calls the injected `resetHostWaterPathCaches` callback from `clearProjectedBoundsCache`.
- Updated `map_renderer.js` wrappers to delegate to `getProjectedGeometryBoundsOwner()` while preserving existing helper names for spatial index, viewport, render, and hit call sites.
- Added `tests/projected_geometry_bounds_owner_behavior.test.mjs`, the package script, architecture boundary ownership rules, and scenario chunk contract updates that now point at the owner implementation.
- Validation completed from the main agent only. `test:e2e:dev:tno-ready-state` passed 5/5 and `test:e2e:smoke` passed 4/4 using a temporary `node_modules` junction that was removed after the run.

## Validation Evidence

- `node --check js/core/renderer/projected_geometry_bounds_owner.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/projected_geometry_bounds_owner_behavior.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `npm run test:node:projected-geometry-bounds-owner` passed 12/12.
- `npm run test:node:render-transform-reuse-policy-owner` passed 7/7.
- `npm run test:node:render-cache-owner` passed 6/6.
- `npm run test:node:render-pipeline-catalog` passed 3/3.
- `npm run test:node:exact-after-settle-pass-catalog` passed 6/6.
- `npm run test:node:renderer-host-inventory` passed 7/7.
- `npm run test:node:renderer-runtime-state-behavior` passed 10/10.
- `npm run test:node:render-transaction-diagnostics` passed 21/21.
- `npm run test:node:scenario-refresh-plans` passed 23/23.
- `npm run test:node:scenario-chunk-contracts` passed 57/57.
- `npm run test:node:canvas-layer-manager` passed 4/4.
- `npm run verify:architecture-boundaries` passed.
- `npm run verify:state-write-allowlist` passed with 115 tracked files.
- `npm run verify:test-import-graph` passed and wrote the import graph for 49 specs.
- `npm run test:e2e:dev:tno-ready-state` passed 5/5.
- `npm run test:e2e:smoke` passed 4/4. Smoke retained known local backend auth 401 probes and expected D3-unsafe water sanitization warnings.

## Final Review

- Code-reviewer returned CLEAR for the P16 diff. Review found no behavior regression, boundary violation, cache cleanup side-effect drift, D3 unsafe warning key drift, or safe parts reconstruction blocker.
- First-principles check: the extracted owner owns projected geometry math and D3-unsafe geometry policy; host still owns renderer lifecycle, `runtimeState` writes, global D3 access, and water Path2D cache variables. This is the smallest stable boundary for P16 because moving Path2D cache ownership would couple this owner to canvas/rendering lifecycle.
