# Render Chain Slimming V5 Plan

## Goal

Narrow the FrameGraph bridge to visual executor contract so the resource-first path carries resource and execution semantics. Renderer pass names remain valid at renderer refresh plan boundaries and no-FrameGraph fallback only.

## Evidence Baseline

- Base: `main@f7501edf33faef94111e0e9e5d93e908be9fea68`.
- V4 completed the descriptor factory cutover: `createFrameGraphInvalidation(...)` accepts `targetResources` only and fails fast on retired pass-shaped inputs.
- `resolveFrameGraphInvalidationExecutionPlan(...)` still owns the fallback from renderer `targetPasses` to resources/passes.
- `scenario_visual_invalidation_executor.js` still receives both `targetPasses` and `invalidationTargetPasses` in the execution plan.

## Classification

- Renderer refresh plan language:
  - `renderer.targetPasses` and renderer refresh defaults.
  - Scenario apply full refresh pass arrays.
- Bridge fallback language:
  - `fallbackTargetPasses` passed into `resolveFrameGraphInvalidationExecutionPlan(...)` when no FrameGraph invalidation exists.
  - The pass names finally sent to `invalidateRenderPasses(...)`.
- FrameGraph resource-first residual language:
  - Bridge/executor execution plans expose `targetPasses` even when they are derived from `targetResources`.
  - Tests and static contracts currently require that field between bridge and executor.

## Implementation Plan

1. Keep renderer refresh plan `targetPasses` intact.
2. Remove generic `targetPasses` from bridge execution output.
3. Keep `invalidationTargetPasses` as the explicit executor pass-invalidation list.
4. Ensure explicit empty `targetResources` produces no pass invalidation.
5. Fail fast if the visual executor receives retired `targetPasses` in `executionPlan`.
6. Update behavior/static contracts and dist mirrors.

## Acceptance Criteria

- Resource-first FrameGraph descriptors do not need pass-shaped descriptor input.
- no-FrameGraph fallback can still fan out renderer `targetPasses`.
- Explicit empty `targetResources` skips `invalidateRenderPasses`.
- Executor side-effect order stays unchanged.
- Any retired bridge/executor pass field fails fast or is locked by static contracts.

## Verification Plan

- `npm run test:node:scenario-refresh-plans`
- `npm run test:node:scenario-chunk-promotion-helpers`
- `npm run test:node:scenario-chunk-contracts`
- `npm run test:node:exact-after-settle-refresh-plans`
- `npm run test:node:renderer-runtime-state-behavior`
- `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_main_deferred_detail_promotion_boundary_contract -q`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `npm run verify:pages-dist`
- `git diff --check`

## Boundaries

- Do not rewrite exact-after-settle.
- Do not change map renderer dispatcher flow.
- Do not change scenario apply full refresh pass contract.
- Do not add broad abstractions or fallback layers.
