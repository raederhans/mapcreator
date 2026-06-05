# Hierarchy Group Highlight

## Goal

Clicking a hierarchy group in the territory presets panel should immediately highlight that grouped area on the map, while keeping the existing apply-color and apply-ownership actions intact.

## Acceptance

- The map renderer accepts explicit feature ids for inspector highlights.
- Hierarchy group buttons send their child feature ids to that highlight path before applying their existing action.
- Group highlights are represented as one grouped overlay item when requested.
- Public renderer exports and sidebar contracts stay explicit.

## Progress

- [x] Add grouped feature-id inspector highlight support.
- [x] Wire hierarchy group buttons to the highlight support.
- [x] Add/update focused static contracts.
- [x] Sync dist and run verification.

## Verification

- `node --check js/core/map_renderer.js`
- `node --check js/core/map_renderer/public.js`
- `node --check js/ui/sidebar.js`
- `python -m unittest tests.test_map_renderer_public_contract tests.test_ui_rework_plan02_mainline_contract -q`
- `npm run verify:pages-dist`
