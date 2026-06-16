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

Phase 1 is complete and pushed. Phase 2 is the current delivery unit. Phase 4 is tracked as evidence-only until renderer owner phases are green, because clone migration touches wider state/startup code and has different risk.

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

## 2026-06-16 Phase 2 Rivers Closeout

- User requested pushing Phase 1 plus other work as separate commits, then continuing Phase 2 to completion.
- Created and pushed:
  - `98cd1e84` `Separate modern city lights rendering ownership`
  - `c4e81cf4` `Trim stale archive notes from active history`
- Static evidence and child-agent review both confirmed `drawRiversLayer` is already a thin wrapper in `map_renderer.js`, with the draw body in `js/core/renderer/river_layer_render_owner.js`.
- Added `tests/river_layer_render_owner_behavior.test.mjs` and `npm run test:node:river-layer-owner` to directly cover skip metrics, zoom/class visibility rules, offscreen culling, dash scaling, and line width drawing.
- Adjusted `tests/e2e/river_layer_regression.spec.js` to assert invisible low-zoom mid-tier rivers through render metrics; direct owner drawing behavior is covered by the new Node test. Whole-canvas low-zoom pixel diffs are noisy for lake/intermittent/canal subsets even when `visibleFeatureCount` is zero.
- Phase 2 green evidence:
  - `node --check js/core/map_renderer.js`
  - `node --check js/core/renderer/river_layer_render_owner.js`
  - `npm run test:node:river-layer-owner`
  - `npm run test:node:river-layer-contracts`
  - `npm run test:node:appearance-rivers-owner`
  - `node node_modules/@playwright/test/cli.js test tests/e2e/river_layer_regression.spec.js --workers=1 --retries=0`
- Full `npm run test:e2e:water-rendering` remains red outside the river owner slice: named water inspector waits timed out, open-ocean scenario idle waits timed out, while water cache specs passed. Evidence log: `.runtime/tests/renderer-rivers-phase2/water-rendering.log`.

## 2026-06-16 Phase 3A Ocean Owner

- User requested continuing Phase 3.
- Static subagent review confirmed the safe Ocean boundary:
  - Keep `invalidateOcean*VisualState`, `drawBackgroundPass`, `drawOceanDepthMaskLayer`, public bathymetry facade, data loading, and mask helpers in `map_renderer.js`.
  - Move bathymetry band/contour drawing, coastal accent drawing, and `drawOceanStyle` orchestration into an owner.
- Added `js/core/renderer/ocean_render_owner.js`.
- Kept `map_renderer.js` wrappers for `drawBathymetryBands`, `buildVisibleBathymetryContourDepthSet`, `drawBathymetryContours`, `buildCoastalAccentStrokeBuckets`, `drawCoastalAccentStrokeBuckets`, `drawScenarioCoastalAccentOverlays`, `drawScenarioCoastalAccentLayer`, and `drawOceanStyle`.
- Added `tests/ocean_render_owner_behavior.test.mjs` and `npm run test:node:ocean-render-owner`.
- Updated `tests/ocean_depth_layer_contracts.test.mjs` so the background pass order and thin Ocean wrapper are both locked.
- Updated `tests/test_map_renderer_border_draw_owner_boundary_contract.py` so border/coastal style assertions follow the new owner boundary.
- Pages dist was rebuilt with `py -3 tools/build_pages_dist.py`, adding `dist/app/js/core/renderer/ocean_render_owner.js`.
- Phase 3A validation:
  - PASS: `node --check js/core/map_renderer.js`
  - PASS: `node --check js/core/renderer/ocean_render_owner.js`
  - PASS: `npm run test:node:ocean-render-owner`
  - PASS: `npm run test:node:ocean-depth-layer-contracts`
  - PASS: `py -3 -m unittest tests.test_map_renderer_border_draw_owner_boundary_contract tests.test_renderer_runtime_state_boundary_contract -q`
  - PASS: `node --input-type=module -e "import('./js/core/map_renderer.js').then(() => console.log('map_renderer import ok'))"`
  - PASS: `py -3 tools/build_pages_dist.py`
  - PASS: `py -3 -m unittest tests.test_pages_dist_startup_shell -q`
  - PASS: `npm run test:node:landing-showcase-view`
  - FAIL, pre-existing suite shape: `npm run test:e2e:water-rendering` still has 6 named-water/open-ocean timeouts, while 6 specs pass including river and water cache coverage. Evidence log: `.runtime/tests/renderer-ocean-phase3/water-rendering.log`.
- Physical subagent review recommends two boundaries for the remaining Phase 3 work:
  - `physical_layer_render_owner` for `physicalBase` and `contextBase` physical atlas/intensity/contour drawing.
  - A separate scenario relief owner later for `contextScenario` relief overlays, because its cache lifecycle differs.

## 2026-06-16 Phase 3B/3C Physical And Scenario Relief Owners

- Phase 3A Ocean was committed and pushed as `702d97c1`.
- Implemented `js/core/renderer/physical_layer_render_owner.js`.
- `map_renderer.js` now uses `getPhysicalLayerRenderOwner()` wrappers for `drawPhysicalAtlasCollectionLayer`, `drawPhysicalIntensityFieldLayer`, `drawPhysicalReliefOverlayLayer`, `drawPhysicalBasePass`, `drawPhysicalAtlasLayer`, `drawContourCollection`, and `drawPhysicalContourLayer`.
- Kept physical pass signatures, physical land clip mask cache, exact-refresh decisions, and context-base pass lifecycle in `map_renderer.js`.
- Added `tests/physical_layer_render_owner_behavior.test.mjs` and `npm run test:node:physical-layer-owner`.
- Updated `tests/physical_layer_contracts.test.mjs` to assert the physical owner boundary.
- Implemented `js/core/renderer/scenario_relief_overlay_render_owner.js` for the original Phase 3 `drawScenarioRelief*` scope.
- `map_renderer.js` keeps `renderScenarioReliefOverlaysLayerToCache()` and `drawScenarioReliefOverlaysPass()` so `contextScenario` relief reuse, signatures, and cache entries remain in the existing scenario pass lifecycle.
- Added `tests/scenario_relief_overlay_render_owner_behavior.test.mjs` and `npm run test:node:scenario-relief-overlay-owner`.
- Rebuilt Pages dist with both new owner modules.
- Phase 3B/3C validation:
  - PASS: `node --check js/core/map_renderer.js`
  - PASS: `node --check js/core/renderer/physical_layer_render_owner.js`
  - PASS: `node --check js/core/renderer/scenario_relief_overlay_render_owner.js`
  - PASS: `npm run test:node:physical-layer-owner`
  - PASS: `npm run test:node:scenario-relief-overlay-owner`
  - PASS: `npm run test:node:physical-layer-contracts`
  - PASS: `npm run test:node:scenario-chunk-contracts`
  - PASS: `node --input-type=module -e "import('./js/core/map_renderer.js').then(() => console.log('map_renderer import ok'))"`
  - PASS: `py -3 -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q`
  - PASS: `npm run test:e2e:physical-layer-runtime-contract`
  - PASS: `npm run test:e2e:physical-layer-regression`
  - PASS: `py -3 tools/build_pages_dist.py`
  - PASS: `py -3 -m unittest tests.test_pages_dist_startup_shell -q`
  - PASS: `npm run test:node:landing-showcase-view`
  - Remaining known gap from Phase 3A: full `npm run test:e2e:water-rendering` still has pre-existing named-water/open-ocean timeouts; the river/cache specs in that suite passed.
