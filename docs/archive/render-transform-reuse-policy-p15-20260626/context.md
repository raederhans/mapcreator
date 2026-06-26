# P15 Context

## Baseline

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-render-transform-reuse-policy-p15-20260626`
- Branch: `codex/render-transform-reuse-policy-p15-20260626`
- Base: `origin/main@f00ae918cda4f8f4f813a7f2a1f3c183aa126b07`
- Parent checkout: `C:\Users\raede\Desktop\dev\mapcreator` is dirty with unrelated `docs/archive/**` deletions and `lessons learned.md`.
- Main agent owns all live tests and browser/e2e processes. Subagents are static/read-only unless reassigned.

## Initial Findings

- `map_renderer.js` currently owns transform reuse constants near render timing constants.
- `getContextBaseZoomBucketId`, `getContextBaseReuseMaxDistancePx`, `getTransformReuseDelta`, contextBase/contextScenario decision helpers, and exact fast-path readiness live in `map_renderer.js`.
- `getRenderPipelinePassesOwner()` injects the wrapper function names that must remain stable.
- Existing renderer owner patterns use `create*Owner({ state, constants, getters, helpers })` and avoid reverse imports from `map_renderer.js`.

## Progress Log

- Created clean P15 worktree from refreshed `origin/main`.
- Registered the active worktree and wrote this plan/context/task set.
- Added `js/core/renderer/render_transform_reuse_policy_owner.js` as the transform reuse policy authority. It owns contextBase/contextScenario reuse thresholds, zoom buckets, distance/frame-limit decisions, and exact-after-settle fast-path readiness.
- Kept `map_renderer.js` wrapper function names stable and delegated wrappers to `getRenderTransformReusePolicyOwner()`. `createRenderPipelinePassesOwner` and exact scheduler helper keys remain unchanged.
- Added pure synthetic behavior coverage in `tests/render_transform_reuse_policy_owner_behavior.test.mjs`, including zoom buckets, viewport clamping, disabled/no-reference/distance/frame-limit decisions, and the exact fast-path required pass list.
- Strengthened `tools/check_architecture_boundaries.mjs` so the new owner has a line budget, reverse-import protection, exact fast-path pass-list checks, forbidden runtime/lifecycle token checks, and ownership-token checks.
- Updated `tests/scenario_chunk_contracts.test.mjs` and `package.json` so the existing contract suite and a named package script cover the new owner.
- Confirmed the task-forbidden files have no diff: `dist/app/**`, `tools/eslint-rules/state-writer-allowlist.json`, `js/core/map_renderer/public.js`, `js/core/map_renderer/exact_after_settle_scheduler.js`, `js/core/map_renderer/scenario_refresh_runtime.js`, and `js/core/renderer/render_pipeline_passes.js`.
- Validation passed: syntax checks for the new owner, `map_renderer.js`, the new test, and architecture tool; `npm run test:node:render-transform-reuse-policy-owner`; render-cache, render-pipeline, exact-after-settle, render-pass, render-invalidation, renderer-host, runtime-state, diagnostics, scenario-refresh, scenario-chunk, architecture, state-write allowlist, import graph; e2e TNO ready-state and smoke. E2E smoke retained known local `/api/backend/auth/me` 401 and D3 unsafe water geometry warnings.
