# Transport Render/Data Closeout Task Log

## Status

Current status: complete and ready for cleanup after push confirmation.

## Workstream Tasks

### WS3: Dist Drift Guard

- [x] Confirm tracked `dist` path set.
- [x] Run `tools/build_pages_dist.py` through available Python entry points.
- [x] Add local `verify:dist-drift` script.
- [x] Add deploy-minimal CI drift guard.
- [x] Expand the guard to cover root Pages outputs and app mirror outputs.
- [x] Add a unit contract that every tracked `dist` path is covered by both guard definitions.
- [x] Verify deliberate drift failure and revert.

### WS2: Jsonschema Smoke Profile Validator

- [x] Run baseline profile contract tests.
- [x] Confirm `jsonschema` is already available through project requirements.
- [x] Replace hand-rolled structural checks with a Draft 2020-12 schema.
- [x] Preserve localhost, output containment, safe ID, port, budget, mode subset, and route reference checks.
- [x] Reject blank or whitespace-only strings in required text fields.
- [x] Run contract test and real profile validation.

### WS1: Single OSM-GPKG Family Driver

- [x] Reuse existing golden fixture and snapshots against current builders.
- [x] Run golden test against current code before refactor.
- [x] Add `FamilyOutput` and per-output registry config.
- [x] Add row-builder dispatch and generic driver.
- [x] Repoint builder registry through the generic driver while keeping thin compatibility wrappers.
- [x] Add Python-JS geometry contract test.
- [x] Run builder contract tests.

### Final Closeout

- [x] Run changed-file cleanup review.
- [x] Run independent static review lanes.
- [x] Fix review gaps: named Node test ownership, complete dist drift pathspec, and non-blank schema strings.
- [x] Run final targeted verification.
- [x] Update worktree registry and archive task docs.
- [x] Commit closeout fixes.
- [ ] Push branch to `origin/main`.
- [ ] Remove worktree after push confirmation.

## Delivery Package

### 1. Changed Summary

- Split road and rail workbench preview modules into orchestration, DOM, and runtime layers while keeping generated `dist/app` mirrors aligned.
- Added a Pages dist drift guard in `package.json` and deploy-minimal CI that covers all tracked root and app dist outputs.
- Replaced smoke profile structural validation with a JSON Schema while retaining explicit security and relationship checks.
- Centralized OSM-GPKG country pack construction through output-level registry config and a generic family driver.
- Added/extended tests for runtime preview behavior, dist guard coverage, smoke profile validation, OSM-GPKG byte stability, and Python-JS geometry contracts.

### 2. Changed Files

Core files:
- `.github/workflows/verify-shared.yml`
- `package.json`
- `tools/browser_smoke_profile_contract.py`
- `tools/build_transport_country_real_packs.py`
- `map_builder/transport_family_registry.py`
- `js/ui/transport_workbench_road_preview*.js`
- `js/ui/transport_workbench_rail_preview*.js`
- `ops/browser-mcp/inspection-profile.schema.md`

Tests:
- `tests/test_global_transport_builder_contracts.py`
- `tests/test_pages_dist_startup_shell.py`
- `tests/test_playwright_app_ready_gate_contract.py`
- `tests/transport_workbench_road_preview_runtime_behavior.test.mjs`
- `tests/transport_workbench_rail_preview_runtime_behavior.test.mjs`

Generated delivery files:
- `dist/app/js/core/map_renderer.js`
- `dist/app/js/core/renderer/scenario_chunk_promotion_helpers.js`
- `dist/app/js/core/renderer/spatial_query_index.js`
- `dist/app/js/ui/transport_workbench_road_preview*.js`
- `dist/app/js/ui/transport_workbench_rail_preview*.js`
- `dist/pages-dist-manifest.json`

Docs:
- `docs/active/_worktree_registry.md`
- `docs/archive/transport-render-data-closeout-20260616/plan.md`
- `docs/archive/transport-render-data-closeout-20260616/context.md`
- `docs/archive/transport-render-data-closeout-20260616/task.md`

Temporary files:
- None retained.

### 3. Diff Summary

- Base branch: `main`
- Base commit: `f4063d31165c6f9ae179b690ebded394c10366ff`
- Merge-base with `main`: `f4063d31165c6f9ae179b690ebded394c10366ff`
- Reviewed commit window: the transport render/data closeout cluster on `refactor/transport-render-data-closeout`, seven commits before final closeout plus the final audit fix commit.

### 4. Commit Status

Committed before final closeout:
- `7f99ae47` Split Japan road preview into runtime/dom/orchestration layers
- `db470af8` Split Japan rail preview into runtime/dom/orchestration layers
- `5f87f5b0` Keep tracked Pages dist aligned before drift guard
- `5b0bbc5f` Prevent tracked Pages dist drift in CI
- `825595b2` Move smoke profile structure checks into jsonschema
- `839fad6e` Centralize OSM GeoPackage country pack construction
- `893a3aaf` Close transport closeout verification gaps

Final closeout commit:
- Contains the final audit fixes, registry state correction, and archive move.

### 5. Base Divergence

The branch is based on `f4063d31`, which matched `origin/main` when the closeout started. The parent checkout on `main` still has unrelated dirty localization and dist mirror WIP, so integration is performed by pushing this clean worktree branch directly to `origin/main`.

### 6. Conflict Risk

- Direct path overlap risk with parent checkout: Yellow, because parent `main` has unrelated dirty i18n/lessons/dist WIP and this branch touches tracked dist.
- Direct path overlap inside closeout scope: expected, because Pages dist mirrors are generated from source changes.
- Semantic risk: Yellow, because smoke profile schema and transport builder registry are shared validation surfaces.

### 7. Verification

Passed during closeout:
- `py -3 -m py_compile tools/build_transport_country_real_packs.py map_builder/transport_family_registry.py tests/test_global_transport_builder_contracts.py tools/browser_smoke_profile_contract.py`
- `py -3 -m unittest tests.test_global_transport_builder_contracts tests.test_transport_country_source_contracts tests.test_playwright_app_ready_gate_contract -q`
- `py -3 tools/browser_smoke_profile_contract.py ops/browser-mcp/inspection-profile.toml`
- `node tools/check_test_import_graph.mjs`
- `npm run -s test:node:transport-workbench-preview-lifecycle-owner`
- `py -3 -m unittest tests.test_pages_dist_startup_shell.PagesDistStartupShellTest.test_pages_dist_drift_guard_covers_tracked_dist_outputs -q`
- `npm run -s verify:dist-drift`
- `git diff --check`

Targeted equivalent for `verify:pages-dist`:
- `py -3 tools/build_pages_dist.py`
- `py -3 -m unittest tests.test_pages_dist_startup_shell -q`
- `npm run -s test:node:landing-showcase-view`

WS3 deliberate negative check:
- An intentional `js/main.js` source edit caused the dist drift guard to fail after rebuilding dist, then the edit was reverted and the guard passed.

### 8. Remaining Risks

- Real Geofabrik cache rebuilds were not run; the golden fixture verifies byte stability for the representative OSM-GPKG builder path.
- The parent checkout remains dirty with unrelated localization/dist WIP and should be refreshed carefully after this branch is pushed.

### 9. Recommended Next Step

Push the closeout commit stack to `origin/main`, confirm the remote advanced, then remove `C:\Users\raede\.codex\worktrees\mapcreator-transport-render-data-closeout`.
