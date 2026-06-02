# Ocean Source Refinement Context

## Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-ocean-source-refinement-20260602`
- Branch: `codex/ocean-source-refinement-20260602`
- Base commit: `e94c6e4b`
- Parent checkout has unrelated dirty files; this task stays isolated.
- Skills invoked: `ultragoal`, `ultrawork`.
- Current live process owner: main agent only.

## Baseline Audit

`python tools\audit_tno_water_family_refinement.py` reports:

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
- Lowest vertex macro: `tno_scotia_sea`, `vertex_count=15`.

## Working Constraints

- High precision is acceptable for macro seas that still need child waters.
- Geometry edits require source-backed evidence and provenance update.
- Data contributions under `data/` must keep owner/catalog expectations in mind.
- Long tests and build processes have a single owner: main agent.

## Subagent Lanes

- Data/source mapper: read-only, mapping geometry/provenance/generation chain.
- Test mapper: read-only, mapping minimal validation surface.

## Candidate Decision

- Selected `tno_north_channel` for the first geometry refinement.
- It already has Marine Regions provenance: `source_layer=seavox_v19`, `source_query=mrgid_l4='23739'`, `source_feature_count=2`.
- Current published geometry had 85 vertices while the stored Marine Regions snapshot has 1536 source vertices.
- Changed `tno_north_channel` `simplify_tolerance` from `0.01` to `0.004`, matching the nearby UK/Ireland detail-water tolerance.
- Single-feature calculation after the parameter change produced 135 vertices, enough to leave the low-precision queue.
- Kept `tno_scotia_sea` queued because it is still a global Natural Earth clone and lacks a confirmed Marine Regions query in the checked-in provenance.

## Live Process Ownership

- Main agent owns validation and merge/push commands.

## Implementation

- Updated `tno_north_channel` in `TNO_NAMED_MARGINAL_WATER_SPECS`.
- The only source parameter change is `simplify_tolerance: 0.01 -> 0.004`.
- Synchronized checked-in source water, runtime topology, water chunks, and startup bundle topology hash.
- Added a targeted test that locks the Marine Regions source standard and minimum polygon vertex count.
- Full water-domain patch script was blocked by the unavailable HGO donor root in this worktree, so the data sync used the checked-in Marine Regions snapshot and existing script helpers for topology/chunk serialization.

## Validation

- `python -m py_compile tools\validate_tno_water_geometries.py tools\audit_tno_water_family_refinement.py tools\patch_tno_1962_bundle.py tests\test_tno_water_geometries.py` passed.
- `python tools\audit_tno_water_family_refinement.py` passed with `low_precision_candidate_count=1`, `source_replacement_candidate_count=8`, `provenance_gap_count=0`.
- `python tools\validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime\reports\generated\tno_water_geometry_report.json` passed.
- `uv run --with-requirements requirements.txt --with-requirements requirements-dev.txt pytest tests/test_tno_water_geometries.py -q` passed: 27 tests.
- `$env:PYTHONPATH=(Get-Location).Path; uv run --with-requirements requirements.txt --with-requirements requirements-dev.txt pytest tests/test_scenario_chunk_assets.py::ScenarioChunkAssetsTest::test_checked_in_tno_chunk_manifest_byte_sizes_and_hashes_match_files -q` passed: 1 test, 189 subtests.
- `git diff --check` passed.

## Review Fix

- Code review found stale `detail_chunks.manifest.json`, stale `manifest.json` source hashes, and stale `startup.bundle.*.json.gz` sidecars.
- Fixed by synchronizing the changed water chunk manifest entries, manifest source hashes, startup bundle source hashes, and gzip sidecars.
- Added test coverage for manifest source runtime/detail-manifest hashes and gzip sidecar source parity.
- Architecture review confirmed the phase boundary: one source-backed candidate, no global sweep, and high-detail macro seas kept for child-water splits.

## Post-Merge Fix

- Main checkout exposed a Windows line-ending hash mismatch for `water.detail.r1c1.json`.
- Added exact `.gitattributes` rules for the changed TNO water JSON files and startup gzip sidecars.
- Recomputed `detail_chunks.manifest.json`, `manifest.json`, startup bundle source hashes, and gzip sidecars after the LF contract was in place.

## Remaining Ocean Queue

- `tno_scotia_sea` is now the only low-precision macro sea in the audit output.
- `tno_scotia_sea` remains queued for a confirmed public source query because current checked-in provenance marks it as a Natural Earth/global-water clone.
- High-detail macro seas remain split candidates; their precision is kept for future child-water work.
