# WGI Real-source QA Fix Task

## Status

integrated, pushed, archived, and cleaned

## Historical Recovery Info

- Former path: `C:\Users\raede\Desktop\dev\mapcreator-wgi-real-source-qa-fix-20260622`
- Recovery branch: `codex/wgi-real-source-qa-fix-20260622@6ac22158`
- Functional commit: `d7e361f4`
- Closeout commit: `6ac22158`
- Base: `origin/main@902c83fd5aff6bffb8ea1f29ceec36800e6a6882`
- Cleanup commit after WGI closeout: `551347f4`
- Registry truth commit after cleanup: `159870ed`
- Current remote after cleanup and registry truth: `origin/main@159870ed0752d5e03ef550c2ac51e2af87125f24`

## Files Touched So Far

- Core: `map_builder/thematic_wgi_ingest.py`, `map_builder/thematic_layer_contracts.py`, `map_builder/contracts.py`
- Runtime UI: `js/core/thematic_layer_catalog.js`, `js/ui/toolbar/layer_status_diagnostics.js`, matching `dist/app/js/**`
- Tests: `tests/test_thematic_wgi_source_ingest.py`, `tests/test_thematic_layer_contracts.py`, `tests/test_pages_dist_startup_shell.py`, thematic/layer-panel/diagnostics Node tests, `tests/fixtures/thematic_wgi_2024_minimal.csv`
- Builder/catalog: `tools/build_thematic_layers.py`, `tools/build_pages_dist.py`, thematic data outputs, `dist/pages-dist-manifest.json`
- Docs: `docs/archive/wgi-real-source-qa-fix-20260622/`

## Verification Log

- PASS `py -3 -m py_compile map_builder\thematic_layer_contracts.py map_builder\thematic_wgi_ingest.py tools\build_thematic_layers.py map_builder\contracts.py`.
- PASS `py -3 -m unittest tests.test_thematic_wgi_source_ingest tests.test_thematic_layer_contracts -q`: 20 tests.
- PASS `py -3 tools\build_thematic_layers.py --include-wgi-real`: 4 layers, 17 outputs.
- PASS `py -3 tools\build_data_catalog.py`: 658 entries.
- PASS `py -3 -m unittest tests.test_thematic_layer_contracts tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_thematic_wgi_source_ingest -q`: 52 tests.
- PASS `py -3 tools\check_data_catalog.py`: 658 entries validated; existing empty hashRef warnings only.
- PASS `py -3 tools\data_health.py`: existing large-file warnings only.
- PASS `npm run test:node:thematic-layer-catalog`: 5 tests.
- PASS `npm run test:node:layer-panel-contracts`: 6 tests.
- PASS `npm run test:node:layer-status-diagnostics`: 6 tests.
- PASS `npm run verify:toolbar-split-boundary`: 53 tests.
- PASS `npm run verify:architecture-boundaries`.
- PASS `npm run verify:state-write-allowlist`: 112 tracked files.
- PASS `npm run verify:test-import-graph`: 49 specs.
- PASS `npm run verify:pages-dist`: dist build, 39 startup shell tests, 8 landing showcase tests, 1101.61 MiB total size.
- PASS `git diff --check`: line-ending warnings only.
- PASS dist runtime registry probe: `missing_count=0`.

## Risks

- Main checkout has unrelated local docs/lessons traces; final integration must preserve them.
- The WGI layer id/path still contains `state_capacity` for compatibility, while reader-facing title/description must say governance proxy.

## Next Step

Treat WGI QA as complete. Future thematic work should start from current main and keep renderer/UI/scenario-state changes in later slices.

## Delivery Package

1. Changed WGI source ingestion to preserve number of sources, standard errors, score 90% confidence intervals, estimate, and estimate 90% confidence intervals for source metrics.
2. Kept the composite as a project-defined proxy with `uncertainty.method=not_computed`; reader-facing WGI naming now says governance proxy and separates official dimensions from the project proxy.
3. Tightened thematic metric contracts so uncertainty numeric slots require finite numbers or null, while only `method` and `reason` may be text.
4. Published read-only thematic catalog/manifest payloads in Pages dist because runtime registry advertises them; added a startup-shell contract for registry URL availability.
5. Updated UI summary text from cache availability to source-derived metadata and kept all thematic layers catalog-only, default hidden, and main-map-render disabled.

### File Groups

- Core files: `map_builder/thematic_wgi_ingest.py`, `map_builder/thematic_layer_contracts.py`, `map_builder/contracts.py`.
- Runtime/UI files: `js/core/thematic_layer_catalog.js`, `js/ui/toolbar/layer_status_diagnostics.js`, `dist/app/js/core/thematic_layer_catalog.js`, `dist/app/js/ui/toolbar/layer_status_diagnostics.js`.
- Builder/generated files: `tools/build_thematic_layers.py`, `tools/build_pages_dist.py`, `data/thematic_layers/**`, `data/manifest.json`, `dist/pages-dist-manifest.json`.
- Test files: `tests/test_thematic_wgi_source_ingest.py`, `tests/test_thematic_layer_contracts.py`, `tests/test_pages_dist_startup_shell.py`, `tests/thematic_layer_catalog_behavior.test.mjs`, `tests/layer_panel_contracts_behavior.test.mjs`, `tests/layer_status_diagnostics_behavior.test.mjs`, `tests/fixtures/thematic_wgi_2024_minimal.csv`.
- Docs: `lessons learned.md`, `docs/archive/wgi-real-source-qa-fix-20260622/`, `docs/active/_worktree_registry.md`.
- Temporary files: local WGI source cache under `.runtime/source-cache/thematic/wgi/`, untracked by git.

### Diff Summary

- Functional commit: `d7e361f4`.
- Base commit: `902c83fd5aff6bffb8ea1f29ceec36800e6a6882`.
- Main divergence: branch was a direct descendant of `origin/main@902c83fd`; local main checkout had unrelated docs/lessons WIP and was kept out of the WGI QA push.
- Hot files touched: thematic data assets, WGI ingest owner, thematic contracts, runtime thematic catalog diagnostics, Pages dist manifest, data manifest.

### Conflict And Integration Assessment

- Direct file overlap with local main dirty state was `lessons learned.md` only; the unrelated cleanup is now isolated in `551347f4`.
- Direct file overlap with active current worktrees: none after WGI post-push truth worktree cleanup.
- Risk rating: green for the completed WGI QA code/data/dist path.
- Recommended integration: complete; use this archive as recovery evidence only.

### Verification Gaps

- Browser inspection was not run; this task is source/data/catalog contract work and non-browser checks cover the changed behavior.
- Live local dev server was not started.

### Recommendation

Do not replay the old integration recommendation; WGI QA is already on `origin/main`, and the next thematic slice should start from current main.
