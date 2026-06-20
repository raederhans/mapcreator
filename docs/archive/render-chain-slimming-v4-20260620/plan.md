# Render Chain Slimming V4 Plan

## Goal

Make the FrameGraph invalidation descriptor factory resource-first so new descriptors no longer translate renderer pass names into resources. The bridge remains the only place that can resolve fallback pass names for legacy or no-FrameGraph execution.

## Scope

1. Update `createFrameGraphInvalidation(...)` so `targetResources` is the only descriptor input for FrameGraph fan-out.
2. Keep `resolveFrameGraphInvalidationExecutionPlan(frameGraphInvalidation, fallbackTargetPasses)` as the compatibility bridge for fallback pass resolution.
3. Remove dead pass-derived locals left by V3.
4. Extend behavior and static contracts so pass-to-resource compatibility cannot move back into the descriptor factory.
5. Refresh Pages dist mirrors and manifest after source changes.

## Acceptance Criteria

- New FrameGraph descriptors contain `targetResources` and no descriptor-level pass fields.
- Passing `targetPasses` to `createFrameGraphInvalidation(...)` does not create resource fan-out.
- `resolveFrameGraphInvalidationExecutionPlan(null, fallbackTargetPasses)` still supports renderer pass fallback.
- Explicit empty resources continue to mean empty fan-out and skip pass invalidation.
- Source and Pages dist stay synchronized.

## Verification Plan

- `npm run test:node:scenario-refresh-plans`
- `npm run test:node:scenario-chunk-promotion-helpers`
- `npm run test:node:scenario-chunk-contracts`
- `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_main_deferred_detail_promotion_boundary_contract -q`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `npm run verify:pages-dist`
- `git diff --check`

## Boundaries

- Do not change exact-after-settle scheduling.
- Do not remove renderer refresh plan `targetPasses` outside the FrameGraph descriptor factory.
- Do not rearrange `map_renderer.js` dispatcher.
- Do not use browser inspection for this phase.
