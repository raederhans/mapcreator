# Viewport Color And Geometry Fix

## Goal

Fix three linked runtime issues:
- Political country fills remain visible during zoom and after settle.
- Ocean hit testing stays available while secondary spatial indexes rebuild.
- Guyana, Somaliland, and Russian Arctic shell coverage stay visible and diagnosable.

## Acceptance

- `render_diag=1` exposes political pass, water hit, and target geometry diagnostics.
- Political pass collection uses pass-scale overscan and exact-after-settle refreshes political fill.
- Secondary spatial reset can preserve the last valid water/special snapshot until the next snapshot is ready.
- Target contracts cover `GY`, `SO`, and `RU_ARCTIC_FB_*`.
- Targeted Python/Node contracts pass; E2E water and exact-after-settle specs are extended and runnable by a single owner.

## Progress

- [x] Baseline contract: `python -m unittest tests.test_map_renderer_spatial_index_runtime_orchestration_contract tests.test_map_renderer_render_cache_owner_boundary_contract tests.test_map_renderer_political_collection_boundary_contract -q`
- [x] Implement renderer diagnostics and overscan fix.
- [x] Implement secondary spatial stale-valid index behavior.
- [x] Add focused contracts and E2E coverage.
- [x] Run targeted validation and update this file with results.

## Validation

- `python -m unittest tests.test_map_renderer_spatial_index_runtime_orchestration_contract tests.test_map_renderer_spatial_index_runtime_owner_boundary_contract tests.test_map_renderer_render_cache_owner_boundary_contract tests.test_map_renderer_political_collection_boundary_contract tests.test_political_topology_gap_contract -q`
- `node --test tests/renderer_runtime_state_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs`
- `npm run test:e2e:dev:scenario-chunk-runtime`
- `npm run test:e2e:water-rendering`
- `npm run verify:pages-dist`
- `git diff --check`

## Notes

- Open-ocean visibility and interaction are intentionally separate: default/project import keeps open-ocean visual state independent from select/paint interaction flags.
- Secondary spatial rebuilds now use pending metadata and preserve the last valid water/special snapshot until the replacement snapshot is applied.
- `render_diag=1` records political pass, transformed pass, water hit, and target geometry diagnostics without enabling logs by default.
