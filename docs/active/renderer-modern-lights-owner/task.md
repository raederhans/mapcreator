# Renderer Layer Owner Split Task

## Current Status

Status: in-progress

## Files Expected To Change

- Core:
  - `js/core/map_renderer.js`
  - `js/core/renderer/modern_city_lights_render_owner.js`
  - `js/core/renderer/river_layer_render_owner.js`
- Tests:
  - `tests/modern_city_lights_render_owner_behavior.test.mjs`
  - `tests/river_layer_render_owner_behavior.test.mjs`
  - `tests/e2e/river_layer_regression.spec.js`
  - `package.json`
- Docs:
  - `docs/active/renderer-modern-lights-owner/plan.md`
  - `docs/active/renderer-modern-lights-owner/context.md`
  - `docs/active/renderer-modern-lights-owner/task.md`
  - `docs/active/_worktree_registry.md`

## Validation Plan

- Pre-edit baseline:
  - `node --check js/core/map_renderer.js`
  - `npm run test:node:city-lights-assets`
  - `npm run test:e2e:city-rendering`
  - `npm run perf:gate`
- Pre-edit focused fallback after unrelated city-rendering baseline failure:
  - `node node_modules/@playwright/test/cli.js test tests/e2e/city_lights_layer_regression.spec.js --workers=1 --retries=0`
  - `npm run perf:gate`
- Post-edit targeted:
  - `node --check js/core/map_renderer.js js/core/renderer/modern_city_lights_render_owner.js`
  - `npm run test:node:modern-city-lights-owner`
  - `node node_modules/@playwright/test/cli.js test tests/e2e/city_lights_layer_regression.spec.js --workers=1 --retries=0`
  - `verify:pages-dist` equivalent through `py -3`
  - `npm run perf:gate`
- Phase 2 targeted:
  - `node --check js/core/map_renderer.js js/core/renderer/river_layer_render_owner.js`
  - `npm run test:node:river-layer-owner`
  - `npm run test:node:river-layer-contracts`
  - `npm run test:node:appearance-rivers-owner`
  - `node node_modules/@playwright/test/cli.js test tests/e2e/river_layer_regression.spec.js --workers=1 --retries=0`

## Live Process Ownership

- Owner: main Codex agent.
- Current process: none.
- Logs:
  - `.runtime/tests/renderer-modern-lights-owner/baseline.log`
  - `.runtime/tests/renderer-modern-lights-owner/focused-baseline.log`
  - `.runtime/tests/renderer-modern-lights-owner/post-focused-city-lights-foreground.log`
  - `.runtime/tests/renderer-modern-lights-owner/verify-pages-dist-py.log`
  - `.runtime/tests/renderer-modern-lights-owner/verify-pages-dist-unittest.log`
  - `.runtime/tests/renderer-modern-lights-owner/verify-pages-dist-landing.log`
  - `.runtime/tests/renderer-modern-lights-owner/post-perf-gate.log`
  - `.runtime/tests/renderer-rivers-phase2/river-layer-contracts.log`
  - `.runtime/tests/renderer-rivers-phase2/water-rendering.log`
  - `.runtime/tests/renderer-rivers-phase2/river-layer-regression-focused.log`
- Child agents stayed in static inspection/review lanes.

## Delivery Package

### 1. What Changed

- Extracted Modern City Lights rendering internals into `createModernCityLightsRenderOwner`.
- Moved Modern City Lights geometry, population boost, and static layer caches out of `map_renderer.js`.
- Kept shared historical/modern helpers reachable through thin wrappers in `map_renderer.js`.
- Injected canvas creation and default zoom helpers from `map_renderer.js` so browser globals stay at the renderer boundary.
- Added owner behavior tests and a named package script.
- Rebuilt Pages dist so the delivery copy includes the new owner module.
- Confirmed Phase 2 Rivers owner extraction is already present and added direct owner behavior coverage.
- Repaired the focused river e2e low-zoom invisible-subset assertion so it uses render metrics, with direct drawing behavior covered by the owner test.

### 2. Changed Files

Branch cumulative files:

- Core:
  - `js/core/map_renderer.js`
  - `js/core/renderer/modern_city_lights_render_owner.js`
  - `dist/app/js/core/map_renderer.js`
  - `dist/app/js/core/renderer/modern_city_lights_render_owner.js`
  - `dist/pages-dist-manifest.json`
- Tests:
  - `tests/modern_city_lights_render_owner_behavior.test.mjs`
  - `package.json`
- Docs:
  - `docs/active/renderer-modern-lights-owner/plan.md`
  - `docs/active/renderer-modern-lights-owner/context.md`
  - `docs/active/renderer-modern-lights-owner/task.md`
  - `docs/active/_worktree_registry.md`
  - `lessons learned.md`
