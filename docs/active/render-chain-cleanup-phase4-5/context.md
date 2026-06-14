# Render Chain Cleanup Phase 4/5 Context

## 2026-06-14 Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-render-chain-cleanup`
- Branch: `codex/render-chain-cleanup-phase4-5`
- Base branch state: starts from `85621443` (`codex/render-chain-cleanup-phases`).
- Integration constraint: existing registry marks data-chain integration as owner; this branch should finish as ready-for-integration.
- Live test/build owner: main agent only.
- Subagent scope: static review only; no live tests or file edits.

## Findings

- Phase 4 query loops currently live in `map_renderer.js`:
  - `collectVisibleLandSpatialItemsWithStats`
  - `collectLandSpatialItemsForProjectedRects`
- Current production index is `grid + gridMeta.globals + drawOrder`.
- `flatbush` remains a later adapter candidate; production continues on current grid in this branch.

## 2026-06-14 Implementation

- Added `js/core/renderer/spatial_query_index.js` to own current grid query behavior:
  - projected rect intersection;
  - grid cell span;
  - visible viewport query stats;
  - projected rect query overflow.
- `map_renderer.js` now keeps viewport/runtime decisions in wrappers and delegates repeated query loops to the helper.
- Added `js/core/renderer/scenario_chunk_promotion_helpers.js` for:
  - scenario chunk promotion change-set derivation;
  - visual-stage metric detail construction.
- Kept Phase 5 political raster worker migration out of scope because the current client still has one metrics-first task path.

## Verification

- Syntax checks passed for changed JS files and Node tests.
- New helper behavior tests passed:
  - `npm run test:node:spatial-query-index`
  - `npm run test:node:scenario-chunk-promotion-helpers`
- Existing Python renderer/spatial/chunk contracts passed: 49 tests.
- `npm run test:node:scenario-chunk-contracts` has one remaining known data red: `hoi4_1939` coarse chunk per-feature bounds count `23375 !== 23426`.

## Integration Notes

- Status: committed on `codex/render-chain-cleanup-phase4-5` and ready-for-integration.
- Direct overlap: `js/core/map_renderer.js`, `package.json`, `tests/test_scenario_chunk_refresh_contracts.py`.
- Potential semantic overlap: current integration registry marks data-chain work as the owner branch and old render-chain cleanup as red overlap on renderer/tests.
- Recommended integration: cherry-pick or port this branch after data-chain integration has settled, then rerun the exact validation commands above plus the integration owner gate.
