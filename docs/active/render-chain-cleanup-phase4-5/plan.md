# Render Chain Cleanup Phase 4/5 Plan

## Goal

Continue the render-chain cleanup on top of `codex/render-chain-cleanup-phases` without changing behavior.

## Phase 4

- Add a small internal spatial query helper for the current grid snapshot.
- Keep production on the current grid implementation.
- Lock dedupe, globals, draw order, viewport overscan, and overflow semantics with Node tests.
- Move renderer query loops to the helper while keeping viewport/fallback decisions in `map_renderer.js`.

## Phase 5

- Extract chunk promotion planning and metric details from `map_renderer.js`.
- Preserve the existing visual-first and deferred-infra order.
- Leave `political_raster_worker_client.js` on its current metrics-first single-task path.

## Verification

- `node --check` for changed JavaScript files.
- `npm run test:node:spatial-query-index`
- `npm run test:node:scenario-chunk-promotion-helpers`
- `npm run test:node:scenario-chunk-contracts`
- `python -m unittest tests.test_map_renderer_spatial_index_runtime_owner_boundary_contract tests.test_map_renderer_spatial_index_runtime_orchestration_contract tests.test_spatial_index_state_boundary_contract tests.test_scenario_chunk_refresh_contracts -q`
- `git diff --check`
