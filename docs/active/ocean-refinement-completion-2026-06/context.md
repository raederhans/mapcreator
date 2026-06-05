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

Current audit:
- `terminal_public_source_candidate_count=39`
- `backlog_candidate_count=7`
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

Validation evidence:
- `python -m unittest tests.test_tno_water_geometries.TnoWaterRecentRefinementContractTest -q`: 16 tests OK.
- `python tools\validate_tno_water_geometries.py --scenario-dir data\scenarios\tno_1962 --report-path .runtime\reports\generated\ocean_refinement_completion_geometry.json`: OK.
- `python tools\patch_tno_1962_bundle.py --changed-domain water --checkpoint-dir .runtime\build\scenario\tno_1962\ocean_refinement_completion`: OK, rebuilt 139 water runtime features.
- `python -m py_compile tools\audit_tno_water_family_refinement.py tools\patch_tno_1962_bundle.py tools\validate_tno_water_geometries.py tests\test_tno_water_geometries.py tests\test_tno_named_marginal_water_contract.py`: OK.
- `git diff --check`: OK.

Validation gaps:
- Full water group command exposed two existing bundle-builder failures outside this source-review change: `test_macro_named_seas_keep_validator_probes_without_extra_supplements` and `test_tno_runtime_country_colors_follow_mixed_palette_policy`.
- The water-domain builder rewrote geo-locale/startup derived files; those generated changes were reverted from this task diff after successful builder validation.
