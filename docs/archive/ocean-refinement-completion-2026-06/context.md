# Ocean Refinement Completion 2026-06 Context

2026-06-05:
- Worktree created at `C:\Users\raede\Desktop\dev\mapcreator-ocean-refinement-completion-20260605`.
- Branch: `codex/ocean-refinement-completion-20260605`.
- Parent checkout has unrelated dirty render-chain docs and `.omx/metrics.json`; this task stays isolated.
- Lessons loaded. Relevant rules: source-review terminal candidates leave actionable queues; water-only publish syncs manifest/audit from checked-in water regions; water refinements require source, runtime, chunk, seam, and geometry verification.
- Live process owner: main thread only. Logs and generated reports stay under `.runtime/`.

## Baseline audit

Command:
`python tools\audit_tno_water_family_refinement.py`

Result:
- `marine_macro_count=61`
- `marine_macro_with_children_count=15`
- `marine_macro_without_children_count=46`
- `terminal_public_source_candidate_count=2`
- `backlog_candidate_count=44`
- `source_replacement_candidate_count=0`
- `provenance_gap_count=0`

Finding:
- `water_refinement_source_reviews.json` has four `terminal_public_source` records. Caribbean Sea and Philippine Sea are still classified as actionable child-detail backlog. Batch 0 repairs this contract.

## Implemented refinement state

Batch 0:
- `terminal_public_source` records now exit backlog, high precision split, and source replacement queues.
- Regression coverage uses real `water_regions.geojson`, published provenance, and `water_refinement_source_reviews.json`.

Batch 1:
- Gulf of Mexico, Beaufort Sea, and Labrador Sea were queried against Marine Regions IHO and SeaVoX.
- Each has a single public macro record and zero SeaVoX child references, so each is recorded as `terminal_public_source`.

Batch 2:
- All remaining unique SeaVoX `sub_region` candidates with zero `mrgid_l1` to `mrgid_l4` child references were recorded as terminal public-source reviews.
- The 2026-06-05 batch stores `terminal_reason=no_public_child_polygon_source`, `child_result_count=0`, and `matched_record_ids`.

Pre-Batch 3 audit:
- `terminal_public_source_candidate_count=39`
- The pre-Batch 3 actionable backlog listed seven remaining items.
- `high_precision_split_candidate_count=0`
- `source_replacement_candidate_count=0`
- `provenance_gap_count=0`

Remaining backlog:
- `tno_makassar_strait`: exact SeaVoX name query returned zero records.
- `tno_java_sea`: exact SeaVoX name query returned zero records.
- `tno_ross_sea`: SeaVoX has both parent-level and sub_region Ross Sea rows.
- `tno_arafura_sea`: SeaVoX has Arafura Sea as parent level and sub_region rows.
- `tno_timor_sea`: SeaVoX has Timor Sea as parent level and sub_region rows.
- `tno_greenland_sea`: SeaVoX has Greenland Sea as parent level and sub_region rows.
- `tno_bering_sea`: SeaVoX has Bering Sea as level_3 and sub_region rows.

## Batch 3 execution

Worktree:
- `C:\Users\raede\Desktop\dev\mapcreator-ocean-refinement-remaining-20260605`
- Branch: `codex/ocean-refinement-remaining-20260605`
- Base: local `main` at `bc7c9b4a`, which is ahead of `origin/main` by the render-chain repair commits.

Live process owner:
- Main thread owns audit, builder, validators, and test commands.
- Subagents are limited to static repository mapping and official-source research.

Evidence gathered:
- Local WFS evidence report: `.runtime/reports/generated/ocean_remaining_source_evidence.json`.
- Marine Regions/SeaVoX child-reference checks show two source-backed child polygons that intersect the current implemented parent geometry:
  - `tno_greenland_sea` -> `FRAM STRAIT`, `mrgid_sr='26579'`.
  - `tno_bering_sea` -> `ANADYRSKIY ZALIV`, `mrgid_sr='24121'`.
- Five remaining records have official geometry and no additional unmodeled child polygon reference in the current source evidence:
  - `tno_makassar_strait`: implementation source `mrgid_sr='24135'` is SeaVoX `SELAT MAKASAR`; child-reference count is 0.
  - `tno_java_sea`: implementation source `mrgid_sr='24130'` is SeaVoX `JAWA SEA`; child-reference count is 0.
  - `tno_arafura_sea`: implementation source `mrgid_sr='24065'`; parent-level child list contains only self plus Gulf of Carpentaria, which is already a separate named water and is subtracted from Arafura.
  - `tno_timor_sea`: broader level 1 source includes Joseph Bonaparte Gulf, but that polygon does not intersect the current implemented Timor Sea geometry.
  - `tno_ross_sea`: broader level 1 source includes McMurdo Sound, but that polygon does not intersect the current implemented Ross Sea geometry.

Implementation target:
- Add two `marine_detail` specs and subtract them from their parent sea specs.
- Add five terminal public-source review records.
- Update tests so the expected backlog becomes empty after checked-in water data is rebuilt.

Validation evidence:
- `python tools\audit_tno_water_family_refinement.py`: `terminal_public_source_candidate_count=44`, `backlog_candidate_count=0`.
- `python tools\patch_tno_1962_bundle.py --changed-domain water --checkpoint-dir .runtime\build\scenario\tno_1962\ocean_refinement_remaining_runtime_rerun`: OK, rebuilt 141 water runtime features and chunk assets.
- `python tools\validate_tno_water_geometries.py --scenario-dir data\scenarios\tno_1962 --report-path .runtime\reports\generated\ocean_refinement_remaining_geometry.json`: OK, all check failure counts 0.
- `python -m unittest tests.test_tno_water_geometries.TnoWaterRecentRefinementContractTest -q`: 18 tests OK.
- `python -m unittest tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_tno_remaining_ocean_backlog_source_specs_keep_child_seams_closed tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_named_water_specs_include_regression_probe_supplements -q`: 2 tests OK.
- `python -m py_compile tools\patch_tno_1962_bundle.py tools\validate_tno_water_geometries.py tests\test_tno_water_geometries.py tests\test_tno_bundle_builder.py`: OK.
- `python -m json.tool data\scenarios\tno_1962\water_refinement_source_reviews.json > $null`: OK.
- `git diff --check`: OK, with Windows LF-to-CRLF warnings only.

Validation gaps:
- Full all-stage rebuild still requires local HGO donor input. The water changed-domain builder was used as the bounded publish path for this task.
- The water-domain builder applied safe startup/manifest/audit syncs. Structured diff inspection confirmed checked-in water changed from 139 to 141 and added only `tno_anadyrskiy_zaliv` plus `tno_fram_strait`.

Closeout:
- Static code review raised two contract gaps. Both were fixed: parent/child seam pairs now assert no overlap, and Timor/Ross rejected broader child candidates are stored in structured `rejected_child_candidates`.
