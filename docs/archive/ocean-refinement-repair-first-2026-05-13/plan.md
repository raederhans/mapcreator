# Ocean Refinement repair-first execution plan

Source intent: user-provided repair-first plan in current thread.
Previous plan: `.omx/plans/ralplan-ocean-refinement-20260512T171900Z.md` remains historical context.

## Acceptance criteria

- [x] `docs/active/ocean-refinement/{plan,context,task}.md` reflect repair-first ownership and progress.
- [x] Water-domain rebuild derives `countries.json`, `owners.by_feature.json`, and `cores.by_feature.json` from final validated checkpoint runtime/topology/water/ATL ids.
- [x] D3 orientation has one owner: `orient_source_water_features_for_d3()`.
- [x] Final external checkpoint validation keeps missing `build_snapshot.json` and `detail_chunks.manifest.json` as hard failures; pre-chunk validation keeps the explicit build-snapshot carve-out covered by test.
- [x] `tools/check_scenario_contracts.py` exposes `apply_safe_scenario_contract_repairs()` as public API.
- [x] `tools/validate_tno_water_geometries.py` exposes `collect_d3_spherical_metrics()` as public API.
- [x] C6 scope stayed limited to ATL prefix / classify / decorate / `cntr_code` consistency.
- [x] Cheap/static gates passed before E2E/perf gates.

## Execution checklist

- [x] Wave 0: switch active docs to repair-first plan and record owner rules.
- [x] Wave 1: add red-light tests for owners rebuild, D3 orientation invariant, checkpoint hard-fail, ATL/id parity.
- [x] Wave 2: implement owners rebuild, orientation single-stage, checkpoint hard-fail, public API imports, idempotence check.
- [x] Wave 3: remove dead helper, add decision comments and named-water exclusion diagnostics.
- [x] Wave 4: extend validator/startup/runtime coverage within current scope.
- [x] Verification: cheap/static, strict contract, validator, water E2E, TNO E2E, perf gate all passed.
- [x] Final review: read-only subagent review plus main-thread review-查 bug-第一性原理自检; actionable findings fixed.

## Main-thread live ownership

Main thread owned generator/checkpoint attempts, pytest, node tests, E2E, perf, and browser. Subagents only read repo files and completed logs/reports. The full changed-domain generator attempt was stopped after it exceeded the useful repair-first path; final data sync used targeted safe repair and verified strict/validator/E2E/perf gates.
