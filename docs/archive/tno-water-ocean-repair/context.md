# TNO Water/Ocean Repair Context

## 2026-05-11

- Current worktree started with only `.omx/metrics.json` modified.
- Audit found real overlap candidates around Greenland/Barents, Northeast Atlantic/Barents, and Sea of Japan/Okhotsk.
- Sea of Japan/Tatarskiy Proliv has zero area overlap but a linear intersection, so it should be treated as a seam case.
- Ross Sea is valid geometry but crosses the antimeridian and needs part-aware validation.
- Validator currently OOMs while eagerly expanding `runtime_topology.topo.json::scenario_water`.
- Project lessons say shipped `scenario_water` changes must keep manifest, audit, startup bundles, and strict contract in sync.

## 2026-05-12

- Validator OOM was fixed by converting selected TopoJSON objects through the D3/topojson-client path instead of eagerly expanding the full runtime topology through Python.
- TNO water now uses explicit `water_regions_mode: "exclusive"` in the scenario manifest, while legacy Atlantropa relief still maps to exclusive mode for older data.
- Renderer water visibility now uses `isWaterRegionRenderable()`, while hit/highlight/selection keep using `isWaterRegionEnabled()`.
- Named-water residual overlaps were repaired through final `subtract_named_ids` enforcement after supplements and land-mask clipping. The shipped source/runtime water now removes the observed Greenland/Norwegian, Bering/Gulf of Alaska, Sea of Japan/Okhotsk, English/Poole, Irish/Cardigan, South China/Gulf of Thailand, Gulf of Oman/Persian Gulf, and Philippine/Halmahera overlaps.
- `tno_south_indian_antarctic_ocean` keeps one source-stage orientation repair and one runtime TopoJSON D3 repair. Removing the runtime repair makes D3 read the object as a world shell.
- Review pass found two real gaps and they were fixed: open-ocean is now renderable while still gated out of default interaction, and `water_regions_mode` is written by the generator plus validated by strict scenario contracts.
- Final verification passed: `validate_tno_water_geometries.py`, strict scenario contracts, Node scenario chunk contracts, generator unit tests, and pytest-style TNO water contract functions.
