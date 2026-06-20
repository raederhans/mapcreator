# Appearance Map Content Reorg Context

## 2026-06-20

- Current Appearance shell is implemented in `index.html` as a tab row plus `data-appearance-panel` sections.
- Ocean, Context Layers, Day / Night, Texture, Transport, and Presets are currently tab panels.
- Context Layers contains Physical Regions, Urban Areas, City Points, and Rivers.
- JS owners bind by stable element ids, so the safest path is to preserve ids and move only containers.
- CSS has several `#appearancePanelLayers`, `#appearancePanelDayNight`, and `#appearancePanelTexture` scoped rules that must be retargeted after moving nodes.
- Main thread owns the dev server and verification. The child code-mapper is read-only and must not start or poll live processes.

## Risks

- Removing tab buttons while leaving panels with `data-appearance-panel` can make the controller default to a missing tab. Borders should become the active default.
- Moving Rivers out of `#appearancePanelLayers` requires retargeting rivers-specific CSS.
- `Map Content` is new visible copy and should be covered by source/dist and i18n paths.

## Completion Notes

- Appearance tab navigation now owns Borders, Physical Regions, Urban Areas, City Points, Transport, and Presets.
- Map Content tab navigation now owns Ocean, Day / Night, Texture, and Rivers.
- `createAppearanceControlsController` moves Ocean, Day / Night, Texture, and Rivers into `#mapContentStack` before collecting map-content tab panels.
- `createAppearanceControlsController` also moves Physical Regions, Urban Areas, and City Points from the hidden staging container into their same-level Appearance tab panels.
- `setAppearanceTabController("borders")` keeps the initial Appearance panel non-empty.
- `setMapContentTab("ocean")` keeps the initial Map Content panel non-empty.
- Browser verification confirmed the Appearance tab row contains Borders, Physical Regions, Urban Areas, City Points, Transport, and Presets.
- Browser verification confirmed `#mapContentStack` contains Ocean, Day / Night, Texture, and Rivers as one-visible-panel-at-a-time map-content tab panels, and the Context Layers heading is gone.
- Browser verification confirmed map-content tab panels keep `18px 20px 20px` inner padding with no horizontal overflow at the current sidebar width.
- Rivers now has the same child-card structure as the other map-content panels: Visibility, River Stroke, and Outline & Dash.
- Rivers is forced open after moving into Map Content and its summary arrow is hidden there, so it behaves as a fixed tab panel rather than a collapsible details row.
- Console errors during browser verification were limited to existing local auth `401` and preload warnings.
