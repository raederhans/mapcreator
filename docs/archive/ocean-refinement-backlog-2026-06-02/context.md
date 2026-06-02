# Ocean Refinement Backlog Context

## Start

- Created isolated worktree from `main` commit `7b4b61c0`.
- Parent checkout has unrelated dirty files; this task stays isolated.
- Skills invoked: `ultragoal`, `ultrawork`.
- Ultragoal artifacts: `.omx/ultragoal/brief.md`, `.omx/ultragoal/goals.json`, `.omx/ultragoal/ledger.jsonl`.
- Ultrawork state: `.omx/state/ultrawork-state.json`.
- Current live process owner: none.

## Initial Evidence

- Existing report script: `tools/audit_tno_water_family_refinement.py`.
- Existing geometry validator: `tools/validate_tno_water_geometries.py`.
- Prior phase found `marine_macro_count=61`, `marine_macro_with_children_count=12`, `marine_macro_without_children_count=49`, `low_precision_candidate_count=5`.
- Prior phase validator passed with zero ocean macro overlap and no Arctic sync failures.

## Subagent Lanes

- Data/source/provenance mapper: read-only.
- Tests/UI/validator mapper: read-only.

## Working Decision

- This phase prioritizes audit/backlog precision and source consistency.
- Geometry changes require better public/source-backed replacement evidence than the checked-in data.
- High vertex count is not automatically a problem. If a macro sea still needs child waters, high detail is treated as split evidence rather than simplification evidence.

## Mapping Evidence

- Data/source/provenance mapper confirmed the safe extension point is the audit/provenance/report layer.
- `tools/patch_tno_1962_bundle.py` donor and Atlantropa paths stay read-only in this phase.
- Tests/UI mapper confirmed `tests/test_tno_water_geometries.py` is the smallest stable test surface for the audit schema.

## Audit v1 Results

- `marine_macro_count=61`
- `marine_macro_with_children_count=12`
- `marine_macro_without_children_count=49`
- `low_precision_candidate_count=2`
- `source_replacement_candidate_count=9`
- `high_precision_split_candidate_count=4`
- `simplification_review_candidate_count=2`
- `provenance_gap_count=0`
- `backlog_candidate_count=49`
- `source_summary={"marine_regions": 53, "local_clone": 8}`
- `precision_summary={"standard": 52, "high_review": 7, "low": 2}`
- Lowest vertex macro remains `tno_scotia_sea` with `vertex_count=15`.

## Current Queue Interpretation

- Source-backed replacement/refinement candidates now cover all local clone families and truly low-precision families, including clone families that already have child waters.
- First macro-only source-backed candidates remain `tno_scotia_sea`, `tno_north_channel`, `tno_bosporus_dardanelles`, `tno_bay_of_biscay`, `tno_weddell_sea`.
- High-precision split candidates: `tno_norwegian_sea`, `tno_hudson_bay`, `tno_caribbean_sea`, `tno_philippine_sea`.
- Simplification review is only a performance-triggered observation queue: `tno_coral_sea`, `tno_east_china_sea`.

## Verification

- `python -m py_compile tools\audit_tno_water_family_refinement.py tests\test_tno_water_geometries.py`
- Direct call of audit fixture tests: low-precision candidates and high-precision split/review candidates.
- `python tools\audit_tno_water_family_refinement.py`
- `python tools\validate_tno_water_geometries.py --report-path .runtime\reports\generated\ocean-backlog-tno-water-geometry.json`
- Validator summary: `ok=true`, `ocean_pairwise_overlap_count=0`, `macro_land_suspicious_count=0`, `source_only=[]`, `runtime_only=[]`, `chunk_missing=[]`.
- `git diff --check`

## Review Notes

- Architect subagent result: `CLEAR`.
- Code-reviewer requested field precision cleanup: `low_precision_candidates` now contains only `precision_band="low"`.
- Added `source_replacement_candidates` for all local clone or low-precision water families.
- Fixture tests now lock the separation between low precision and standard-precision local clone candidates, including local clone families that already have child waters.

## Geometry Decision

- No geometry coordinates were changed in this phase.
- Current validator output does not justify coordinate replacement.
- The next geometry phase should start from `backlog_candidates`, with public/source-backed replacement evidence before editing `water_regions.geojson`.
