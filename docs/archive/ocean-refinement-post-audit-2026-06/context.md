# Ocean Refinement Post-Audit Context

## 2026-06-05 Intake

- User asked for an audit of the latest ocean-refinement changes, fixes for found issues, and an evaluation of build artifact slimming methods and path.
- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-ocean-refinement-post-audit-20260605`
- Branch: `codex/ocean-refinement-post-audit-20260605`
- Base: `origin/main` at `47679440 Merge remaining TNO ocean refinement`
- Main process owns all live validation commands.
- Subagents may do static review and official-source research only.

## Evidence Log

- Official large-file evidence: GitHub warns at 50 MiB, blocks above 100 MiB, and recommends storing generated files outside normal Git when they are programmatically generated.
- Current files above 50 MiB: `derived/marine_regions_named_waters.snapshot.geojson` at 85.91 MiB and `runtime_topology.topo.json` at 61.34 MiB.
- gzip estimates: snapshot 21.61 MiB, runtime topology 16.24 MiB, largest water chunk 2.75 MiB from 29.03 MiB.
- Existing project support: `tools/dev_server.py` can serve JSON-family files with gzip; startup bundles already have `.json.gz` sidecars; Pages dist currently refreshes startup bundle sidecars only.
- Confirmed local issue: parent-child water overlap validation was scoped to two tracked pairs even though all same-table `parent_id` water children have the same no-overlap contract.
- Manual data check: 72 water features carry `parent_id`; 52 parent IDs point to a water feature in the same file; 20 point to external macro-ocean parents. Same-table overlap checks apply to the 52 pairs.

## Fix Log

- Replaced tracked two-pair parent-child overlap validation with automatic same-table parent-child collection.
- Kept external macro-ocean parent references out of geometry overlap checks and recorded their skipped count in the validator report.
- Updated unittest contract to assert the new Fram Strait and Anadyrskiy Zaliv child seams are included without hardcoding the total pair count.
- Integrated architect WATCH feedback: artifact slimming should start with size gates and existing transparent compression; checked-in gzip sidecars for broader runtime outputs require a dedicated artifact contract.
- Integrated final architect WATCH feedback by adding a stable boundary rule for source inputs, regenerated caches, and delivery artifacts.

## Validation Log

- `python -m py_compile tools\validate_tno_water_geometries.py tests\test_tno_water_geometries.py`: passed.
- `python -m unittest tests.test_tno_water_geometries.TnoWaterRecentRefinementContractTest.test_parent_child_water_regions_do_not_overlap -q`: 1 test passed.
- `python tools\validate_tno_water_geometries.py --scenario-dir data\scenarios\tno_1962 --report-path .runtime\reports\generated\ocean_refinement_post_audit_geometry.json`: passed.
- Geometry report: seam failure count 0, parent-child overlap checked count 52, skipped external parent count 20.
- `python tools\audit_tno_water_family_refinement.py`: `backlog_candidate_count=0`, `provenance_gap_count=0`.
- `python -m unittest tests.test_tno_water_geometries.TnoWaterRecentRefinementContractTest -q`: 18 tests passed.
- `git diff --check`: passed with line-ending warnings only.
