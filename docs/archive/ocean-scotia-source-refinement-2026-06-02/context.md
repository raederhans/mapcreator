# Ocean Scotia Source Refinement Context

## Current Result

`tno_scotia_sea` was the only low-precision macro sea in the latest audit. It now uses Marine Regions SeaVoX source geometry instead of the local/global clone lane.

## Source Decision

- Chosen source: Marine Regions SeaVoX `seavox_v19`.
- Query: `mrgid_sr=24034`.
- Detail page: `https://www.marineregions.org/gazetteer.php?id=24034&p=details`.
- WFS endpoint: `https://geo.vliz.be/geoserver/MarineRegions/wfs`.
- Source vertices: 4527.
- Scenario vertices after `simplify_tolerance=0.02`: 344.

The coarser Marine Regions `MRGID 4329` record was kept as name/range context during research. The scenario geometry uses the SeaVoX sub-region record because it is the boundary source with stable `mrgid_sr` provenance.

## Changed Surface

- `tools/patch_tno_1962_bundle.py`: Scotia spec now pulls SeaVoX `mrgid_sr=24034`, excludes the old global base, and uses tolerance `0.02`.
- `data/scenarios/tno_1962/derived/marine_regions_named_waters.snapshot.geojson`: raw Scotia source snapshot added.
- `data/scenarios/tno_1962/water_regions.provenance.json` and derived provenance: Scotia moved from local clone extract to source-backed water extract.
- `data/scenarios/tno_1962/water_regions.geojson`, runtime topology, water chunks, manifests, startup bundles, and gzip sidecars were synchronized.
- `tests/test_tno_water_geometries.py` and `tools/validate_tno_water_geometries.py`: Scotia probe point updated to the SeaVoX boundary and a source-backed precision regression was added.

## Validation Notes

- Post-change audit reports low precision candidates = 0 and source replacement candidates = 7.
- Full `tests/test_tno_water_geometries.py` passed: 28 tests.
- Manifest/hash targeted tests passed: 2 tests and 189 subtests.
- Geometry validator passed and wrote `.runtime/reports/generated/tno_water_geometry_report.json`.
- `git diff --check` passed with line-ending warnings for existing Windows checkout behavior.

## Remaining Ocean Queue

- 7 source replacement candidates remain in the local clone lane.
- 4 high-precision macro seas remain better suited to child-water splits.
- 2 simplification review candidates remain for possible tolerance adjustment after split planning.

## Closeout

- Branch commit: `dd3bc99d` (`Refine Scotia Sea from Marine Regions SeaVoX geometry`).
- Merged into main after confirming the new main commits touched transport/dist/catalog surfaces and did not overlap this ocean data change.
- Final external actions after this archive update: push main, deactivate ultrawork state, remove the temporary worktree.
