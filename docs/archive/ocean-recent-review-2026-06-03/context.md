# Ocean Recent Review Context

2026-06-03:
- Parent checkout is dirty and behind remote main; this task uses `C:\Users\raede\Desktop\dev\mapcreator-ocean-recent-review-20260603`.
- Worktree starts from `origin/main` at `c91f18cf`.
- Relevant long-term rules from `lessons learned.md`: source-review terminal candidates should leave actionable queues, water-only publish should sync manifest/audit from checked-in water regions, and child water splits need sibling non-overlap plus `water_type` contracts.
- Live tests and builders are owned by the main agent. Subagents are read-only reviewers.

## Findings Log

- Recent ocean commits reviewed: from `e94c6e4b` through `fb33f2c2`, plus
  current `origin/main` at `6c0f4819`.
- Independent reviewer found that `tno_english_channel` and
  `tno_strait_of_dover` were not included in non-overlap/seam coverage.
  Direct measurement confirmed overlap `0.0007657138939417039`.
- `tno_south_china_sea` / `tno_java_sea` remains a non-overlap contract, not a
  seam contract. The measured distance is about `4.252027235681867`, so adding
  it to seam tracking would create a false gap failure.
- The generator fix uses `TNO_FINAL_NAMED_WATER_EXCLUSION_BUFFER_DEGREES =
  0.000002` for final named-water subtraction. Repaired checked-in
  `water_regions.geojson` now reports `tno_english_channel` /
  `tno_strait_of_dover` overlap `0.0`.
- Full `water_state` rebuild is blocked by existing non-water Russian feature
  assignment override ids:
  `RU_RAY_50074027B17781956857402`,
  `RU_RAY_50074027B44442883085225`, and
  `RU_RAY_50074027B5810919802918`.
- Narrow `--changed-domain water` publish succeeded from checked-in water data:
  `water_runtime_from_scenario`, `write_bundle`, and `chunk_assets`.

## Validation

- `python -m unittest tests.test_tno_named_marginal_water_contract.TnoNamedMarginalWaterContractTest tests.test_tno_water_geometries.TnoWaterRecentRefinementContractTest tests.test_tno_bundle_builder tests.test_tno_water_geometries.TnoWaterGeometryDataContractTest -q`
  - `Ran 121 tests in 52.967s`
  - `OK`
- `python tools\validate_tno_water_geometries.py --scenario-dir data\scenarios\tno_1962 --report-path .runtime\reports\generated\ocean_recent_review_geometry_after_wrapper_fix.json`
  - `ok`
- `python tools\audit_tno_water_family_refinement.py`
  - `source_replacement_candidate_count=0`
  - `terminal_public_source_candidate_count=4`
  - `provenance_gap_count=0`
  - `backlog_candidate_count=42`
- `python -m py_compile tools\audit_tno_water_family_refinement.py tools\patch_tno_1962_bundle.py tools\validate_tno_water_geometries.py tests\test_tno_bundle_builder.py tests\test_tno_water_geometries.py tests\test_tno_named_marginal_water_contract.py`
  - pass
- `git diff --check`
  - pass
