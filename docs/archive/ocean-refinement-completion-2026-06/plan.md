# Ocean Refinement Completion 2026-06 Plan

## Goal

Finish the TNO 1962 ocean refinement program in risk-first batches. A water group is complete when it has source-backed child detail, or a recorded terminal public-source review proves that no reliable public polygon/line source is available.

## Current result

- `marine_macro_count=61`
- `marine_macro_with_children_count=17`
- `marine_macro_without_children_count=44`
- `source_replacement_candidate_count=0`
- `high_precision_split_candidate_count=0`
- `terminal_public_source_candidate_count=44`
- `backlog_candidate_count=0`
- `provenance_gap_count=0`

The remaining actionable backlog is empty after resolving Makassar Strait, Ross Sea, Arafura Sea, Timor Sea, Java Sea, Greenland Sea, and Bering Sea.

## Batch order

- [x] Batch 0: repair `terminal_public_source` audit classification and tests.
- [x] Batch 1: review high-risk split candidates: Gulf of Mexico, Beaufort Sea, Labrador Sea.
- [x] Batch 2: batch-review unique SeaVoX `sub_region` candidates with zero child references.
- [x] Batch 3: resolve the remaining seven hierarchy-mixed or alias-missing seas.
  - Add source-backed child geometry where Marine Regions/SeaVoX exposes lower-level polygons.
  - Record terminal public-source reviews where the upstream record has no further child polygon references.
  - Exit all seven items from the actionable backlog.

## Validation gates

- [x] Run `python tools\audit_tno_water_family_refinement.py`.
- [x] Run targeted water-family unittest.
- [x] Run `python tools\validate_tno_water_geometries.py --scenario-dir data\scenarios\tno_1962 --report-path .runtime\reports\generated\ocean_refinement_remaining_geometry.json`.
- [x] Run `python tools\patch_tno_1962_bundle.py --changed-domain water --checkpoint-dir .runtime\build\scenario\tno_1962\ocean_refinement_remaining_runtime_rerun`.
- [x] Run `python -m unittest tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_tno_remaining_ocean_backlog_source_specs_keep_child_seams_closed tests.test_tno_bundle_builder.TnoBundleBuilderTest.test_named_water_specs_include_regression_probe_supplements -q`.
- [x] Run `git diff --check`.

## Operating notes

- Main thread owns live test and builder processes.
- Public-source terminal reviews are completion states, not failures.
- Do not create geometry from point records, broad neighboring polygons, or EEZ intersections.
- Record every source query and source record id in provenance.
