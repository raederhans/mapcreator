# Renderer Layer Owner Split Task

## Current Status

Status: in-progress

Phase 3A Ocean owner is implemented and validated. Phase 3B Physical owner remains pending.

## Files Expected To Change

- Core:
  - `js/core/map_renderer.js`
  - `js/core/renderer/modern_city_lights_render_owner.js`
  - `js/core/renderer/river_layer_render_owner.js`
  - `js/core/renderer/ocean_render_owner.js`
  - `dist/app/js/core/map_renderer.js`
  - `dist/app/js/core/renderer/modern_city_lights_render_owner.js`
  - `dist/app/js/core/renderer/ocean_render_owner.js`
  - `dist/pages-dist-manifest.json`
- Tests:
  - `tests/modern_city_lights_render_owner_behavior.test.mjs`
  - `tests/river_layer_render_owner_behavior.test.mjs`
  - `tests/ocean_render_owner_behavior.test.mjs`
  - `tests/ocean_depth_layer_contracts.test.mjs`
  - `tests/e2e/river_layer_regression.spec.js`
  - `tests/test_map_renderer_border_draw_owner_boundary_contract.py`
  - `package.json`
- Docs:
  - `docs/active/renderer-modern-lights-owner/plan.md`
  - `docs/active/renderer-modern-lights-owner/context.md`
  - `docs/active/renderer-modern-lights-owner/task.md`
  - `docs/active/_worktree_registry.md`

## Live Process Ownership

- Owner: main Codex agent.
- Current process: none.
- Child agents stayed in static inspection/review lanes.
- Phase 3A logs:
  - `.runtime/tests/renderer-ocean-phase3/build-pages-dist.log`
  - `.runtime/tests/renderer-ocean-phase3/pages-dist-startup.log`
  - `.runtime/tests/renderer-ocean-phase3/landing-showcase-view.log`
  - `.runtime/tests/renderer-ocean-phase3/ocean-render-owner.log`
  - `.runtime/tests/renderer-ocean-phase3/ocean-depth-layer-contracts.log`
  - `.runtime/tests/renderer-ocean-phase3/water-rendering.log`

## Delivery Package

### 1. What Changed

- Extracted Modern City Lights rendering internals into `createModernCityLightsRenderOwner`.
- Added direct Rivers owner behavior coverage and closed Phase 2 with a focused river e2e contract.
- Extracted Ocean / Bathymetry / Coastal drawing details into `createOceanRenderOwner`.
- Kept Ocean invalidators, background pass composition, depth mask, bathymetry data loading, and public facades in `map_renderer.js`.
- Added direct Ocean owner behavior coverage and updated boundary contracts for Ocean and border/coastal interaction.

### 2. Changed Files

Phase 3A current diff files:

- Core:
  - `js/core/map_renderer.js`
  - `js/core/renderer/ocean_render_owner.js`
  - `dist/app/js/core/map_renderer.js`
  - `dist/app/js/core/renderer/ocean_render_owner.js`
  - `dist/pages-dist-manifest.json`
- Tests:
  - `tests/ocean_render_owner_behavior.test.mjs`
  - `tests/ocean_depth_layer_contracts.test.mjs`
  - `tests/test_map_renderer_border_draw_owner_boundary_contract.py`
  - `package.json`
- Docs:
  - `docs/active/renderer-modern-lights-owner/plan.md`
  - `docs/active/renderer-modern-lights-owner/context.md`
  - `docs/active/renderer-modern-lights-owner/task.md`
  - `docs/active/_worktree_registry.md`

### 3. Diff Summary

- `map_renderer.js` keeps thin Ocean wrapper functions and a lazy `getOceanRenderOwner()` factory.
- `ocean_render_owner.js` owns bathymetry band/contour drawing, coastal accent buckets, scenario coastal overlays, and `drawOceanStyle`.
- Ocean data loading, invalidation, mask resolution, and depth mask drawing remain in `map_renderer.js`.
- Pages dist mirrors the source split and updates the manifest.

### 4. Commit State

- Phase 1 committed as `98cd1e84`.
- Other documentation cleanup committed separately as `c4e81cf4`.
- Phase 2 committed and pushed as `3f3b0da0`.
- Phase 3A Ocean changes are not committed yet.

### 5. Base Divergence

- Base commit: `5e3a7acaaef93b51e4766b0ee199ce40a2d95d66`.
- Current branch: `codex/renderer-modern-lights-owner`.
- Current main/origin state needs re-check before integration because multiple main closeouts happened during this branch.

### 6. Potential Conflicts

- Direct path overlap: any parallel renderer owner extraction touching `js/core/map_renderer.js`, `dist/app/js/core/map_renderer.js`, or `package.json`.
- Semantic overlap: Phase 3B Physical owner, render pass cache signatures, and Pages dist rebuilds.
- Physical overlap: Phase 3B will still touch `map_renderer.js`, docs, tests, and likely Pages dist.

### 7. Verification Run

- PASS: `node --check js/core/map_renderer.js`
- PASS: `node --check js/core/renderer/ocean_render_owner.js`
- PASS: `npm run test:node:ocean-render-owner`
- PASS: `npm run test:node:ocean-depth-layer-contracts`
- PASS: `py -3 -m unittest tests.test_map_renderer_border_draw_owner_boundary_contract tests.test_renderer_runtime_state_boundary_contract -q`
- PASS: `node --input-type=module -e "import('./js/core/map_renderer.js').then(() => console.log('map_renderer import ok'))"`
- PASS: `py -3 tools/build_pages_dist.py`
- PASS: `py -3 -m unittest tests.test_pages_dist_startup_shell -q`
- PASS: `npm run test:node:landing-showcase-view`
- FAIL, pre-existing suite shape: `npm run test:e2e:water-rendering` still failed 6 named-water/open-ocean timeout specs; 6 specs passed including river and water cache coverage.

### 8. Remaining Risks

- Full water-rendering suite still has named-water/open-ocean timeouts, so Phase 3A closure relies on owner behavior, ocean depth contracts, border runtime boundary contracts, Pages dist startup, and the passing river/cache parts of the water suite.
- Phase 3B physical extraction is still pending.

### 9. Recommended Next Step

- Commit and push Phase 3A Ocean owner after final diff check.
- Continue Phase 3B Physical owner split after the Ocean commit.

### 10. Integration Answer

- Phase 3A can integrate as an intermediate owner extraction commit, but the branch remains in progress until Phase 3B is done.
- Recommended method: keep Ocean and Physical as separate commits on the same branch, then rebase after main refresh before final merge.
