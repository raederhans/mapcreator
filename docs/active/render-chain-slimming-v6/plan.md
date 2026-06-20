# Render Chain Slimming V6 Plan

## Objective

Continue slimming the FrameGraph-to-visual-executor boundary from `origin/main@a3e4f8a0`.

V6 targets the remaining pass-shaped language at the visual executor API edge. Renderer refresh plans may still use renderer pass names. The bridge may still resolve renderer fallback passes into executor invalidation passes. The visual executor should receive executor invalidation language, and retired pass-shaped inputs should fail fast.

## Evidence Anchors

- V5 archived docs show `resolveFrameGraphInvalidationExecutionPlan(...)` now returns only `targetResources`, `invalidationTargetPasses`, and `hasExplicitTargetResources`.
- Production calls to `executeScenarioVisualInvalidation(...)` come through `scenario_refresh_runtime.js` with an `executionPlan` object.
- The executor still accepts a top-level `targetPasses` parameter as a legacy direct-call fallback.
- No-FrameGraph renderer fallback is preserved by `resolveFrameGraphInvalidationExecutionPlan(null, rendererRefreshPlan.targetPasses)`.

## Scope

In scope:
- Retire or fail-fast visual executor top-level `targetPasses`.
- Keep no-FrameGraph renderer fallback through the bridge.
- Update behavior tests and static contracts.
- Mirror source changes to `dist/app`.

Out of scope:
- `exact_after_settle_*` pass planning.
- `map_renderer.js` dispatcher-wide invalidation calls.
- Scenario apply full renderer pass contract.
- Renaming renderer refresh plan `targetPasses`.

## Acceptance Criteria

- Visual executor rejects top-level `targetPasses` as a retired bridge/executor input.
- Visual executor still works with `executionPlan.invalidationTargetPasses`.
- no-FrameGraph renderer fallback still fans out from renderer refresh plan `targetPasses` through `resolveFrameGraphInvalidationExecutionPlan(...)`.
- Explicit empty resource invalidation still skips `invalidateRenderPasses`.
- Static contracts lock the retired executor `targetPasses` field.
- Source and `dist/app` mirrors match.

## Planned Steps

1. Create V6 worktree, active docs, and registry row.
2. Run repo evidence audit with two-step search.
3. Wait for read-only code-mapper review of the selected V6 scope.
4. Implement the smallest executor API retirement and contract updates.
5. Run targeted verification.
6. Run final static review and first-principles bug check.
7. Commit, merge to `main`, push, archive docs, and clean the worktree.
