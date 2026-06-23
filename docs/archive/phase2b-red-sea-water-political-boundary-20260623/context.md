# Phase 2B Context

## Initial Facts

- User request is Phase 2B: 1936/1939 Red Sea / water-political boundary repair.
- Parent checkout has unrelated UI/palette/startup WIP and is left untouched.
- Fresh worktree created from `origin/main@bad30a8d7b32ec7f91963538b318b73e3f14d621`.
- Relevant lessons:
  - open-ocean visibility and interaction flags are separate contracts.
  - water source, runtime, and chunk paths must be validated together.
  - scenario owner colors need complete runtime universe coverage without letting non-land helpers become owners.

## Progress Log

- 2026-06-23: Loaded `ultragoal` and `ultraqa`.
- 2026-06-23: Created isolated worktree and branch.
- 2026-06-23: Wrote active Phase 2B docs and initialized UltraQA state.
- 2026-06-23: Reproduced and instrumented 1936/1939 Red Sea behavior.
- 2026-06-23: Added a shared water-like feature predicate, land-only SOV backfill guard, water color-resolution guard, and open-ocean selection hit-gate fix.
- 2026-06-23: Rebuilt Pages dist and verified Phase 1.5, Phase 2A, Phase 2C, and Phase 2B regression surfaces.

## B0 Evidence

- Red Sea runtime water features were present in 1936/1939: `waterRegionsById=69`, `waterSpatialItems=77`.
- Sampled Red Sea canvas pixels were already water-blue in the final main canvas, for example `rgb(45,71,105)`.
- The fixed Red Sea sample point could overlap political shell geometry such as `GB_SHELL_FB_038`, but final paint stayed water-blue and the correct interaction target is the water region `marine_red_sea`.
- The selectable-water failure came from `getWaterHitFromPointer` returning early when `showWaterRegions=false`, even when `allowOpenOceanSelect=true`.
- The production hardening risk was that generic water-like political helpers needed the same ocean-color treatment as explicit open-ocean helpers, while Atlantropa owner-colored surfaces needed to keep owner semantics.

## Decisions

- Open-ocean selection is an interaction flag. It can select water targets while the water overlay is visually hidden.
- HOI4 SOV backfill is land-only. Ordinary RU land without explicit owner/controller remains backfilled to SOV, including shell-fallback land ids used as real land.
- `render_as_base_geography` and structured water-like features are excluded from the SOV land backfill.
- Generic water-like political helpers resolve to ocean fill. Atlantropa features with owner/base-color semantics keep their explicit owner color path.
- TNO post-edit draw/cache was kept as a regression target only.

## Validation Log

- PASS: `node --check js/core/scenario_runtime_queries.js js/core/scenario/pure_helpers.js js/core/renderer/color_resolution_strategy.js tests/e2e/non_1962_runtime_matrix.spec.js`.
- PASS: `node --test tests/scenario_pure_helpers.node.test.mjs` (3/3).
- PASS: `npm run test:node:scenario-chunk-contracts` (57/57).
- PASS: `node node_modules/@playwright/test/cli.js test tests/e2e/non_1962_runtime_matrix.spec.js --grep "hoi4_1936 starts active|hoi4_1939 starts active" --workers=1 --retries=0` (2/2).
- PASS: `npm run test:node:scenario-refresh-plans` (22/22).
- PASS: `npm run test:node:scenario-chunk-promotion-helpers` (9/9).
- PASS: `npm run test:node:render-transaction-diagnostics` (21/21).
- PASS: `npm run test:node:scenario-lifecycle-runtime-behavior` (14/14).
- PASS: `npm run test:node:palette-runtime-bridge` (20/20).
- PASS: TNO targeted Phase 2C grep for `tno post-edit keeps political detail fill before progressive recovery skip` (1/1).
- PASS: `npm run test:e2e:dev:scenario-chunk-runtime` (8/8).
- PASS: `npm run python -- -m unittest tests.test_map_renderer_color_resolution_strategy_boundary_contract -q` (2/2).
- PASS: `npm run python -- -m unittest tests.test_tno_water_owners_consistency -q` (3/3).
- PASS: `npm run python -- -m unittest tests.test_scenario_chunk_assets -q` (16/16).
- PASS: `npm run verify:pages-dist` (39 Python startup-shell tests and 8 landing Node tests).

## Delivery Package

- Changed behavior:
  - Shared structured water-like feature detection in `scenario_runtime_queries`.
  - HOI4 Far East SOV backfill now admits only land candidates.
  - Color resolution treats generic water-like helpers as ocean fill while preserving Atlantropa owner/base-color rules.
  - Open-ocean selection can hit water regions while water-region visualization is hidden.
  - 1936/1939 E2E records Red Sea water feature, final canvas RGB, water index sizes, and selected water hit.
- Core files:
  - `js/core/scenario_runtime_queries.js`
  - `js/core/scenario/pure_helpers.js`
  - `js/core/renderer/color_resolution_strategy.js`
  - `js/core/map_renderer.js`
  - `dist/app/js/core/scenario_runtime_queries.js`
  - `dist/app/js/core/scenario/pure_helpers.js`
  - `dist/app/js/core/renderer/color_resolution_strategy.js`
  - `dist/app/js/core/map_renderer.js`
  - `dist/pages-dist-manifest.json`
- Test files:
  - `tests/scenario_pure_helpers.node.test.mjs`
  - `tests/scenario_chunk_contracts.test.mjs`
  - `tests/e2e/non_1962_runtime_matrix.spec.js`
- Docs:
  - `docs/archive/phase2b-red-sea-water-political-boundary-20260623/`
  - `docs/active/_worktree_registry.md`
- Diff summary before final commit: 13 tracked source/test/dist files plus archived docs; about 440 insertions and 21 deletions before docs closeout edits.
- Commit state: ready to commit after final `git diff --check`.
- Base divergence: branch started from current `origin/main@bad30a8d7b32ec7f91963538b318b73e3f14d621`; final push should fast-forward remote main if no new remote commit appears.
- Conflict risk: yellow for renderer/scenario/color shared flow, green for Thematic/Appearance/Map Content UI and parent checkout WIP.
- Remaining risks: full non-1962 matrix beyond the targeted 1936/1939 grep was not rerun; targeted Red Sea assertions cover the requested regression.
- Recommended integration: commit on the isolated branch, push the branch for recovery, fast-forward `origin/main`, then remove the temporary worktree.
