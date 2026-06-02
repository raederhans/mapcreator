# Ocean Scotia Source Refinement Plan

## Goal

Continue the ocean refinement program by replacing or refining the next low-precision candidate with public-source-backed geometry.

## Scope

- Target one candidate first: `tno_scotia_sea`.
- Confirm a public source and provenance before changing geometry.
- Keep existing high-detail macro seas available for future child-water splits.
- Synchronize source water, runtime topology, chunks, manifests, startup bundles, and gzip sidecars.
- Avoid UI, unrelated ocean styling, and global tolerance changes in this phase.

## Acceptance

- `tno_scotia_sea` no longer depends on the local/global clone lane when a suitable public source is confirmed.
- Provenance records identify the source standard, query, and feature count.
- `tools/audit_tno_water_family_refinement.py` reports the intended queue improvement.
- `tools/validate_tno_water_geometries.py` passes.
- Targeted water and manifest/hash tests pass.
- Final review finds no blocker.

## Evidence

- Baseline audit: low precision candidates = 1; source replacement candidates = 8; lowest macro = `tno_scotia_sea` with 15 vertices.
- Source selected: Marine Regions SeaVoX `seavox_v19`, `mrgid_sr=24034`, Scotia Sea sub-region.
- Source URL: `https://geo.vliz.be/geoserver/MarineRegions/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=MarineRegions:seavox_v19&CQL_FILTER=mrgid_sr=24034&outputFormat=application/json`
- Source geometry: 4527 vertices; published scenario geometry after tolerance `0.02`: 344 vertices.
- Post-change audit: low precision candidates = 0; source replacement candidates = 7; `marine_regions` sources = 54; `local_clone` sources = 7.

## Validation

- [x] `python -m py_compile tools\validate_tno_water_geometries.py tools\audit_tno_water_family_refinement.py tools\patch_tno_1962_bundle.py tests\test_tno_water_geometries.py`
- [x] `python tools\audit_tno_water_family_refinement.py`
- [x] `python tools\validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime\reports\generated\tno_water_geometry_report.json`
- [x] `uv run --with-requirements requirements.txt --with-requirements requirements-dev.txt pytest tests/test_tno_water_geometries.py -q`
- [x] `uv run --with-requirements requirements.txt --with-requirements requirements-dev.txt pytest tests/test_scenario_chunk_assets.py::ScenarioChunkAssetsTest::test_checked_in_tno_chunk_manifest_byte_sizes_and_hashes_match_files tests/test_tno_water_geometries.py::test_tno_manifest_and_startup_bundles_reflect_current_water_bootstrap -q`
- [x] `git diff --check`

## Steps

- [x] Create isolated worktree and activate ultrawork state.
- [x] Create active docs.
- [x] Confirm Scotia Sea source/provenance.
- [x] Implement the smallest source-backed geometry update.
- [x] Synchronize generated checked-in assets.
- [x] Extend or reuse tests.
- [x] Validate.
- [x] Review.
- [x] Merge into main.
- [ ] Push main and clean up worktree.
