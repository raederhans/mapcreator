# Ocean Refinement context

## 2026-05-12 start

- Ralph execution started from `.omx/plans/ralplan-ocean-refinement-20260512T171900Z.md`.
- Context snapshot: `.omx/context/ocean-refinement-exec-20260512T175725Z.md`.
- Live owner: main thread for generation/build/tests/E2E/perf/checkpoint builder.
- Subagents: static analysis, bounded implementation suggestions, and final review only.
- Initial git status captured in the snapshot; unrelated pre-existing doc/archive deletions and `.omx/metrics.json` modification must be preserved.

## 2026-05-12 Phase 0 evidence

- Audit report: `.runtime/reports/generated/ocean_family_refine_audit.json`.
- Baseline counts: `61 marine_macro`, `12 detailed`, `49 macro_only`.
- Routing preview: `.runtime/reports/generated/ocean_refinement_routing_preview.json`.
- Current `water` rebuild plan includes `chunk_assets` in `map_builder/scenario_rebuild_planner.py`, confirmed by `tests/test_scenario_rebuild_planner.py`.

## Live-owner barrier

- Main thread may run `patch_tno_1962_bundle.py`, validator, strict contracts, node contracts, E2E, and perf.
- While a live command is running, subagents only read completed logs/reports and repo files.
- No subagent owns builder/test/browser polling in this Ralph session.

## 2026-05-12 Phase 1 patches

- Added validator report schema v2 with ocean-refinement phase target metrics, chunk counts, elapsed time, and explicit failure shape reporting.
- Added Weddell/Scotia probe points and southern seam pairs alongside Ross Sea.
- Added startup hydration water-only changed-layer propagation so secondary water indexes and hit canvas refresh on water-only hydration changes.

## 2026-05-12 blocker update

- Main thread continued live-owner validation after the user asked about the delay.
- Passing gates collected before the late blocker: `tests/test_tno_water_geometries.py` reached `20 passed`, standalone `tools/validate_tno_water_geometries.py` reached `ok`, node scenario chunk contracts reached `28 pass`, startup hydration behavior reached `9 pass`, strict contracts reached OK before manual Cyprus topology edit.
- Current blocker: post-Cyprus manual topology clamp changed `runtime_topology.topo.json` and `detail_chunks.manifest.json`; `tools/check_scenario_contracts.py --strict --write-safe` exits with code `-1` twice without stderr, leaving manifest/source and build snapshot drift. Latest strict errors are in `.runtime/tmp/strict_after_manual_cyprus_check.out.log`.
- Fresh checkpoint changed-domain rebuilds were attempted under `.runtime/tmp/tno-water-checkpoints-final*`; one was stopped after timeout, later runs exposed source D3 orientation and ATL startup compaction issues. These require a cleaner generator-side fix before E2E/perf gates.
