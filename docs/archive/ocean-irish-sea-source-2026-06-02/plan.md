# Ocean Irish Sea Source 2026-06-02 Plan

## Goal

Reduce the remaining TNO ocean local-clone queue by replacing Irish Sea with a public Marine Regions source while keeping child bays/channels, open-ocean clipping, provenance, chunks, manifest, startup bundles, and tests synchronized.

## Acceptance

- `tno_irish_sea` uses a Marine Regions source instead of `tno_cloned_from_global_water_regions`.
- Existing Irish Sea child waters remain covered: North Channel, St George's Channel, St Brides Bay, Cardigan Bay, Liverpool Bay, and Solway Firth.
- Dependent Atlantic open-ocean geometry is synchronized and validated.
- Audit source replacement count decreases without introducing low-precision candidates, provenance gaps, oversized source snapshots, or chunk/runtime drift.
- Validator and targeted tests pass.

## Steps

- [x] Create isolated worktree.
- [x] Verify Marine Regions source candidate.
- [x] Update source spec, phase target list, and tests.
- [x] Synchronize checked-in water/runtime/chunk/startup assets.
- [x] Validate and review.
- [ ] Commit, push, archive, cleanup.

## Evidence

- Selected SeaVoX `mrgid_l3='23731' OR mrgid_l4='23739' OR mrgid_sr='24210' OR mrgid_sr='24214'` because the direct `mrgid_sr='24212'` Irish Sea left a North Channel seam gap.
- Applied `snapshot_simplify_tolerance=0.002`; generated `tno_irish_sea` has 1868 vertices, area about 4.83, and keeps all six child seams closed.
- Added direct Irish Sea to Northeast Atlantic seam and zero-overlap coverage for the linked open-ocean change.
- Synchronized changed water ids are limited to `tno_irish_sea` and `tno_northeast_atlantic_ocean`.
- Audit after synchronization: `source_replacement_candidate_count=3`, `local_clone=3`, `low_precision_candidate_count=0`, `provenance_gap_count=0`.
- Validator passed: `.runtime/reports/generated/tno_water_geometry_report.irish_sea_source.composite.final.json`.
- Tests passed:
  - Irish source plus seam contract: 2 passed.
  - targeted water/source/chunk/spec set: 7 passed, 189 subtests passed.
  - `tests/test_tno_water_geometries.py`: 33 passed, rerun after final seam contract.
- Large file check passed: no file at or above 100 MiB; named-water source snapshot is 99.19 MiB.
