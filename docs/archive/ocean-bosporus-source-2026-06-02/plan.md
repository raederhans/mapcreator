# Ocean Bosporus Source 2026-06-02 Plan

## Goal

Replace `tno_bosporus_dardanelles` with a public Marine Regions source while preserving chokepoint geometry, provenance, chunks, manifests, startup bundles, and audit counts.

## Acceptance

- `tno_bosporus_dardanelles` no longer appears in `local_clone_extracts`.
- The selected public source preserves the Bosporus-Dardanelles chokepoint position and size.
- Generated water changes stay limited to the target and any directly linked neighbor subtraction that can be explained.
- Audit source replacement count decreases without low-precision candidates or provenance gaps.
- Geometry validator, targeted source tests, chunk manifest checks, and `git diff --check` pass.

## Steps

- [x] Create isolated worktree.
- [x] Verify public source candidate.
- [x] Defer source replacement because no polygon or line source candidate is available in current Marine Regions WFS layers.
- [ ] Commit, push, archive, cleanup.

## Decision

`tno_bosporus_dardanelles` should stay on the current clone for now. Marine Regions Gazetteer has `Dardanelles` (`mrgid=3721`) and `Bosporus` (`mrgid=3725`) as `Strait` records, but those records expose point coordinates through the Gazetteer details page. The checked WFS geometry layers did not return matching polygon or line features for those MRGIDs.

Checked layers:

- `MarineRegions:seavox_v19`
- `MarineRegions:iho`
- `MarineRegions:gazetteer_polygon`
- `MarineRegions:gazetteer_line`
- `MarineRegions:world_bay_gulf`
- `MarineRegions:goas`
- `MarineRegions:eez_iho`

The available polygon results in the target bbox are broader seas or regions: Aegean Sea, Sea of Marmara, Black Sea, Mediterranean Region, and EEZ/IHO intersections. These are useful neighbors, but they are not a direct Bosporus-Dardanelles chokepoint source.

## Follow-up

- Revisit this target only if a public polygon/line source for Turkish Straits becomes available.
- A future implementation can add a new source adapter for a verified line dataset, then generate a chokepoint polygon from a documented corridor width. That should be treated as a new geometry method and tested separately.
- Continue source replacement with `tno_south_china_sea`, the last remaining local clone candidate.
