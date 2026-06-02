# Ocean Baltic Sea Source 2026-06-02 Context

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-ocean-baltic-sea-source-20260602`
- Branch: `codex/ocean-baltic-sea-source-20260602`
- Base: `origin/main` at `89a2eeec`.
- Main workspace has unrelated dirty files; this worktree isolates ocean changes.
- Current audit: low_precision=0, source_replacement=3, local_clone=3, high_precision_split=3, simplification_review=3, provenance_gap=0.
- Remaining local clones from provenance: `tno_baltic_sea`, `tno_bosporus_dardanelles`, `tno_south_china_sea`.
- Selected target: `tno_baltic_sea`, because it is a macro sea with existing public Marine Regions child sources and seam tests.
- Live process owner: main agent owns source fetch/build/test commands. Subagents are static review only.

## Completion Context

- Baltic source is now public Marine Regions IHO: `mrgid=2401`, `source_standard=marine_regions_iho_v3`, `source_feature_count=1`.
- Final Baltic geometry: `MultiPolygon`, 36,640 coordinates, area `0.14309068323005686`, bounds `[9.948961607732866, 53.7055200643201, 23.51168835, 59.89722647045214]`.
- Snapshot Baltic geometry: `Polygon`, 12,768 coordinates, tolerance `0.008`, area `31.833061277812057`, bounds `[9.52227815, 52.65351868, 23.51168835, 59.93861675]`.
- Final provenance local clones: `tno_bosporus_dardanelles`, `tno_south_china_sea`.
- Final audit: `low_precision_candidate_count=0`, `source_replacement_candidate_count=2`, `local_clone=2`, `high_precision_split_candidate_count=3`, `simplification_review_candidate_count=4`, `provenance_gap_count=0`.
- `simplification_review_candidate_count` increased because Baltic is now a split parent with many child-boundary cuts; that precision is accepted for the parent-child sea model.
- Generated asset diff scope is limited to `tno_baltic_sea` and `tno_northeast_atlantic_ocean`.
- Largest checked-in generated file after sync is `data/scenarios/tno_1962/derived/marine_regions_named_waters.snapshot.geojson` at 104,346,927 bytes, about 99.51 MiB.
- Final review added `tno_baltic_sea` / `tno_bay_of_bothnia` non-overlap coverage. The direct seam pair was not added because validator measured them as separated by Bothnian Sea.
- Trial `snapshot_simplify_tolerance=0.02` reduced the snapshot by only about 48 KB and opened a Baltic/Bay of Bothnia seam gap in the validator; final tolerance remains `0.008`.
- Validation evidence:
  - `python tools\audit_tno_water_family_refinement.py` passed.
  - `python tools\validate_tno_water_geometries.py --scenario-dir data\scenarios\tno_1962 --report-path .runtime\reports\generated\tno_water_geometry_report.baltic_sea_source.final_review_fixed.json` passed.
  - Targeted pytest set passed after review fix: 8 tests and 189 subtests.
  - `pytest tests/test_tno_water_geometries.py -q` passed after review fix: 34 tests.
  - `git diff --check` passed with line-ending warnings only.
  - Python compile check passed for changed Python/test files.
