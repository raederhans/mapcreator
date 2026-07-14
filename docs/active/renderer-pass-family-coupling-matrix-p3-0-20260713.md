# P3.0 Render-Pass Family Coupling Matrix

Exact base: `origin/main@63dd0bb5e23afd340afe2dc0dcc74095cc4cb2cd`.

| Pass | Entry | Family | Entry host / status | Runtime reads | Writes | Delegates | Browser tests | Risk tier | Perf sensitivity | Planned phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| background | `drawBackgroundPass` | foundation | `js/core/map_renderer.js` / inline | viewport, appearance, scenario, map-data, render-cache | pass-surface, owner-cache, runtime-state, diagnostics | ocean render; bathymetry asset URL policy; intensity field mask | water rendering | high | high | hold |
| physicalBase | `drawPhysicalBasePass` | foundation | `js/core/map_renderer.js` / delegated-existing | viewport, appearance, scenario, map-data, interaction, render-cache | pass-surface, owner-cache, runtime-state, diagnostics | whole pass to physical layer owner | physical-layer runtime contract | medium | high | existing-delegated |
| political | `drawPoliticalPass` | political | `js/core/map_renderer.js` / inline | viewport, appearance, scenario, map-data, interaction, render-cache, diagnostics | pass-surface, owner-cache, runtime-state, diagnostics | raster worker client; worker packet builder; render-request boundary; color resolution; political collection; spatial index; visible-frame diagnostics | scenario resilience; water rendering; TNO contracts | high | high | P3.3a |
| hgoPreview | `drawHgoPreviewPass` | hgo-preview | `js/core/map_renderer.js` / delegated-existing | viewport, scenario, map-data, interaction, render-cache | pass-surface, owner-cache, diagnostics | HGO runtime preview owner; HGO frame commit | dedicated browser lane gap | medium | high | existing-delegated |
| contextBase | `drawContextBasePass` | context | `js/core/map_renderer.js` / inline | viewport, appearance, scenario, map-data, interaction, render-cache | pass-surface, owner-cache, runtime-state, diagnostics | physical layer; river layer; color resolution | physical-layer runtime; water rendering | high | high | P3.2 |
| contextScenario | `drawContextScenarioPass` | context | `js/core/map_renderer.js` / inline | viewport, appearance, scenario, map-data, interaction, render-cache | pass-surface, owner-cache, runtime-state, diagnostics | scenario water cache; relief overlay; color resolution | scenario resilience; water rendering; TNO contracts | high | high | P3.2 |
| effects | `drawEffectsPass` | visual-effects | `js/core/map_renderer.js` / inline | viewport, appearance, interaction, render-cache | pass-surface, owner-cache, runtime-state | render-request boundary for async texture rerender | layer regression | medium | high | P3.1 |
| lineEffects | `drawLineEffectsPass` | visual-effects | `js/core/map_renderer.js` / inline | viewport, appearance, interaction, render-cache | pass-surface, owner-cache, runtime-state | local cached graticule/draft geometry | layer regression | medium | medium | P3.1 |
| dayNight | `drawDayNightPass` | visual-effects | `js/core/map_renderer.js` / inline | viewport, appearance, scenario, map-data, interaction, render-cache, clock | pass-surface, owner-cache, runtime-state, diagnostics | city lights owner; urban/city policy | city rendering | medium | high | P3.1 |
| borders | `drawBordersPass` | borders | `js/core/map_renderer.js` / thin-wrapper | viewport, appearance, scenario, map-data, interaction, render-cache | pass-surface, owner-cache, diagnostics | border draw owner; ocean/coastal-accent owner after HGO/data guards | layer regression; TNO contracts | high | high | hold |
| contextMarkers | `drawContextMarkersPass` | context | `js/core/map_renderer.js` / inline | viewport, appearance, scenario, map-data, interaction, render-cache | pass-surface, owner-cache, runtime-state, diagnostics | transport overview; strategic resource markers; city points; urban/city policy; color resolution | city rendering; scenario resilience; TNO contracts | high | high | P3.2 |
| textureLabels | `drawTextureLabelEffectsPass` | visual-effects | `js/core/map_renderer.js` / inline | viewport, appearance, interaction, render-cache | pass-surface, owner-cache, runtime-state, diagnostics | local graticule label effect | layer regression | medium | low | P3.1 |
| labels | `drawLabelsPass` | labels | `js/core/map_renderer.js` / thin-wrapper | viewport, appearance, scenario, map-data, interaction, render-cache | pass-surface, owner-cache, diagnostics | city points; city labels; urban/city policy; color resolution | city rendering | medium | medium | future-review |

## Risk semantics

- `low`: pass-local implementation with pass-surface, owner-cache, or diagnostic writes.
- `medium`: established owner, clock, async boundary, or idempotent style normalization that creates limited shared-state coupling.
- `high`: foundational/scenario correctness, multi-owner orchestration, ownership-critical cross-pass lifecycle mutation, worker lifecycle, large traversal, or shared cache identity.

## Frozen P3 boundaries

P3 keeps render pass order, both production catalogs, `renderPassToCache()`, P2 frame owners, the public facade, and the state-write allowlist unchanged. `RendererRuntimeContext` stays a runtime context and does not become an effects bus. Political work begins with P3.3a preflight.

`Entry host` names the module containing the pass entry function. `Delegates` is a reviewed dependency snapshot whose paths must exist and remain directly imported by the entry host; the HGO frame commit uses its explicit one-hop preview-owner edge. This matrix does not claim full per-call-site ownership proof.
