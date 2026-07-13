# P3.0 Render-Pass Family Coupling Matrix

Exact base: `origin/main@63dd0bb5e23afd340afe2dc0dcc74095cc4cb2cd`.

| Pass | Entry | Family | Current owner / status | Runtime reads | Writes | Delegates | Browser tests | Risk tier | Perf sensitivity | Planned phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| background | `drawBackgroundPass` | foundation | `js/core/map_renderer.js` / inline | viewport, appearance, map-data, render-cache | pass-surface, owner-cache, runtime-state, diagnostics | ocean render; intensity field mask | water rendering | high | high | hold |
| physicalBase | `drawPhysicalBasePass` | foundation | physical layer owner / delegated-existing | viewport, appearance, scenario, map-data, interaction, render-cache | pass-surface, owner-cache, runtime-state, diagnostics | whole pass to physical layer owner | physical-layer runtime contract | medium | high | existing-delegated |
| political | `drawPoliticalPass` | political | `js/core/map_renderer.js` / inline | viewport, appearance, scenario, map-data, interaction, render-cache, diagnostics | pass-surface, owner-cache, runtime-state, diagnostics | color resolution; political collection; spatial index; visible-frame diagnostics | scenario resilience; TNO contracts | high | high | P3.3a |
| hgoPreview | `drawHgoPreviewPass` | hgo-preview | HGO runtime preview owner / delegated-existing | viewport, scenario, map-data, interaction, render-cache | pass-surface, owner-cache, diagnostics | HGO frame commit | dedicated browser lane gap | medium | high | existing-delegated |
| contextBase | `drawContextBasePass` | context | `js/core/map_renderer.js` / inline | viewport, appearance, scenario, map-data, interaction, render-cache | pass-surface, owner-cache, runtime-state, diagnostics | physical layer; river layer | physical-layer runtime; water rendering | high | high | P3.2 |
| contextScenario | `drawContextScenarioPass` | context | `js/core/map_renderer.js` / inline | viewport, appearance, scenario, map-data, interaction, render-cache | pass-surface, owner-cache, runtime-state, diagnostics | scenario water cache; relief overlay | scenario resilience; water rendering; TNO contracts | high | high | P3.2 |
| effects | `drawEffectsPass` | visual-effects | `js/core/map_renderer.js` / inline | viewport, appearance, interaction, render-cache | pass-surface, owner-cache, runtime-state | render-request boundary for async texture rerender | layer regression | medium | high | P3.1 |
| lineEffects | `drawLineEffectsPass` | visual-effects | `js/core/map_renderer.js` / inline | viewport, appearance, interaction, render-cache | pass-surface, owner-cache, runtime-state | local cached graticule/draft geometry | layer regression | medium | medium | P3.1 |
| dayNight | `drawDayNightPass` | visual-effects | `js/core/map_renderer.js` / inline | viewport, appearance, map-data, interaction, render-cache, clock | pass-surface, owner-cache, runtime-state, diagnostics | city lights owner | city rendering | medium | high | P3.1 |
| borders | `drawBordersPass` | borders | `js/core/map_renderer.js` / thin-wrapper | viewport, appearance, scenario, map-data, interaction, render-cache | pass-surface, owner-cache, diagnostics | border draw owner after HGO/data guards | layer regression; TNO contracts | high | high | hold |
| contextMarkers | `drawContextMarkersPass` | context | `js/core/map_renderer.js` / inline | viewport, appearance, scenario, map-data, interaction, render-cache | pass-surface, owner-cache, diagnostics | transport overview; city points; urban/city policy | city rendering; scenario resilience; TNO contracts | high | high | P3.2 |
| textureLabels | `drawTextureLabelEffectsPass` | visual-effects | `js/core/map_renderer.js` / inline | viewport, appearance, interaction, render-cache | pass-surface, owner-cache, runtime-state, diagnostics | local graticule label effect | layer regression | medium | low | P3.1 |
| labels | `drawLabelsPass` | labels | `js/core/map_renderer.js` / thin-wrapper | viewport, appearance, scenario, map-data, interaction, render-cache | pass-surface, owner-cache, diagnostics | city points; urban/city policy | city rendering | medium | medium | future-review |

## Risk semantics

- `low`: pass-local implementation with pass-surface, owner-cache, or diagnostic writes.
- `medium`: established owner, clock, async boundary, or idempotent style normalization that creates limited shared-state coupling.
- `high`: foundational/scenario correctness, multi-owner orchestration, ownership-critical cross-pass lifecycle mutation, worker lifecycle, large traversal, or shared cache identity.

## Frozen P3 boundaries

P3 keeps render pass order, both production catalogs, `renderPassToCache()`, P2 frame owners, the public facade, and the state-write allowlist unchanged. `RendererRuntimeContext` stays a runtime context and does not become an effects bus. Political work begins with P3.3a preflight.
