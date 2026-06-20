# Render Chain Slimming V3 Plan

## Goal

Retire the legacy FrameGraph invalidation pass fields that V2 kept for one
compatibility phase, while preserving the V2 bridge output contract and the
exact-after-settle scheduling algorithm.

## Scope

- Remove `legacyTargetPasses` and `frameGraphInvalidation.targetPasses` from
  newly-created FrameGraph invalidation descriptors.
- Keep `rendererRefreshPlan.targetPasses` as the fallback pass input for legacy
  callers without a FrameGraph descriptor.
- Keep `resolveFrameGraphInvalidationExecutionPlan(...)` returning
  `{ targetResources, targetPasses, invalidationTargetPasses, hasExplicitTargetResources }`.
- Make pass fan-out reads go through bridge output only.
- Keep scenario apply full-pass behavior unchanged.
- Keep exact-after-settle field names and scheduling behavior unchanged.

## Cleanup Plan

1. Lock current behavior with focused tests:
   - bridge output for explicit resources.
   - bridge output for explicit empty resources.
   - fallback pass behavior without FrameGraph resources.
   - scenario chunk promotion descriptor no longer exposes legacy pass fields.
2. Remove legacy pass fields from `createFrameGraphInvalidation(...)`.
3. Retire the public `getFrameGraphInvalidationTargetPasses` export and keep
   any necessary pass resolution internal to the bridge.
4. Update static contracts and architecture boundary checks to reject the
   retired fields.
5. Regenerate Pages dist and verify source/dist delivery surfaces.

## Acceptance Criteria

- `createFrameGraphInvalidation(...)` returns resource-first descriptors without
  `legacyTargetPasses` or `targetPasses`.
- `targetResources: []` still means empty fan-out and no render-pass invalidation.
- Fallback pass behavior still works when no FrameGraph descriptor/resources are
  supplied.
- Scenario apply still invalidates the full pass set:
  `background`, `physicalBase`, `political`, `contextBase`,
  `contextScenario`, `dayNight`, `borders`, `labels`.
- `scenario_refresh_runtime.js` keeps using bridge output and stays within the
  architecture budget.

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
