# Ocean Refinement execution plan

Source plan: `.omx/plans/ralplan-ocean-refinement-20260512T171900Z.md`
Context snapshot: `.omx/context/ocean-refinement-exec-20260512T175725Z.md`

## Acceptance criteria

- Phase 0 audit and routing preview are recorded under `.runtime/reports/generated/`.
- Phase 1 guardrails cover validator report signals, static water runtime contracts, and routing surfaces.
- Phase 2-5 target ids are present in specs/generated `water_regions.geojson`, runtime `scenario_water`, and relevant water chunks.
- `manifest.water_regions_mode` remains `exclusive`.
- The `water` rebuild plan includes `chunk_assets`, so water regions, runtime topology, bootstrap topology, startup bundles, manifest, and water chunks are one transaction.
- Required per-batch gates pass:
  - `python -m pytest tests/test_tno_water_geometries.py -q`
  - `python tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_water_geometry_report.json`
  - `npm run verify:scenario-contracts:strict`
  - `npm run test:node:scenario-chunk-contracts`
  - `python -m unittest tests.test_scenario_chunk_assets tests.test_tno_bundle_builder tests.test_scenario_chunk_refresh_contracts -q`
- After data/contract gates, run `npm run test:e2e:water-rendering` and `npm run test:e2e:tno-contracts`.
- Release gate: `npm run perf:gate`.
- Architect/reviewer sign-off and changed-file deslop pass complete.

## Execution checklist

- [x] Phase 0 baseline audit captured.
- [x] Routing preview captured.
- [ ] Phase 1 contract-first guardrail batch.
- [ ] Phase 2 Arctic batch transaction.
- [ ] Phase 3 Southern / antimeridian batch transaction.
- [ ] Phase 4 East / West Pacific batch transaction.
- [ ] Phase 5 Indian Ocean / Oceania batch transaction.
- [ ] Phase 6 release verification.
- [ ] Final review, deslop, post-deslop verification, lessons learned.
