# Renderer Modern City Lights Owner Context

## 2026-06-16 Start

- User supplied a renderer-focused split plan and requested autonomous execution with `autopilot`, `ultrawork`, `ultraqa`, and `ai-slop-cleaner`.
- In Codex App, these skills are applied as local workflow discipline; no OMX tmux runtime is assumed.
- `git status --short` was clean before branch creation.
- Created branch `codex/renderer-modern-lights-owner` from `main` at `5e3a7acaaef93b51e4766b0ee199ce40a2d95d66`.
- Read `lessons learned.md`; important renderer constraints are render pass lifecycle, projection/cache signatures, Pages/dist evidence, and perf-gate sampling context.
- Read `docs/shared/agent-tiers.md`; child agents are limited to static inspection/review and must not own live tests.
- Started baseline process PID `86780`; log path `.runtime/tests/renderer-modern-lights-owner/baseline.log`.
- Spawned two read-only child agents:
  - Modern City Lights extraction mapping.
  - Phase 4 clone/fallback risk mapping.

## Current Decision

Phase 1 is the current delivery unit. Phase 4 is tracked as evidence-only until Phase 1 is green, because clone migration touches wider state/startup code and has different risk.

## 2026-06-16 Baseline Result

- Pre-edit `node --check js/core/map_renderer.js`: pass.
- Pre-edit `npm run test:node:city-lights-assets`: pass.
- Pre-edit `npm run test:e2e:city-rendering`: fail before any code edit, with 6 passed and 2 failed.
- Failing specs:
  - `tests/e2e/city_label_i18n_redraw.spec.js`
  - `tests/e2e/city_marker_visibility_regression.spec.js`
- Failure signal: console issue assertion saw `Failed to load resource: the server responded with a status of 401 (Unauthorized)`.
- This is a pre-existing baseline issue in unrelated city label/marker specs. The focused city lights spec was not reported as failed in the baseline tail.
- Focused pre-edit `city_lights_layer_regression.spec.js`: pass, 1 passed. Evidence log: `.runtime/tests/renderer-modern-lights-owner/focused-baseline.log`.
- Focused pre-edit `npm run perf:gate`: fail before any code edit because the perf dev server did not become ready within the default 45 second timeout. No process was left listening on common local app ports after failure.
- Current validation approach: use syntax, owner unit tests, focused city lights e2e, and record the pre-existing full/perf baseline gaps separately from extraction behavior.

## 2026-06-16 Implementation Result

- Added `js/core/renderer/modern_city_lights_render_owner.js` and moved Modern City Lights caches plus render details into the new owner.
- Kept `map_renderer.js` as the lazy factory and thin wrappers for `getModernDayNightNumber`, `drawLightEllipse`, `toRgbaString`, `getSignedHashUnit`, and `drawModernNightLightsLayer`.
- Restored a mechanical extraction mistake where a broad `constants -> getters` replacement polluted neighboring owner getters; final smoke evidence includes direct `map_renderer.js` import and focused browser e2e.
- Added `tests/modern_city_lights_render_owner_behavior.test.mjs` and `npm run test:node:modern-city-lights-owner`.
- Ran `verify:pages-dist` through the Windows `py -3` equivalent because package script `python` is unavailable in this shell.
- Post-edit `npm run perf:gate` with `PERF_DEV_SERVER_READY_TIMEOUT_MS=120000` still failed because the dev server did not become ready within 120 seconds. This matches the pre-edit perf environment failure shape.

## 2026-06-16 Review Closeout

- Static review found three actionable issues: duplicate current-worktree registry row, direct owner dependencies on `globalThis` canvas/zoom helpers, and missing cache invalidation assertions.
- Fixed the registry to keep only the actual checked-out branch row for this path.
- Injected `createCanvas` and `getDefaultZoomTransform` from `map_renderer.js` into the Modern City Lights owner so canvas/document/zoom defaults stay at the renderer boundary.
- Extended owner behavior tests to assert population boost invalidation and static layer key invalidation across renderer state changes.
- Final validation after review fixes: `test:node:modern-city-lights-owner`, `test:node:city-lights-assets`, focused city lights e2e, Pages dist startup unittest, landing showcase view, and `git diff --check` all pass.
