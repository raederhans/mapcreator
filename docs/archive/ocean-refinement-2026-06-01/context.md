# Ocean Refinement Context

## 2026-06-01 Start

- Created isolated worktree from clean `main` commit `30f0aa1c`.
- Parent checkout had unrelated dirty files, so this branch keeps ocean work isolated.
- Existing long-term rules emphasize source/dist parity, scoped dist patches, water inspector aggregation as display-only, and exact render lifecycle invalidation.
- Current live process owner: main agent. No live browser or test process is running.

## Initial Evidence

- Candidate rendering files include `js/core/map_renderer.js`, `js/core/state/renderer_runtime_state.js`, and scenario renderer bridge files.
- Candidate water data files include `data/scenarios/tno_1962/water_regions.geojson`, `data/scenarios/tno_1962/chunks/water.*.json`, and `data/scenarios/tno_1962/derived/marine_regions_named_waters.snapshot.geojson`.
- Existing water validation/test surfaces include `tools/validate_tno_water_geometries.py`, `tools/audit_tno_water_family_refinement.py`, `tests/test_tno_water_geometries.py`, `tests/test_tno_named_marginal_water_contract.py`, and water E2E specs.

## Subagent Ownership

- Rendering/static chain: code-mapper subagent `019e8580-dba5-7f71-ad59-7d4e258f0d9c`; read-only.
- Water data/static chain failed twice due context-window errors and was moved back to main-thread structured data audit.

## Rendering Patch Notes

- The rendering subagent found that SVG hover overlay and Canvas water highlight both used `hoveredWaterRegionId`, while the water cache token did not include hover/selected state.
- Patch direction: keep hover on the SVG overlay only, keep selected on the Canvas water highlight, and add `selectedWaterRegionId` to the water visual token.
- Empty map clicks now clear selected water/special region state.
- Open-ocean toggle changes now clear hidden open-ocean hover/selected state before rerendering the inspector and map.
- Water inspector list, legend, child, and jump-to-parent selections now request a map render after updating `selectedWaterRegionId`.
- External references used:
  - MDN Canvas `lineJoin`: `round` joins smooth sharp path corners, while the default is `miter`.
  - MDN Canvas line styles: line width is centered on the path and can look thicker around dense boundaries.
  - D3 `geoPath`: the same GeoJSON feature can be rendered to SVG path data or Canvas.
  - MDN SVG `vector-effect`: `non-scaling-stroke` keeps stroke width stable through zoom.

## Water Data Evidence

- Current live process owner: none. The main agent completed all live tests/builds listed below.
- Completed validator command: `python tools\validate_tno_water_geometries.py --report-path .runtime\reports\generated\ocean-refinement-tno-water-geometry.json`.
- Validator result: `failure_count=0`; source/runtime/chunk ids are synchronized; Arctic phase targets are present in source/runtime/chunks.
- Validator result: ocean macro coverage has `pairwise_overlap_count=0`; macro land overlap has `suspicious_count=0`.
- Family audit result after schema expansion: `marine_macro_count=61`, `marine_macro_with_children_count=12`, `marine_macro_without_children_count=49`, `low_precision_candidate_count=5`.
- Lowest current macro vertex count: `tno_scotia_sea` (`Scotia Sea`) with `vertex_count=15`.
- External source attempt: Marine Regions WFS did not return a reliable Scotia Sea replacement through the precise IHO query; the local Natural Earth archive contains only an 8-vertex Scotia feature, so it is lower quality than the current checked-in clone.
- Decision: do not rewrite coordinates without a better source-backed geometry. Continue global refinement by surfacing low-precision candidates in the audit report and using that queue for future source-backed geometry work.

## Verification

- `node --check js\core\map_renderer.js`
- `node --check js\ui\sidebar\water_special_region_controller.js`
- `python -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q`
- `python -m unittest tests.test_water_special_region_sidebar_boundary_contract -q`
- Follow-up review tests added and rerun for empty-click selection clearing plus hidden open-ocean state clearing.
- Manual direct call of pytest-style water geometry functions: audit report fixture, refinement phase sync, probe coverage, neighbor seam coverage.
- Manual direct call of pytest-style named water functions: named water contract and overlap contract.
- `python tools\validate_tno_water_geometries.py --report-path .runtime\reports\generated\ocean-refinement-tno-water-geometry.json`
- `python tools\audit_tno_water_family_refinement.py`
- `npm run verify:pages-dist`
- `git diff --check`

## Validation Notes

- Global `python -m pytest` is unavailable in this environment (`No module named pytest`), so pytest-style tests were validated through direct function calls plus the project validator.
- `python -m unittest tests.test_tno_water_geometries -q` only discovers the unittest class in that file; it ran 1 test and passed, but it is not the right full-file entry for pytest-style functions.
- `python -m unittest tests.test_tno_named_marginal_water_contract -q` discovers 0 tests because that file uses pytest-style functions.

## Review

- Native code-reviewer subagent found no blocking issues.
- Follow-up risk from review: empty click and hidden open-ocean clearing were originally covered by behavior inspection only; added static boundary tests for both.
- Dist manifest also records Windows-generated size changes for two unchanged dist files. This is kept with the verified `verify:pages-dist` output and will be called out in the commit message.
- `lessons learned.md` was left unchanged because no durable project-level lesson emerged beyond normal source/dist and worktree hygiene.
