# Render Data Chain Split Context

## 2026-06-15 Start

- Created worktree `C:\Users\raede\Desktop\dev\mapcreator-render-data-chain-split-20260615`.
- Branch `codex/render-data-chain-split-20260615` tracks `origin/main`.
- Base commit and HEAD are both `26ae7677b6a49b008b32f0237c407f7260b5bc04`.
- Parent checkout has unrelated dirty `lessons learned.md`; this task writes only in the new worktree.
- Existing registry shows prior 2026-06-14 data-chain/preview deepening already landed. Treat the current plan as a gap-closing pass over current main.
- Live process ownership: main Codex agent owns all tests/builds. Child agents `Newton` and `Averroes` are read-only static inspection lanes.

## Initial Evidence

- Current source already has `map_builder/transport_country_pack_writer.py`.
- Current source already has `js/ui/transport_workbench_point_preview_runtime.js`.
- Current source still has `build_osm_pbf_road_pack` and `build_osm_pbf_rail_pack` in `tools/build_transport_country_real_packs.py`.
- Current source still keeps point preview loader logic inside `js/ui/transport_workbench_point_preview_shared.js`.
- Current source still keeps industrial preview loader logic inside `js/ui/transport_workbench_industrial_zone_preview.js`.

## Running Notes

- Update this file after each implementation and verification phase.

## Workstream B Complete

- Added `map_builder/transport_family_registry.py` with `FamilySpec` / `GpkgLayerGroup` coverage for OSM GPKG road, rail, industrial zones, and logistics hubs.
- Migrated `tools/build_transport_country_real_packs.py` road, rail, industrial, and logistics China/India/Russia entries through the registry driver while preserving `write_pack` -> `write_country_pack`.
- Removed dead OSM PBF road and rail builders plus their private PBF helpers.
- Extended `tests/test_global_transport_builder_contracts.py` with byte-stable China fixture golden checks for `manifest.json`, `build_audit.json`, and layer files.
- Verification passed:
  - `py -m unittest tests.test_global_transport_builder_contracts -q` -> 62 tests OK.
  - `py -m py_compile map_builder/transport_family_registry.py tools/build_transport_country_real_packs.py` -> OK.

## Workstream A Complete

- Split point preview loader state and async loading into `js/ui/transport_workbench_point_preview_loader.js`.
- Split point preview SVG marker and label helpers into `js/ui/transport_workbench_point_preview_dom.js`.
- Kept `createTransportWorkbenchPointPreviewController(definition)` signature stable.
- Split industrial preview loader state and async loading into `js/ui/transport_workbench_industrial_zone_preview_loader.js`.
- Kept industrial polygon/point projection and render selection in `js/ui/transport_workbench_industrial_zone_preview.js`.
- Road and rail already use `js/ui/transport_workbench_line_runtime_shared.js`; extra line loader churn was skipped after static inspection because the current shared runtime already owns loader/runtime behavior.

## Verification Notes

- Passed data gates:
  - `py -m unittest tests.test_global_transport_builder_contracts -q` -> 62 tests OK.
  - `py -m py_compile map_builder/transport_family_registry.py tools/build_transport_country_real_packs.py` -> OK.
- Passed render/static gates:
  - `node --check` on changed source and `dist/app` JS files -> OK.
  - `py -m unittest tests.test_transport_workbench_manifest_runtime_contract -q` -> 20 tests OK.
  - `npm run test:node:transport-workbench-preview-lifecycle-owner` -> 15 tests OK.
  - `npm run test:node:transport-overview-line-contract` -> 25 tests OK.
  - `npm run verify:test-import-graph` -> import graph for 48 specs OK.
- Passed touched-file route gates:
  - `node tools/select_verification_targets.mjs --check` -> 136 routes OK.
  - `py tools/check_transport_workbench_manifests.py --root data/transport_layers --report-path .runtime/reports/generated/transport_workbench_manifest_report.json` -> OK.
- Pages dist:
  - `npm run verify:pages-dist` could not start because the script calls `python`, and this machine exposes Python through `py`.
  - Equivalent commands passed: `py tools/build_pages_dist.py`, `py -m unittest tests.test_pages_dist_startup_shell -q`, and `npm run test:node:landing-showcase-view`.
  - `dist/pages-dist-manifest.json` was regenerated after JS mirror changes.
- Whitespace gate:
  - `git diff --check` -> OK.

## E2E Route Findings

- `node tools/e2e_layering.mjs run-spec tests/e2e/transport_phase_b_main_map_smoke.spec.js` was blocked by pre-existing E2E manifest count drift: the layer tool expects 45 specs and current repo exposes more.
- Direct Playwright run after `npm ci` passed `transport_phase_b_main_map_smoke.spec.js` and `transport_workbench_label_rotation.spec.js`.
- Direct Playwright found two existing data/test expectation mismatches:
  - `transport_workbench_industrial_variants.spec.js` expects 3458 internal features, while runtime projected pack reports 3449. The loader split preserves the old `createIndustrialFeature` path; raw GeoJSON still has 3458 features, so the mismatch is in the existing projection/filter contract or stale expectation.
  - `transport_workbench_port_coverage_tiers.spec.js` loads `usa_port/default` while the spec expects coverage-tier variants. Snapshot shows active variant `default`, matching current manifest state.

## Cleanup / QA Notes

- `ai-slop-cleaner` pass was scoped to changed files.
- Renamed `normalizeNumber(..., fallback)` to `normalizeNumber(..., defaultValue)` in industrial preview source and dist.
- Renamed `slug_id(..., fallback)` to `slug_id(..., default_value)` in the transport builder.
- Remaining fallback-like findings are pre-existing data parsing and audit text boundaries in `tools/build_transport_country_real_packs.py`; they were left in place because changing them would expand scope beyond this table-driving split.
- Static review found that `full_limit` / `preview_limit` were declared in the registry but still implicitly matched function defaults in the driver. Fixed by passing `spec.full_limit` and `spec.preview_limit` from `build_osm_gpkg_registry_pack()`.
- Static review found that `row_builder` looked like a callable driver field while it is currently a contract label. Renamed it to `row_builder_id`.
- Post-review validation passed: `py -m py_compile map_builder/transport_family_registry.py tools/build_transport_country_real_packs.py` and `py -m unittest tests.test_global_transport_builder_contracts -q`.
