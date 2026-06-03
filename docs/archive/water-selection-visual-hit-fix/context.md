# Context

## 2026-06-03
- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-water-selection-fix`
- Branch: `codex/fix-water-selection-20260603`
- Main checkout has unrelated `.omx/metrics.json` dirt and is left untouched.
- Main thread owns all live tests and browser processes. Subagents may only do static lookup/review unless reassigned.

## Findings
- `data/scenarios/tno_1962/water_regions.geojson` and the generated `water.*.json` chunks still contain `congo_lake`, Great Lakes lake ids, and ocean macro ids with stable metadata.
- `scenario_atlantropa.*.json` chunks still contain `ATLSEA_*` water features with `atl_render_layer=water` and `atl_interactive=true`.
- The regression is runtime policy: new/default/imported state set `allowOpenOceanSelect=false`, `allowOpenOceanPaint=false`, and `showOpenOceanRegions=false`, so normal ocean features fail the render and hit-selection gate by default.
- `syncScenarioSecondaryRegionIndexes` only treated `water` as a water change. The main chunk promotion path adds `water` for `scenario_atlantropa`, but the direct secondary sync function now also recognizes `scenario_atlantropa` as a water-impacting layer.
- The checked-in TNO source water file had drifted from the source-backed named-water snapshot for existing named waters and was missing 10 named waters, including `tno_hudson_strait`. The runtime topology and chunk files then stayed behind the source surface.

## Changes
- Centralized open-ocean visibility normalization in `js/core/state/ui_state.js`.
- Reused that normalization from project export/import in `js/core/file_manager.js`.
- Extended `syncScenarioSecondaryRegionIndexes` in `js/core/map_renderer.js` so direct `scenario_atlantropa` changes refresh water secondary indexes.
- Added regression coverage in runtime state, project roundtrip, and chunk contract tests.
- Replaced stale named-water source geometries with source-backed snapshot geometries, applied named-water supplements, final exclusions, Baltic land-mask clipping, and open-ocean clipping.
- Rebuilt TNO water runtime topology and water chunks from the checked-in source surface.
- Raised the Pages dist size budget to 1050 MiB for the already-allowlisted TNO runtime water payload.

## Review Notes
- Reviewer found unrelated locale text drift from the first generated pass.
- Restored `geo_locale_patch.*` and `locales.startup.json`, then rebuilt startup bundles from the restored locale inputs so startup hashes match the new water runtime and chunk outputs.
- `dist/pages-dist-manifest.json` still records wider `dist/app/data/` size changes because that ignored deploy data directory is rebuilt by `verify:pages-dist`; the tracked source/code diff remains scoped to TNO water data, water chunks, JS water selection behavior, tests, and the Pages size budget.

## Validation
- `node --test tests/renderer_runtime_state_behavior.test.mjs`
- `node --test tests/file_manager_project_roundtrip_behavior.test.mjs`
- `node --test tests/scenario_chunk_contracts.test.mjs`
- `python tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/water_selection_visual_hit_fix_geometry_final.json`
- `python -m unittest tests.test_tno_named_marginal_water_contract -q`
- `python -m unittest tests.test_tno_water_geometries -q`
- `npm run -s verify:scenario-contracts:strict`
- `npm run -s verify:pages-dist`
- `git diff --check`
