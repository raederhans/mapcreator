# Context

2026-05-07: Review blockers focus on js/core/map_renderer.js runtime meta seed length guard and tools/extract_scenario_atlantropa.py computed_neighbors migration.

Findings:
- Current TNO startup bundle has 12869 runtime meta featureIds, including 927 ATL ids.
- Startup bootstrap shell has 58 political geometries and empty scenario_atlantropa; all 58 shell ids are contained in runtime meta with a different order.
- A strict length/order check would discard the full seed. The stable contract is id coverage: every shell id must exist in the seed, and the seed may contain later chunk-layer ids.
- extract_scenario_atlantropa.py previously moved ATL geometries without remapping political.computed_neighbors; the fix remaps retained political indices and drops edges to moved ATL geometries.

Verification:
- python -m py_compile tools/extract_scenario_atlantropa.py
- python -m unittest tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_extract_scenario_atlantropa_remaps_political_neighbors_after_split -q
- npm run test:node:scenario-chunk-contracts
- python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962
- git diff --check
