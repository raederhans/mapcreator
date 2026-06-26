# P17 Viewport Read-Model Owner Context

## Baseline

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-viewport-read-model-owner-p17-20260626`
- Branch: `codex/viewport-read-model-owner-p17-20260626`
- Base: `origin/main@25df0b12905594fe4e6fd285cd3c3062c473796a`
- Parent checkout remains dirty with unrelated `docs/archive/**` deletion WIP and `lessons learned.md` WIP.

## Confirmed Facts

- `git status --short` in the P17 worktree was clean immediately after creation.
- `git rev-parse HEAD` and `git rev-parse origin/main` both returned `25df0b12905594fe4e6fd285cd3c3062c473796a`.
- `js/core/renderer/projected_geometry_bounds_owner.js` exists in the P17 base, so P16 is present.
- Existing viewport read-model helpers in `map_renderer.js` are:
  - `getViewportRenderSignature`
  - `getProjectionRenderSignature`
  - `getViewportGeoBounds`
  - `calculatePanExtent`
  - `getProjectedRenderableContentBounds`
  - `getCenteredFitZoomTransform`
  - `getZoomPercent`

## Execution Notes

- Keep zoom behavior side effects in `map_renderer.js`.
- Keep `runtimeState` writes in `map_renderer.js`.
- New owner may read injected state and getters, and returns computed read-model values only.

## Implementation Notes

- Added `js/core/renderer/viewport_read_model_owner.js` with `createViewportReadModelOwner(...)`.
- `map_renderer.js` now keeps the public wrapper function names and delegates viewport/projection signatures, viewport geo bounds, pan extent, renderable content bounds, centered fit transform, and zoom percent to the owner.
- Host-only side effects remain in `map_renderer.js`: zoom behavior updates, interaction rect updates, reset/apply zoom transforms, resize handling, projection fitting, map updates, canvas/SVG drawing, and runtime state writes.
- Added `tests/viewport_read_model_owner_behavior.test.mjs` and package script `test:node:viewport-read-model-owner`.
- Extended architecture checks so the new owner has a line budget, side-effect token guards, and renderer wrapper delegation checks.
- Updated the existing Python render pipeline boundary contract so HGO/content bounds and pan extent assertions follow the new owner boundary.

## Validation Evidence

- `node --check js/core/renderer/viewport_read_model_owner.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/viewport_read_model_owner_behavior.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `npm run test:node:viewport-read-model-owner` passed 12/12.
- `npm run test:node:projected-geometry-bounds-owner` passed 12/12.
- `npm run test:node:render-transform-reuse-policy-owner` passed 7/7.
- `npm run test:node:render-cache-owner` passed 6/6.
- `npm run test:node:render-pipeline-catalog` passed 3/3.
- `npm run test:node:exact-after-settle-pass-catalog` passed 6/6.
- `npm run test:node:renderer-host-inventory` passed 7/7.
- `npm run test:node:renderer-runtime-state-behavior` passed 10/10.
- `npm run test:node:render-transaction-diagnostics` passed.
- `npm run test:node:scenario-refresh-plans` passed 23/23.
- `npm run test:node:scenario-chunk-contracts` passed 57/57.
- `npm run test:node:canvas-layer-manager` passed 4/4.
- `npm run verify:architecture-boundaries` passed.
- `npm run verify:state-write-allowlist` passed with 115 tracked files.
- `npm run verify:test-import-graph` passed with 49 specs.
- `npm run python -- -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q` passed 5/5.
- `npm run test:e2e:dev:tno-ready-state` passed 5/5.
- `npm run test:e2e:smoke` passed 4/4; the log retained known local auth 401 and D3 unsafe water geometry warnings.
- `git diff --check` passed.
- Forbidden-path scan found no `dist/app/**`, state-write allowlist, or `js/core/map_renderer/public.js` edits.
- Owner side-effect scan found no `runtimeState`, `zoomBehavior`, `interactionRect`, `document.`, or `map_renderer` references.

## Closeout Notes

- Functional commit: `2eb791867350d510517d0fe350d78a638b18d43f`.
- Functional commit was pushed to `origin/codex/viewport-read-model-owner-p17-20260626` and fast-forwarded to `origin/main`.
- This archive move and registry update are the closeout step.
- Local isolated worktree cleanup follows after the closeout commit is pushed and verified as reachable from `origin/main`.
