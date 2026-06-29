# Phase 2A Context

## 2026-06-29 Intake

- User requested `$ralph` plus `$code-review` for Phase 2A Pages payload slimming.
- Task is complex because it touches Pages copy policy, generated dist, scenario metadata, tests, and release gating.
- Parent checkout has unrelated WIP; work is isolated on `codex/phase2a-pages-payload-slimming`.
- Base is `origin/main@d331daae879af0a70312c0f82f9c1a9bfb0e710d`.
- Live build/test ownership stays with the main agent.

## Initial Known Size Problem

- Current `dist/pages-dist-manifest.json` total: `1155317661`.
- Hard cap: `1073741824`.
- Over cap: `81575837`.
- First candidates: HGO runtime preview payload, Japan industrial zones preview GeoJSON, full city aliases, and TNO water detail chunk.

## Implementation Notes

- HGO runtime preview payload is local/developer preview for Pages: `data/hgo_runtime/{manifest.json,seed.json,provinces.bmp}` and `data/scenarios/hgo_1936/**` are excluded from Pages dist.
- Pages scenario index keeps the public policy explicit: public baselines remain `blank_base`, `modern_world`, `hoi4_1936`, `hoi4_1939`, and `tno_1962`; `hgo_1936` is recorded in `pages_dist_policy.local_preview_scenario_ids`.
- Runtime asset registry is pruned after copying so Pages registry assets only point at files shipped in `dist/app`; removed HGO runtime keys are recorded in `pages_dist_policy.removed_unpublished_asset_keys`.
- Japan industrial local preview GeoJSON files are excluded from Pages, and the dist transport manifest removes preview `industrial_zones` paths that would point at missing files.
- `city_aliases.json` is reduced for Pages by selecting 2500 stable keys through `data/world_cities.geojson` priority: world city, capital score, tier, population, source rank, alias count, country/name/stable key. The published alias map is still filtered from the source `alias_to_stable_key` authority map, and `entries` is empty to avoid regenerating ambiguous aliases.
- HGO runtime preview UI now hides the preview option when Pages lacks HGO runtime assets, while keeping local developer builds available when those assets exist.
- `strip_scenario_publish_audit_urls()` skips vanished startup bundle paths encountered after glob enumeration; downstream URL validation still catches manifest references to missing shipped files.

## Current Result

- `dist/pages-dist-manifest.json` total is `972529969` bytes / `927.48 MiB`.
- `size_gate.status` is `within_limit`; `over_by_bytes` is `0`.
- `dist/app/data/city_aliases.json` is `3619854` bytes, has `entry_count=0`, `alias_count=38198`, and records `stable_key_selection=world_city_capital_tier_population_priority`.
- Representative retained aliases: `Tokyo`, `Shanghai`, `New York`, and `Berlin`.
- Representative ambiguous aliases remain unpublished: `Khanabad`, `Hrazdan`, and `25 de Mayo`.
- Remaining largest payloads are public runtime data: TNO water detail chunk, HOI4 Soviet/Russia political detail chunks, and `world_cities.geojson`.

## Review Status

- Code-review lane returned CLEAR.
- Architect lane returned CLEAR after unpublished data-manifest outputs and embedded runtime registry assets were pruned.

## 2026-06-29 Implementation Evidence

- Pages publish policy now keeps HGO 1936 as developer/local preview metadata while omitting its runtime preview payload from Pages.
- `tools/build_pages_dist.py` removes local-only HGO runtime, HGO scenario runtime, Japan industrial preview GeoJSON, full city aliases, unpublished registry assets, unpublished catalog entries, and unpublished `dist/app/data/manifest.json` outputs.
- `dist/app/data/manifest.json` now rewrites the `city_aliases.json` size/hash/counts to the reduced Pages file and records removed unpublished outputs.
- `js/ui/scenario_controls.js` hides HGO Preview unless runtime assets are present or the preview is already active, with localized unavailable copy.
- Direct verification after the final manifest prune: `size_gate.status=within_limit`, `total_bytes=972529969`, `missingOutputs=[]`, `missingAssets=[]`, `cityHashMatches=true`, and HGO runtime registry keys are absent from Pages.

## 2026-06-29 Review Evidence

- Code-review lane returned CLEAR.
- Architect lane initially blocked on stale HGO outputs in `dist/app/data/manifest.json`.
- The block was fixed by pruning unpublished output keys and embedded runtime registry asset keys; architect re-review returned CLEAR.

## 2026-06-29 Verification

- `npm run verify:pages-dist`: PASS, builder plus 42 Python Pages tests plus 9 landing Node tests.
- `py -3 tools/i18n_audit.py`: PASS, `ui_missing=0`.
- `npm run verify:toolbar-split-boundary`: PASS, 53 tests.
- `npm run verify:architecture-boundaries`: PASS.
- `npm run verify:test-import-graph`: PASS, 49 specs.
- `node --test tests/hgo_raster_renderer.node.test.mjs tests/hgo_runtime_preview.node.test.mjs tests/hgo_runtime_preview_toolbar.node.test.mjs`: PASS, 41 tests.
- `py -3 -m unittest tests.test_scenario_contracts -q`: PASS, 41 tests.
- `py -3 -m unittest tests.test_data_catalog_contract -q`: PASS, 18 tests.
- `py -3 -m unittest tests.test_transport_manifest_contracts -q`: PASS, 18 tests.
- `py -3 -m py_compile tools/build_pages_dist.py tests/test_pages_dist_startup_shell.py tests/test_toolbar_split_boundary_contract.py`: PASS.
- `node --check` passed for touched source and dist JS files.
- Direct manifest probe: PASS, `missingOutputs=[]`, `missingAssets=[]`, `cityHashMatches=true`.
- `git diff --check`: PASS.
