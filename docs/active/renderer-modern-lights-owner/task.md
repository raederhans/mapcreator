# Renderer Modern City Lights Owner Task

## Current Status

Status: ready-for-integration

## Files Expected To Change

- Core:
  - `js/core/map_renderer.js`
  - `js/core/renderer/modern_city_lights_render_owner.js`
- Tests:
  - `tests/modern_city_lights_render_owner_behavior.test.mjs`
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
- Child agents stayed in static inspection/review lanes.

## Delivery Package

### 1. What Changed

- Extracted Modern City Lights rendering internals into `createModernCityLightsRenderOwner`.
- Moved Modern City Lights geometry, population boost, and static layer caches out of `map_renderer.js`.
- Kept shared historical/modern helpers reachable through thin wrappers in `map_renderer.js`.
- Injected canvas creation and default zoom helpers from `map_renderer.js` so browser globals stay at the renderer boundary.
- Added owner behavior tests and a named package script.
- Rebuilt Pages dist so the delivery copy includes the new owner module.

### 2. Changed Files

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

### 3. Diff Summary

- `map_renderer.js` is smaller by roughly 1,000 lines and now delegates Modern City Lights work to the new owner.
- New owner file contains the moved Modern City Lights draw/culling/cache logic with injected state, getters, constants, and helpers.
- Pages dist mirrors the source split and updates the manifest.

### 4. Commit State

- Not committed. The worktree contains many unrelated `docs/archive/**` deletions and pre-existing `lessons learned.md` edits, so a safe commit should stage only this delivery package or first isolate unrelated dirt.

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
- FAIL, environment: `npm run verify:pages-dist` because `python` is not on PATH.
- FAIL, pre-existing/environment: `npm run perf:gate` and retry with `PERF_DEV_SERVER_READY_TIMEOUT_MS=120000`, both failed waiting for the dev server to become ready.
- PRE-EDIT FAIL: full `npm run test:e2e:city-rendering` failed before edits in unrelated label/marker specs with 401 console issue.

### 8. Remaining Risks

- Full city-rendering suite stayed red from the pre-edit baseline, so this delivery relies on the focused city lights e2e plus node contracts.
- Perf gate remains unavailable in this shell because the perf dev server readiness check times out.
- `lessons learned.md` has pre-existing edits mixed with this task's appended lesson.

### 9. Recommended Next Step

- Rebase or refresh against current main, stage only the listed delivery files, run the green validation set again, then merge.
- Defer Phase 2 Rivers until this Phase 1 package is integrated.

### 10. Integration Answer

- Can integrate after protecting unrelated worktree dirt.
- Recommended method: rebase after main refresh, then merge this branch as a narrow renderer extraction package.
