# Render Chain Slimming V2 Plan

## Goal

Reduce render-chain load by moving scenario visual invalidation execution out of
`scenario_refresh_runtime.js` and by routing FrameGraph pass compatibility
through one execution bridge.

## Execution Plan

1. Lock existing behavior before refactor:
   - FrameGraph explicit resources.
   - FrameGraph explicit empty resources.
   - fallback pass behavior without a FrameGraph descriptor.
   - visual invalidation execution order.
   - scenario apply full-pass behavior.
   - exact-after-settle exact/deferred split.
2. Add `resolveFrameGraphInvalidationExecutionPlan(...)` in
   `scenario_refresh_plans.js`.
3. Add `scenario_visual_invalidation_executor.js` and route chunk promotion
   visual invalidation through it.
4. Keep PromotionDelta construction, deferred infra sequencing, static mesh
   rebuild, secondary spatial index, and opening owner border refresh in
   `scenario_refresh_runtime.js`.
5. Keep exact-after-settle pass language local and preserve the existing
   scheduler algorithm.
6. Tighten architecture boundaries and file budgets.
7. Run targeted Node tests, Python contracts, architecture/import gates, Pages
   dist verification, and diff hygiene.

## Acceptance Criteria

- `scenario_refresh_runtime.js <= 540` source lines.
- New visual invalidation executor `<= 260` source lines.
- `map_renderer.js <= 24100` source lines.
- `exact_after_settle_scheduler.js <= 760` source lines.
- New code reads FrameGraph invalidation pass compatibility through
  `resolveFrameGraphInvalidationExecutionPlan(...)`.
- `targetResources: []` means no pass fan-out and no `invalidateRenderPasses`
  call.
- Chunk promotion visual invalidation goes through the executor.
- exact-after-settle fields, metrics, deferred slicing, and scheduling behavior
  stay stable.

## Validation Commands

- `npm run test:node:scenario-refresh-plans`
- `npm run test:node:scenario-chunk-promotion-helpers`
- `npm run test:node:exact-after-settle-refresh-plans`
- `npm run test:node:renderer-runtime-state-behavior`
- `npm run test:node:scenario-chunk-contracts`
- `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_render_pipeline_passes_boundary_contract -q`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `npm run verify:pages-dist`
- `git diff --check`

