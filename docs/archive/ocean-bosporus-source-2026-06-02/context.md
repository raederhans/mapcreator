# Ocean Bosporus Source 2026-06-02 Context

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-ocean-bosporus-source-20260602`
- Branch: `codex/ocean-bosporus-source-20260602`
- Base: `origin/main` at `de3f3221`.
- Main workspace has unrelated dirty files; this worktree isolates ocean changes.
- Current audit: `low_precision_candidate_count=0`, `source_replacement_candidate_count=2`, `local_clone=2`, `high_precision_split_candidate_count=3`, `simplification_review_candidate_count=4`, `provenance_gap_count=0`.
- Remaining local clones from provenance: `tno_bosporus_dardanelles`, `tno_south_china_sea`.
- Selected target: `tno_bosporus_dardanelles`, because it is smaller than South China Sea and should be a safer next source replacement.
- Live process owner: main agent owns source fetch/build/test commands. Subagents are static review only.
- Relevant lesson: Marine Regions source snapshot near 100 MiB needs explicit simplification/provenance if a source replacement increases snapshot size.

## Source Candidate Findings

- Current generated feature: `MultiPolygon`, area `0.6541021778224327`, bounds `[25.400054000540024, 39.69174018240183, 29.812162889615344, 41.073296057960576]`.
- Current spec uses `global_source_id="med_bosporus_dardanelles"`, `source_standard="tno_cloned_from_global_water_regions"`, and `subtract_named_ids=("tno_sea_of_marmara",)`.
- `tno_black_sea` subtracts `tno_bosporus_dardanelles`, so this feature is part of the Black Sea/Marmara chokepoint boundary contract.
- Marine Regions pages confirm `Dardanelles` as `mrgid=3721`, `PlaceType Strait`, and `Bosporus` as `mrgid=3725`, `PlaceType Strait`.
- WFS `MarineRegions:seavox_v19` and `MarineRegions:iho` bbox checks returned only broader named seas in this area.
- WFS `MarineRegions:gazetteer_polygon` returned only `Greece - Aegean Sea and Eastern Mediterranean` in the target bbox.
- WFS `MarineRegions:gazetteer_line` returned no bbox features in the target area and no features for `mrgid IN (3725,3721)`.
- WFS `MarineRegions:world_bay_gulf` returned no target bbox features.
- WFS `MarineRegions:goas` returned broad `North Pacific Ocean` and `Mediterranean Region` features.
- WFS `MarineRegions:eez_iho` returned broader Aegean, Black Sea, Marmara, and IHO/EEZ intersection polygons.
- Replacement is deferred because a point Gazetteer record or broad neighboring sea polygon would create an invented chokepoint geometry.

## Validation

- `python tools\audit_tno_water_family_refinement.py` passed before source investigation.
- Public WFS checks were read-only and did not change data files.
- No production code or generated assets were changed in this worktree.
