# Renderer Fit Projection Owner P32 Context

## Starting evidence

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-p32-fit-projection-owner`
- Branch: `codex/p32-fit-projection-owner`
- Base: `origin/main@7fb3ade5`
- P31 is present on main: `docs/active/renderer-fit-projection-lifecycle-preflight-20260629.md` and `tests/renderer_fit_projection_lifecycle_inventory_boundary.test.mjs` exist in `HEAD`.
- Parent checkout is old and dirty, so P32 uses the isolated worktree.

## Current code facts

- `fitProjection({ skipSpatialIndex = false } = {})` currently lives in `js/core/map_renderer.js`.
- The current early-return guard is `!runtimeState.landData?.features?.length || runtimeState.width <= 0 || runtimeState.height <= 0`.
- Padding is `Math.max(16, Math.round(Math.min(runtimeState.width, runtimeState.height) * PROJECTION_FIT_PADDING_RATIO))`.
- `x1` and `y1` use `Math.max(padding + 1, width - padding)` and `Math.max(padding + 1, height - padding)`.
- `getRenderableLandFeatures(canvasWidth, canvasHeight, { forceProd: true })` supplies a renderable collection when non-empty; otherwise fit target stays `runtimeState.landData`.
- Effects run in this order: reset city anchor cache, rebuild projected bounds cache, build spatial index unless skipped, set hit canvas dirty, update special zone paths, render special zone editor overlay, update zoom translate extent, mark all overlays dirty.

## Constraints

- No direct `runtimeState` writes inside the new owner.
- No public facade change.
- No migration of render/hit/selection/scenario/exact/strategic semantics.
- State-write allowlist should remain unchanged.
- Browser confidence is conditional on local Playwright CLI availability.

## Implementation evidence

- Added `js/core/renderer/renderer_fit_projection_owner.js` as the first `fitProjection` owner. It reads `state`, `constants`, `getters`, and `surfaceHost`, then performs outside effects only through injected callbacks.
- `js/core/map_renderer.js` now imports the owner, creates `getRendererFitProjectionOwner()`, and keeps the public `fitProjection({ skipSpatialIndex = false } = {})` wrapper name and call shape.
- The owner preserves the existing padding math, `getRenderableLandFeatures(..., { forceProd: true })` fit target preference, fallback to `state.landData`, effect order, and `skipSpatialIndex` behavior.
- Direct `runtimeState.hitCanvasDirty = true` remains in the `map_renderer.js` injected effect, so the new owner does not require a state-write allowlist change.
- `dist/app/js/core/renderer/renderer_fit_projection_owner.js` was generated and matches the source owner byte-for-byte. `dist/app/js/core/map_renderer.js` contains the same P32 wiring tokens as source. Full-file source/dist renderer comparison remains noisy because of preexisting dist differences outside this task.

## Validation evidence

- Passed: `node --check` on the new owner, `map_renderer.js`, P32 tests, updated P28/P31 inventory tests, and `tools/check_architecture_boundaries.mjs`.
- Passed after review fix: `npm run test:node:renderer-fit-projection-owner` (12/12).
- Passed after review fix: `npm run test:node:renderer-fit-projection-lifecycle` (23/23).
- Passed: `npm run test:node:renderer-projection-path-lifecycle` (14/14) after updating its older raw-fitExtent expectation for the P32 owner boundary.
- Passed required neighbor suites: viewport read-model 12/12, viewport command 8/8, viewport resize lifecycle 12/12, projected geometry bounds 12/12, renderer SVG surface lifecycle 12/12, runtime state behavior 10/10, render transaction diagnostics 21/21, scenario refresh plans 24/24, exact-after-settle refresh plans 9/9, scenario chunk contracts 57/57.
- Passed: `npm run verify:architecture-boundaries`, `npm run verify:state-write-allowlist`, `npm run verify:test-import-graph`, and `git diff --check`.
- Partial: `npm run verify:pages-dist` generated the dist mirror, then failed only the Pages size gate: `1101.80 MiB exceeds 1024.00 MiB by 77.80 MiB`.
- Source/dist owner mirror check passed after review fix: both `js/core/renderer/renderer_fit_projection_owner.js` and `dist/app/js/core/renderer/renderer_fit_projection_owner.js` have SHA256 `555C318CF81EEF21B72A68E97E5750414D83635C4E469453726A8185AC9305C2`.
- Skipped: browser smoke, because `node_modules/@playwright/test/cli.js` is absent in this clean worktree.

## Review closeout

- Static code-review subagent initially returned REQUEST CHANGES with two findings.
- Fixed HIGH finding by making `projectionFitPaddingRatio`, `getLogicalCanvasDimensions`, `getRenderableLandFeatures`, and all required effects fail fast through constructor-time validation instead of silently continuing with missing dependencies.
- Fixed LOW finding by narrowing the projection/path lifecycle test to the `getRendererFitProjectionOwner()` wiring slice for P32 injected effect anchors.
- Re-ran owner behavior, fitProjection lifecycle, projection/path lifecycle, architecture boundary, state-write allowlist, test import graph, diff check, Pages generation, dist syntax, and source/dist owner hash checks after the review fix.

## Integration state

- This branch started from `origin/main@7fb3ade5`.
- During P32 verification, `origin/main` advanced to `0254d766`; the branch must rebase over current main before final integration.
- Current overlap risk is red for `dist/pages-dist-manifest.json` with the Pages slimming closeout line, yellow for `package.json`, `tools/check_architecture_boundaries.mjs`, and renderer lifecycle tests, and green for unrelated parent checkout WIP.
