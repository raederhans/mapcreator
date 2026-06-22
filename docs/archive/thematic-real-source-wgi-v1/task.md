# Thematic Real Source WGI v1 Task

## Checklist

- [x] Create isolated WGI worktree from current `origin/main`.
- [x] Confirm parallel worktree and overlap risk.
- [x] Update worktree registry for WGI lane.
- [x] Implement WGI ingest module.
- [x] Extend schemas/contracts.
- [x] Extend thematic builder.
- [x] Add WGI fixture and tests.
- [x] Generate checked-in WGI assets.
- [x] Refresh runtime registry, data manifest, and data catalog.
- [x] Run required validation.
- [x] Run independent review and QA gates.
- [x] Commit feature work.
- [x] Merge to main and run post-merge validation.
- [x] Push, archive docs, and clean worktree.

## Delivery Package

1. Changed summary:
   - Added cache-only World Bank WGI admin0 state-capacity ingest for 2024 government effectiveness, rule of law, and a two-metric composite.
   - Added checked-in WGI manifest, metrics, audit, and manual source recipe with source path, SHA-256, size, license, version, selected year, and audit evidence.
   - Extended thematic schemas/contracts, data artifact specs, catalog/manifest/runtime registry output, and landing/dist catalog counts from 654 to 658 assets.
   - Added fixture-backed WGI ingest tests, non-finite score guards, partial-output fail-fast behavior, and named test-route coverage.
   - Kept WGI catalog-only and experimental; no main map rendering, scenario override, or topology rewrite.
2. File groups:
   - Core: `map_builder/thematic_wgi_ingest.py`, `tools/build_thematic_layers.py`, `map_builder/thematic_layer_contracts.py`, `map_builder/contracts.py`, thematic schemas.
   - Data/generated: `data/thematic_layers/**`, `data/manifest.json`, `data/CATALOG.*`, `data/runtime_asset_registry.json`, `landing/*`, `dist/*`.
   - Tests/routes: `tests/test_thematic_wgi_source_ingest.py`, `tests/test_thematic_layer_contracts.py`, data catalog/manifest tests, structural tooling test, `tools/test_route_registry.mjs`, `package.json`.
   - Docs: `docs/active/thematic-real-source-wgi-v1/*`, `docs/active/_worktree_registry.md`.
3. Diff summary: feature commit `7336c055` changed 36 files, adding the WGI ingest owner, WGI data assets, source recipe, fixture, tests, route coverage, schema/contract extensions, refreshed catalog/runtime manifests, and Pages dist metadata.
4. Commit status: committed as `7336c05583fa546dcb783970a972ffe3868a855f` on `codex/thematic-real-source-wgi-v1-20260622`, then fast-forwarded into `main`.
5. Base divergence: branch started at `origin/main@d91daf1fd5da7af2e2b48b72d8daf565e83c28e1`, rebased through preview closeout up to current `origin/main@64a8ab719128e83a1f21f388144e0b801f98a91b`, then merged by fast-forward.
6. Conflict risk:
   - Resolved overlap with `codex/thematic-runtime-discovery-readonly-preview-20260622` by rebasing WGI after preview landed and preserving route/registry/package changes.
   - Green for renderer/scenario runtime because WGI remains catalog-only.
7. Verification passed:
   - `py -3 -m py_compile map_builder/thematic_layer_contracts.py map_builder/thematic_wgi_ingest.py tools/build_thematic_layers.py tests/test_thematic_wgi_source_ingest.py tests/test_thematic_layer_contracts.py`
   - `py -3 -m unittest tests.test_thematic_wgi_source_ingest tests.test_thematic_layer_contracts -q` -> 18 tests.
   - `npm run test:py:thematic-layer-contracts` -> 18 tests through named npm route.
   - `py -3 -m unittest tests.test_e2e_structural_tooling -q` -> 28 tests.
   - `py -3 tools/build_thematic_layers.py --include-wgi-real` -> `layers=4 outputs=17`.
   - `py -3 tools/build_thematic_layers.py` -> `layers=4 outputs=17`.
   - `py -3 tools/build_data_catalog.py` -> 658 entries.
   - `py -3 -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract -q` -> 32 tests.
   - `py -3 tools/check_data_catalog.py` -> 658 entries validated, with existing empty-hashRef warnings by role.
   - `npm run verify:architecture-boundaries`
   - `npm run verify:test-import-graph`
   - `npm run verify:pages-dist`
   - post-merge `npm run test:py:thematic-layer-contracts` -> 18 tests.
   - post-merge `py -3 -m unittest tests.test_e2e_structural_tooling -q` -> 28 tests after installing main checkout Node dependencies with `npm ci --ignore-scripts`.
   - post-merge `py -3 -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract -q` -> 32 tests.
   - post-merge `py -3 tools/check_data_catalog.py` -> 658 entries validated, with existing empty-hashRef warnings by role.
   - post-merge `npm run verify:architecture-boundaries`, `npm run verify:test-import-graph`, `npm run verify:pages-dist`, and `git diff --check`.
8. Remaining risks:
   - WGI direct three-letter code handling is intentionally explicit-code based plus known aggregate/non-ISO exclusions; future sources may need a maintained ISO authority table before UI rendering.
   - WGI remains catalog-only; UI rendering and scenario behavior need their own contracts before any visible map integration.
   - World Bank WGI workbook format changes may require updating the ingest parser and fixture.
9. Recommendation: push the closeout commit, remove the integrated WGI worktree after recovery refs are visible, and start the next phase from current main.
