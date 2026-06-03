# Transport Data Rollout Plan

## Goal

Load real-source transport and facility data into the Transport Workbench and main-map bridge where the family supports it. The rollout follows this order:

1. Road country packs
2. Airport country packs
3. Rail country packs
4. Port country packs
5. Energy, mineral, industrial, and logistics packs
6. Runtime registry, catalog, dist, tests, and app interaction verification

## Ground Rules

- Main thread owns downloads, builders, tests, dev server, and browser verification.
- Subagents may research and inspect code, but they do not run live processes.
- Every generated checked-in pack must have a source recipe, source signature, build audit, manifest, runtime registry entry, catalog entry, and dist coverage.
- Official or regulator data is preferred. OSM/Geofabrik may be used as geometry only when official geometry is gated, unavailable, or policy-only.
- Downgrades must stay explicit in the source recipe and build audit.

## Current Execution Shape

- Current handoff continuation:
  - China and Russia facility packs are now covered for `energy_facilities`, `industrial_zones`, `logistics_hubs`, and `mineral_resources`.
  - UK `mineral_resources` is now covered by the OpenDataNI/GSNI Northern Ireland Mineral Resources public GeoJSON package. The pack records the Northern Ireland scope and leaves Great Britain BGS premium mineral-resource polygons as a future licensed-source track.
  - Main thread owns downloads, builders, tests, Pages dist, and browser smoke. Subagents remain read-only for research, static mapping, and review.
- Existing real-source packs to reverify: `germany_road`, `uk_road`, `france_rail`, `usa_airport`, `china_airport`, `russia_airport`, `india_airport`.
- Existing Japan workbench packs stay as the baseline for all families.
- New road focus: `usa_road`, `france_road`, `india_road`, `china_road`, `russia_road`.
- New airport focus: `germany_airport`, `france_airport`, `uk_airport`.
- New rail focus: `germany_rail`, `usa_rail`, then `uk_rail`, `india_rail`, `russia_rail`, `china_rail` if source gates can be made reproducible.
- New port focus starts with UN/LOCODE-backed official point packs and country official lists.
- Facility packs start with point/polygon families that can reuse the existing workbench runtime path.

## Acceptance

- `python tools/check_transport_country_sources.py` passes for all active country packs.
- `python tools/build_transport_country_real_packs.py` rebuilds all active country packs.
- `python tools/check_transport_workbench_manifests.py` passes.
- `python tools/build_data_catalog.py` and `python tools/build_pages_dist.py` produce clean output.
- Targeted Python and Node tests pass.
- A local app smoke verifies Transport Workbench loading, pack selection, preview rendering, apply-enabled families, and click/selection snapshots.

## Final Status

- Active country source checks, workbench manifest checks, catalog checks, Python contracts, Node owner tests, Pages dist verification, browser smoke, reviewer checks, and `git diff --check` passed on 2026-06-03.
- The rollout is ready for merge-back, commit, push, and worktree cleanup.
