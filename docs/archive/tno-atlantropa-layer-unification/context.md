# TNO 1962 Atlantropa Layer Unification Context

## 2026-05-07

- Created execution docs for the Atlantropa layer migration.
- Spawned five read-only child agents:
  - data/build contract map
  - runtime loader/state/startup map
  - renderer/color/spatial map
  - test contract map
  - architecture critique
- Renderer agent found the old ATLSEA projection path centered in `map_renderer.js`, with downstream spatial handling in `spatial_index_runtime_builders.js`.
- Data/build agent found the strict and startup paths still anchored to `objects.political`, with builder entrypoints in `tools/patch_tno_1962_bundle.py` and `tools/scenario_chunk_assets.py`.
- Runtime agent found the minimal loader path: register optional layer config, add `scenarioAtlantropaData`, hook startup decode/hydration, chunk merge, lifecycle reset, rollback, and visibility persistence.

## Current Task State

- Planning and context setup are complete.
- Builder, strict checker, startup hydration, chunk runtime, renderer/color, and optional-layer wiring have been patched.
- Test expectations now point at `scenario_atlantropa` chunks and assert the old `political.detail.country.atl` route has disappeared.
- Static follow-up fixed the standalone TopoJSON optional-layer decode path, Atlantropa-only refresh invalidation, manifest-driven default visibility, and project visibility serialization.
- A full single-owner rebuild is running in the parent thread. PID/logs are recorded in `task.md`.
- Child agents are now limited to static/test edits and review so live build ownership stays single-threaded.
- The full rebuild reached the water checkpoint, then the runtime topology stage climbed past 50GB working set without writing topology output. The parent stopped that builder to avoid OOM and removed the stale checkpoint lock after verifying the path stayed under the workspace.
- Execution is switching to a memory-light topology split over the checked-in runtime topology, followed by downstream chunk/startup/strict regeneration.
- The memory-light split recovered the target data shape: `political` has 0 ATL features, `scenario_atlantropa` has 927 features, and the 6 prefix groups are routed through explicit `atl_render_layer`, `atl_interactive`, and `atl_color_rule` fields.
- Safe downstream repair completed with `[scenario-contract] OK tno_1962`.
- Verification completed:
  - `python tools\check_scenario_contracts.py --scenario-dir data\scenarios\tno_1962 --strict`
  - `node --test tests\scenario_chunk_contracts.test.mjs`
  - `python -m unittest tests.test_scenario_chunk_assets.ScenarioChunkAssetsTest tests.test_tno_bundle_builder.TnoBundleBuilderTest`
  - `python -m py_compile tools\extract_scenario_atlantropa.py tools\patch_tno_1962_bundle.py tools\check_scenario_contracts.py tools\scenario_chunk_assets.py tools\build_startup_bootstrap_assets.py tools\build_startup_bundle.py`
  - `node --check` on the touched runtime JS files
  - `git diff --check`
- Final static review found two code fixes:
  - water visual revision now includes `scenarioAtlantropaData` identity and layer bucket counts.
  - strict chunk coverage now separates `scenario_atlantropa` all-chunk ids from detail-chunk ids, so coarse chunks cannot hide detail coverage gaps.
- The review also flagged untracked generated Atlantropa assets. They must be included with the final commit because manifest and chunk manifest now reference them.
- Final cleanup removed the old Atlantropa sea projection cache/functions and the `atl_water_projection` spatial special case. `scenario_atlantropa.water` is now the only Atlantropa water source in runtime rendering.
- `manifest.render_budget_hints.max_required_political_chunks` and the chunk asset default were reduced from 48 to 6 after ATL features left political chunks; strict and chunk selection tests stayed green.