- Temporary evidence:
  - `.runtime/tests/renderer-modern-lights-owner/`
  - `.runtime/tmp/renderer-modern-lights-trace/`

Phase 2 current diff files:

- Tests:
  - `tests/river_layer_render_owner_behavior.test.mjs`
  - `tests/e2e/river_layer_regression.spec.js`
  - `package.json`
- Docs:
  - `docs/active/renderer-modern-lights-owner/plan.md`
  - `docs/active/renderer-modern-lights-owner/context.md`
  - `docs/active/renderer-modern-lights-owner/task.md`
  - `docs/active/_worktree_registry.md`
  - `lessons learned.md`
- Temporary evidence:
  - `.runtime/tests/renderer-rivers-phase2/`

### 3. Diff Summary

- `map_renderer.js` is smaller by roughly 1,000 lines and now delegates Modern City Lights work to the new owner.
- New owner file contains the moved Modern City Lights draw/culling/cache logic with injected state, getters, constants, and helpers.
- Pages dist mirrors the source split and updates the manifest.
- Rivers already had the draw body in `river_layer_render_owner.js`; this phase adds direct owner behavior coverage and tightens the river e2e assertion boundary.

### 4. Commit State

- Phase 1 committed as `98cd1e84`.
- Other documentation cleanup committed separately as `c4e81cf4`.
- Phase 2 changes are not committed yet.

### 5. Base Divergence

- Base commit: `5e3a7acaaef93b51e4766b0ee199ce40a2d95d66`.
- Current branch: `codex/renderer-modern-lights-owner`.
- Current main/origin state needs re-check before merge because the registry already notes main advanced during transport closeout work.

### 6. Potential Conflicts

- Direct path overlap: any parallel renderer owner extraction touching `js/core/map_renderer.js` or `dist/app/js/core/map_renderer.js`.
- Semantic overlap: future river/ocean/physical extraction phases, render pass cache signatures, and Pages dist rebuilds.
- Unrelated dirty overlap: existing archive deletions and `lessons learned.md` edits should be protected before staging.

### 7. Verification Run

- PASS: `node --check js/core/map_renderer.js`
- PASS: `node --input-type=module -e "import('./js/core/map_renderer.js')..."`
- PASS: `node --input-type=module -e "import('./js/core/renderer/modern_city_lights_render_owner.js')..."`
- PASS: `npm run test:node:modern-city-lights-owner`
- PASS: `npm run test:node:city-lights-assets`
- PASS: `node node_modules/@playwright/test/cli.js test tests/e2e/city_lights_layer_regression.spec.js --workers=1 --retries=0`
- PASS: `py -3 tools/build_pages_dist.py`
- PASS: `py -3 -m unittest tests.test_pages_dist_startup_shell -q`
- PASS: `npm run test:node:landing-showcase-view`
- PASS: `git diff --check`
- PASS: post-review static audit issues fixed: registry row, owner global boundary, cache invalidation coverage.
- PASS: `npm run test:node:river-layer-owner`
- PASS: `npm run test:node:river-layer-contracts`
- PASS: `npm run test:node:appearance-rivers-owner`
- PASS: `node node_modules/@playwright/test/cli.js test tests/e2e/river_layer_regression.spec.js --workers=1 --retries=0`
- FAIL, environment: `npm run verify:pages-dist` because `python` is not on PATH.
- FAIL, pre-existing/environment: `npm run perf:gate` and retry with `PERF_DEV_SERVER_READY_TIMEOUT_MS=120000`, both failed waiting for the dev server to become ready.
- PRE-EDIT FAIL: full `npm run test:e2e:city-rendering` failed before edits in unrelated label/marker specs with 401 console issue.
- FAIL, non-river water suite: `npm run test:e2e:water-rendering` failed named water inspector and open-ocean waits; river focused specs pass and water cache specs pass.

### 8. Remaining Risks

- Full city-rendering suite stayed red from the pre-edit baseline, so this delivery relies on the focused city lights e2e plus node contracts.
- Perf gate remains unavailable in this shell because the perf dev server readiness check times out.
- Full water-rendering suite still has non-river failures, so Phase 2 closure relies on river owner behavior, river contracts, appearance river owner, and focused river e2e evidence.

### 9. Recommended Next Step

- Commit and push Phase 2 closeout after final review and diff check.
- Defer Phase 3 Ocean / Physical until Phase 2 commit is pushed.

### 10. Integration Answer

- Can integrate after protecting unrelated worktree dirt.
- Recommended method: rebase after main refresh, then merge this branch as a narrow renderer extraction package.
