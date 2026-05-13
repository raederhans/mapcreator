# Ocean Refinement repair-first context

## 2026-05-13 repair-first cutover

- Active execution source is the user-provided `TNO 1962 海洋细化 repair-first 执行计划` from the current thread.
- Previous Phase 2-5 bulk ocean refinement work is background context. Current priority is owners / ATL id / D3 orientation / checkpoint hard-fail / validator blind spots.
- Cutover git status was `main...origin/main [ahead 1]`; pre-existing dirty `.omx/metrics.json` was preserved.
- Live owner: main thread owned generator, checkpoint builder, pytest, node tests, E2E, perf, and browser.
- Subagent boundary: static analysis, test design, architecture review, completed-log reading, and review checklist only. No subagent started, polled, retried, stopped, or interpreted a live process.

## Completed repair decisions

- Rebuilt water-domain feature maps from validated checkpoint runtime/topology ids and audited owners/cores/countries consistency.
- Removed inline split/clip D3 reverse path; source orientation now flows through `orient_source_water_features_for_d3()`.
- Kept final publish checkpoint validation strict for `build_snapshot.json` and `detail_chunks.manifest.json`; pre-chunk validation has an explicit tested carve-out for build snapshot timing.
- Promoted contract checker and water validator helpers to public APIs.
- Changed safe repair second pass to idempotence checking and avoided duplicate chunk rebuild after water changed-domain chunks are built.
- Restored scenario ocean style baseline correctly after scenario apply commit and made TNO ocean defaults flat to keep bathymetry out of startup/perf gates.
- Fixed water/river E2E helper state ownership so synthetic river subsets wait for context resolver settling and keep renderer metrics scoped to the injected subset.

## Verification evidence

- `python -m py_compile tools/patch_tno_1962_bundle.py tools/check_scenario_contracts.py tools/validate_tno_water_geometries.py tools/dev_server.py tests/test_tno_bundle_builder.py tests/test_tno_water_geometries.py tests/test_tno_water_owners_consistency.py tests/test_scenario_presentation_runtime_boundary_contract.py` passed.
- `python -m unittest tests.test_scenario_presentation_runtime_boundary_contract tests.test_scenario_resources_boundary_contract tests.test_startup_shell -q` passed: 21 tests.
- `npm run test:node:scenario-lifecycle-runtime-behavior` passed: 6 tests.
- `npm run test:node:scenario-chunk-contracts` passed: 28 tests.
- `npm run test:node:startup-hydration-behavior` passed: 9 tests.
- `npm run test:py:tno-water-repair-contracts` passed: 7 tests.
- `npm run verify:scenario-contracts:strict` passed: `[scenario-contract] OK tno_1962`.
- `python tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_water_geometry_report.json` passed.
- `npm run test:e2e:water-rendering` passed: 12 tests, log `.runtime/tests/playwright/water-rendering-full.log`.
- `npm run test:e2e:tno-contracts` passed: 2 tests, `bathymetryRequests: []`, screenshot `.runtime/browser/mcp-artifacts/screenshots/tno_1962_ui_smoke.png`.
- `npm run perf:gate` passed against `docs\perf\baseline_2026-04-20.json`, log `.runtime/tests/playwright/perf-gate-final.log`.

## Residual notes

- `.omx/metrics.json` remains a pre-existing dirty runtime file.
- `ATLPRV_18252` and `ATLPRV_18164` remain ATL-owned land features because their published attributes mark them as Atlantropa land/causeway surfaces; owner rebuild preserves explicit source authority.
- Full `tools/atlantropa/` module split remains a future task by scope.
