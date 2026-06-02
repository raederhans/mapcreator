# Ocean South China Sea Source 2026-06-02 Context

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-ocean-south-china-sea-source-20260602`
- Branch: `codex/ocean-south-china-sea-source-20260602`
- Base: `origin/main` at `6f910220`.
- Main workspace has unrelated dirty files; this worktree isolates ocean changes.
- Current audit before source investigation: `low_precision_candidate_count=0`, `source_replacement_candidate_count=2`, `local_clone=2`, `high_precision_split_candidate_count=3`, `simplification_review_candidate_count=4`, `provenance_gap_count=0`.
- Remaining local clones from provenance: `tno_bosporus_dardanelles`, `tno_south_china_sea`.
- Selected target: `tno_south_china_sea`, because Bosporus-Dardanelles lacks a usable public polygon/line source in current Marine Regions WFS layers.
- Live process owner: main agent owns source fetch/build/test commands. Subagents are static review only.
- Relevant lesson: Marine Regions source snapshot near 100 MiB needs explicit simplification/provenance if a source replacement increases snapshot size.
- Source decision: Marine Regions SeaVoX v19 `mrgid_sr='24144'` was selected over IHO `mrgid=4332`; SeaVoX area and bounds stay close to the existing South China Sea shape while IHO includes a broader northern extent.
- Asset sync method: full TNO country rebuild is blocked by donor checkout mismatch, so this phase used a water-only sync path. It replaces `water_regions.geojson`, the `scenario_water` topology object, water chunks, startup bundles, manifest hashes, and provenance while preserving existing political and Atlantropa runtime objects.
- Runtime correction: rebuilding runtime from extracted political/land/context GDFs cleared `scenario_atlantropa`; the final path preserves the checked-in runtime topology seed and replaces only `scenario_water`.
- Open-ocean correction: subtracting the refined South China Sea from Pacific open oceans produced small components in `tno_northwest_pacific_ocean`; final output applies the existing open-ocean `component_min_area=0.05` pruning rule.
- Final South China Sea geometry: source area `228.5306737520258`, target area after child subtraction `228.4801381853023`, bounds `[102.23828125, 1.23560906, 122.14749146, 23.49885941]`, vertex count `7114`.
- Final audit: `low_precision_candidate_count=0`, `source_replacement_candidate_count=1`, `local_clone=1`, `provenance_gap_count=0`; remaining local clone is `tno_bosporus_dardanelles`.
- Final verification passed: water geometry validator, family refinement audit, full `tests/test_tno_water_geometries.py`, full `tests/test_tno_bundle_builder.py`, and `tests/test_tno_named_marginal_water_contract.py`.
