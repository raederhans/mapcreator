# Ocean Biscay Source 2026-06-02 Plan

## Goal

Reduce the remaining TNO ocean local-clone queue by replacing Bay of Biscay with a public Marine Regions source while keeping generated water, runtime topology, chunks, manifest, startup bundles, provenance, and tests synchronized.

## Acceptance

- `tno_bay_of_biscay` uses a Marine Regions source, not `tno_cloned_from_global_water_regions`.
- Audit source replacement count decreases without introducing low-precision candidates or provenance gaps.
- Only owned water/runtime/chunk/startup surfaces change.
- Validator and targeted tests pass.

## Steps

- [x] Create isolated worktree.
- [x] Verify Marine Regions source candidate.
- [x] Update source spec and tests.
- [x] Synchronize generated assets.
- [x] Validate changed water contracts.
- [ ] Merge, push, archive, cleanup.

## Progress

- Marine Regions IHO `mrgid=2359` is the Bay of Biscay source.
- The first full bundle-state sync path was stopped after it exceeded the useful wait window before writing files.
- The accepted sync path fetches only the target IHO source, replaces `tno_bay_of_biscay`, and updates the dependent `tno_northeast_atlantic_ocean` geometry.
- Audit after sync: low_precision=0, source_replacement=4, local_clone=4, provenance_gap=0.
- Validation passed:
  - `python tools\validate_tno_water_geometries.py --scenario-dir data\scenarios\tno_1962 --report-path .runtime\reports\generated\tno_water_geometry_report.biscay_source.json`
  - targeted pytest: 6 passed, 189 subtests passed
  - `tests/test_tno_water_geometries.py`: 32 passed
- Push-size fix: Bay of Biscay uses `snapshot_simplify_tolerance=0.004`, keeping `derived/marine_regions_named_waters.snapshot.geojson` at 99.12 MiB.
- Revalidation after size fix passed:
  - `python tools\validate_tno_water_geometries.py --scenario-dir data\scenarios\tno_1962 --report-path .runtime\reports\generated\tno_water_geometry_report.biscay_source.size_fix.json`
  - targeted pytest: 6 passed, 189 subtests passed
  - `tests/test_tno_water_geometries.py`: 32 passed
