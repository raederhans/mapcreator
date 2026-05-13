# TNO Atlantropa Island/Hole Tail Debug Context

## 2026-05-07

- User reports the previous broad Atlantropa fix mostly worked, but three visible tail issues remain:
  - A sea area southwest of Greece still has wrong color and cannot be selected.
  - Balearic, Crete, and Cyprus island cores show holes where sea is visible.
  - Cyprus left side appears geometrically incomplete.
- Debug strategy:
  - Parent owns browser/runtime probes and tests.
  - Child agents are limited to read-only code/data exploration.
  - Root cause must be confirmed before patching.
- User adds that the same Balearic, Crete, and Cyprus islands look normal in other scenarios.
  This makes the base topology less likely as the root cause and points to the 1962-specific
  Atlantropa overlay/chunk generation path.
- Static chunk diagnostics confirmed the island issue is in 1962 ATLISL output:
  Balearic, Crete, and Cyprus were serialized with large interior rings. D3 renders those
  interiors as sea holes, which matches the visible island cores.
- The generator fix follows the previous Corsica/Sicily-style repair: major island rows are
  converted back into solid polygon exteriors after boolean weld/smoothing, before writing ATLISL
  rows and chunks.
- Follow-up browser/static probes corrected the Greek sea diagnosis:
  `ATLSEA_FILL_*` features are generated as `atl_surface_kind=sea` and
  `atl_geometry_role=sea_completion`, so routing them as `shoal/salt_flat` turned valid sea
  completion polygons brown. They now route as `water/atlantropa_sea`.
- The stubborn southwest Greece point `(20.6, 35.0)` was a true coverage gap between existing
  Libya/Suez and Aegean completion bounds. `ATLSEA_FILL_libya_suez_9` now receives the missing
  Mediterranean template water strip and contains that point as interactive water.
- Cyprus was not just an interior-ring issue: `ATLISL_levant_cyprus` was clipped by the donor
  search AOI and missed the west side of runtime baseline `CY000`. The current asset uses the
  solid `CY000` baseline geometry, and the source config pins a Cyprus `group_bbox` around it.
- Fresh browser evidence for the island tails:
  - `ATLISL_west_med_balearics`: click hit itself as land.
  - `ATLISL_aegean_crete`: click hit itself as land.
  - `ATLISL_levant_cyprus`: west-side fixed geo probe and click hit itself as land.
- Fresh browser evidence for the remaining sea tail:
  - `(20.6, 35.0)` hits `ATLSEA_FILL_libya_suez_9` with `water/atlantropa_sea`.
  - `ATLSEA_FILL_libya_suez_9` appears in the water spatial index and click hit itself as water.
  - `ATLSEA_FILL_aegean_4` also routes as water; adjacent overlap can return another nearby
    `ATLSEA_FILL_aegean_*` water feature, which is acceptable for the visual-color regression.
- Verification:
  - `node --test tests/scenario_chunk_contracts.test.mjs` passed 27/27.
  - `python tools/check_scenario_contracts.py --scenario-dir data/scenarios/tno_1962 --strict` passed.
  - `python -m unittest tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_checked_in_tno_1962_southwest_greece_gap_is_atlantropa_water tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_checked_in_tno_1962_cyprus_rebuilt_island_covers_runtime_baseline_west tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_checked_in_tno_1962_atlsea_runtime_contract_keeps_donor_sea_projectable -q` passed.
  - `python -m unittest tests.test_scenario_chunk_assets.ScenarioChunkAssetsTest.test_scenario_atlantropa_detail_chunks_keep_synthetic_feature_contracts -q` passed.
  - Browser artifact: `.runtime/browser/mcp-artifacts/tno-atlantropa-fixed-geo-probe.json`.
  - `git diff --check` exited 0 with line-ending warnings only.
- Final review found one migration-script gap: `extract_scenario_atlantropa.py` wrote
  `atlantropa_salt_flat` and `atlantropa_shoal` defaults but missed
  `atlantropa_sea`. The script now writes all three runtime style defaults, and a
  focused unittest locks that manifest contract.
- Final verification after the review fix:
  - `python -m unittest tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_extract_scenario_atlantropa_manifest_writes_runtime_style_contract tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_checked_in_tno_1962_southwest_greece_gap_is_atlantropa_water tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_checked_in_tno_1962_cyprus_rebuilt_island_covers_runtime_baseline_west tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_checked_in_tno_1962_atlsea_runtime_contract_keeps_donor_sea_projectable -q` passed.
  - `python tools/check_scenario_contracts.py --scenario-dir data/scenarios/tno_1962 --strict --report-path .runtime/reports/generated/tno_1962.strict_contract_report.json` passed.
  - `node --test tests/scenario_chunk_contracts.test.mjs` passed 27/27.
  - `node .runtime/tmp/tno_atlantropa_fixed_geo_browser_probe.cjs` passed and rewrote
    `.runtime/browser/mcp-artifacts/tno-atlantropa-fixed-geo-probe.json`.
