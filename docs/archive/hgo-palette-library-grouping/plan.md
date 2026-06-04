# HGO Palette Library Grouping

## Goal

Make the large HGO color library readable by grouping entries by broad geography and folding alternate color sources under one country row.

## Acceptance

- HGO palette entries expose a stable broad region field when the import source can infer it.
- The palette library panel groups large country palettes by those broad regions.
- A country row shows one primary color and folds map/UI/country-file color variants under the row.
- Existing mapped/dynamic/recent palette behavior remains usable.
- Targeted tests and `verify:pages-dist` pass.

## Tasks

- [x] Inspect palette import and panel rendering contracts.
- [x] Add palette region metadata during import.
- [x] Update panel grouping and row variant rendering.
- [x] Add focused tests for region metadata and manual region override behavior.
- [x] Rebuild affected palette assets and dist output.
- [x] Verify with targeted tests, dist check, and a minimal DOM/static check.
