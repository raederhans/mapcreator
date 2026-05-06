# Transport Facility Icons Selection Context

## 2026-05-06

- Created worktree `C:\Users\raede\Desktop\dev\mapcreator-transport-icons` on branch `codex/transport-facility-icons-selection`.
- Generated a simplified 4x2 transparent pixel icon atlas at `js/core/renderer/transport_facility_icon_atlas.png`.
- Current code truth: `transport_overview_render_owner.js` owns airport/port canvas drawing; `map_renderer.js` owns hover/click probing and selected-card rebinding.
- Root cause for selection drift: facility hover entries used projected coordinates in `screenPoint`, while mouse events use screen coordinates.
- Root cause for oversized markers: airport/port marker radius was drawn in transformed canvas space, so zoom multiplied visual size.
- Added `transport_facility_icons.js` as the category-to-icon owner. It exposes atlas cells, icon keys, compact screen-size bounds, and browser image loading.
- `transport_overview_render_owner.js` now computes `screenX/screenY` from `runtimeState.zoomTransform`, stores those in hover entries, and draws airport/port icons at `screenSize / zoomScale`.
- `map_renderer.js` now caps facility hover radius and draws a round active marker for icon-backed facilities.
- While running related UI support contracts, found a stale river dash assertion reading `map_renderer.js`; updated it to read the current `river_layer_render_owner.js`.
- Static review found one real blocker: atlas loading/error could create invisible hover targets. Fixed by adding explicit atlas status and clearing airport/port hover entries while the atlas is not ready.
