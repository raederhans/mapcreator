# TNO Atlantropa Browser Debug Task

## Checklist

- [x] Skills loaded: browser-debugger, systematic-debugging.
- [x] Lessons reviewed for Atlantropa and browser hit-testing pitfalls.
- [x] Static subagents deployed.
- [x] Browser reproduction captured.
- [x] Root cause confirmed.
- [x] Fix implemented.
- [x] Browser verification captured.
- [x] Targeted tests run.

## Verification

- `node --test tests/scenario_chunk_contracts.test.mjs` -> 26 passed.
- `python -m unittest tests.test_scenario_chunk_assets.ScenarioChunkAssetsTest tests.test_tno_bundle_builder.TnoBundleBuilderTest` -> 79 passed.
- `python tools/check_scenario_contracts.py --scenario-dir data/scenarios/tno_1962 --strict` -> OK.
- `.runtime/tmp/tno_atlantropa_browser_probe.cjs` -> browser probe output shows `targetCount=12`, `mismatchedClickCount=0`, no missing/unmatched prefixes, 927 scenario_atlantropa features, 840 land ATL spatial items, and 87 water ATL spatial items.
