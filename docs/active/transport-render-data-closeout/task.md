# Transport Render/Data Closeout Task Log

## Status

Current status: in-progress

## Workstream Tasks

### WS3: Dist Drift Guard

- [x] Confirm tracked `dist/app` path set.
- [x] Run `python tools/build_pages_dist.py` equivalent with bundled Python because `python` is not on PATH in Codex App PowerShell.
- [x] Confirm generated changes are scoped to tracked dist and manifest.
- [x] Add `.github/workflows/verify-shared.yml` drift guard.
- [x] Add `package.json` script `verify:dist-drift`.
- [x] Verify passing guard.
- [x] Verify deliberate drift failure and revert.
- [x] Commit WS3.

### WS2: Jsonschema Smoke Profile Validator

- [x] Run baseline `python -m unittest tests.test_playwright_app_ready_gate_contract -q`.
- [x] Locate dependency files and add `jsonschema>=4.0` if missing.
- [x] Confirm `jsonschema` import.
- [x] Replace structural checks with Draft 2020-12 schema.
- [x] Preserve localhost, output containment, safe ID, port, budget, mode subset, and route reference checks.
- [x] Run contract test and real profile validation.
- [x] Update schema doc if needed.
- [x] Commit WS2.

### WS1: Single OSM-GPKG Family Driver

- [x] Discover clock/output/stub points and live pack IDs.
- [x] Reuse existing golden fixture and snapshots against current builders.
- [x] Run golden test against current code.
- [x] Confirm separate pre-refactor commit is unnecessary because existing golden net already covers the refactor.
- [x] Add `FamilyOutput` and per-output registry config.
- [x] Add row-builder dispatch and generic driver.
- [x] Repoint builder registry through the generic driver while keeping thin compatibility wrappers for existing tests/scripts.
- [x] Run golden test with zero diffs.
- [x] Add Python-JS geometry contract test.
- [x] Run builder contract tests.
- [x] Commit WS1.

### Final Closeout

- [x] Run changed-file ai-slop-cleaner pass.
- [x] Run final targeted verification.
- [x] Run independent code-review lanes.
- [x] Run or justify UltraQA.
- [x] Update worktree registry and delivery package.
- [ ] Push branch if verification is clean.
- [ ] Clean worktree only after merge/abandon condition is satisfied.

## Delivery Package Draft

## Delivery Package

### 1. Changed Summary

- Added a deploy-minimal Pages dist drift guard and a local `verify:dist-drift` script.
- Rebuilt tracked Pages dist so the new guard starts from a clean mirror.
- Replaced browser smoke profile structural validation with a Draft 2020-12 `jsonschema` schema while preserving explicit security and relationship checks.
- Moved OSM-GPKG family config to output-level registry entries and routed road, rail, industrial, and logistics country packs through one generic family driver.
- Added/extended contract tests for OSM-GPKG byte-stable output, per-output registry coverage, and Python-to-JS geometry-kind alignment.

### 2. Changed Files

Core files:
- `.github/workflows/verify-shared.yml`
- `package.json`
- `tools/browser_smoke_profile_contract.py`
- `tools/build_transport_country_real_packs.py`
- `map_builder/transport_family_registry.py`
- `ops/browser-mcp/inspection-profile.schema.md`

Tests:
- `tests/test_global_transport_builder_contracts.py`

Generated delivery files:
- `dist/app/js/core/map_renderer.js`
- `dist/app/js/core/renderer/scenario_chunk_promotion_helpers.js`
- `dist/app/js/core/renderer/spatial_query_index.js`
- `dist/app/js/ui/transport_workbench_road_preview*.js`
- `dist/app/js/ui/transport_workbench_rail_preview*.js`
- `dist/pages-dist-manifest.json`

Existing branch files carried forward:
- `js/ui/transport_workbench_road_preview*.js`
- `js/ui/transport_workbench_rail_preview*.js`
- `tests/transport_workbench_road_preview_runtime_behavior.test.mjs`
- `tests/transport_workbench_rail_preview_runtime_behavior.test.mjs`

Docs:
- `docs/active/_worktree_registry.md`
- `docs/active/transport-render-data-closeout/plan.md`
- `docs/active/transport-render-data-closeout/context.md`
- `docs/active/transport-render-data-closeout/task.md`

Temporary files:
- None retained.

### 3. Diff Summary

- Base branch: `main`
- Base commit: `f4063d31165c6f9ae179b690ebded394c10366ff`
- Current closeout code commit before final docs-only commit: `839fad6ec4176c88b3838f779f0067022b2d8500`
- Merge-base with `main`: `f4063d31165c6f9ae179b690ebded394c10366ff`
- Branch diff summary: 29 files changed, including prior road/rail preview split commits plus WS3, WS2, and WS1 closeout commits.

### 4. Commit Status

Committed:
- `5f87f5b0` Keep tracked Pages dist aligned before drift guard
- `5b0bbc5f` Prevent tracked Pages dist drift in CI
- `825595b2` Move smoke profile structure checks into jsonschema
- `839fad6e` Centralize OSM GeoPackage country pack construction

Final docs-only closeout commit remains pending until this delivery package and registry update are committed.

### 5. Base Divergence

The branch is based on `f4063d31`, which matches current `main` merge-base. It has diverged by the carried-forward road/rail preview split work plus the four closeout commits above.

### 6. Conflict Risk

- Direct path overlap risk with parent checkout: Yellow, because parent `main` has unrelated dirty i18n/lessons/dist WIP and this branch touches tracked dist.
- Direct path overlap inside closeout scope: expected, because WS3 intentionally mirrors existing JS changes into `dist/app`.
- No detected overlap with active TNO toponym docs.

### 7. Verification

Passed:
- `$env:PATH='C:\Users\raede\.cache\codex-runtimes\codex-primary-runtime\dependencies\python;' + $env:PATH; npm run verify:dist-drift`
- `py -3 -m unittest tests.test_playwright_app_ready_gate_contract tests.test_global_transport_builder_contracts tests.test_transport_country_source_contracts -q`
- `py -3 tools/browser_smoke_profile_contract.py ops/browser-mcp/inspection-profile.toml`
- `node tools/check_test_import_graph.mjs`
- `git diff --check`

WS3 deliberate negative check:
- Before committing WS3, an intentional `js/main.js` change caused `git diff --exit-code -- dist/app/js` to fail with exit code 1 after rebuilding dist, then the change was reverted and the guard passed.

### 8. Remaining Risks

- Real Geofabrik cache rebuilds were not run; the golden fixture verifies byte stability for the representative OSM-GPKG builder path.
- Parent checkout has unrelated dirty localization/dist WIP, so integration should happen from a clean main or an integration owner lane that preserves those changes.

### 9. Recommended Next Step

Recommended integration path: rebase or fast-forward merge this branch into a clean `main`, run `npm run verify:dist-drift` and the same targeted Python contract set, then push. Keep the worktree until the merge/push is confirmed.
