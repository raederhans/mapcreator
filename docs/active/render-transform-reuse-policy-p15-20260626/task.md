# P15 Task

## Status

in-progress

## Checklist

- [x] Create isolated worktree from latest `origin/main`.
- [x] Record plan/context/task docs and registry row.
- [x] Add `js/core/renderer/render_transform_reuse_policy_owner.js`.
- [x] Delegate `map_renderer.js` wrappers to the new owner.
- [x] Add `tests/render_transform_reuse_policy_owner_behavior.test.mjs`.
- [x] Add package script and architecture boundary checks.
- [x] Run required validation commands.
- [x] Run final review and first-principles bug check.
- [ ] Commit, push branch/main, archive docs, update registry, and clean worktree.

## Delivery Package

1. Change summary:
   - Added `createRenderTransformReusePolicyOwner` for contextBase/contextScenario transform reuse policy and exact-after-settle fast-path readiness.
   - Delegated existing `map_renderer.js` wrapper functions to the owner while keeping wrapper names and pipeline/scheduler helper keys stable.
   - Added synthetic owner behavior tests and a named package script.
   - Extended architecture and scenario chunk contracts to lock the new authority boundary.
   - Preserved all task-forbidden renderer lifecycle, public facade, dist, allowlist, scheduler, scenario refresh, and render pipeline pass files.
2. Files:
   - Core: `js/core/renderer/render_transform_reuse_policy_owner.js`, `js/core/map_renderer.js`.
   - Tests: `tests/render_transform_reuse_policy_owner_behavior.test.mjs`, `tests/scenario_chunk_contracts.test.mjs`.
   - Tooling: `tools/check_architecture_boundaries.mjs`, `package.json`.
   - Docs: `docs/active/render-transform-reuse-policy-p15-20260626/plan.md`, `docs/active/render-transform-reuse-policy-p15-20260626/context.md`, `docs/active/render-transform-reuse-policy-p15-20260626/task.md`, `docs/active/_worktree_registry.md`.
   - Temporary: `node_modules` junction was created only for e2e access to the parent checkout dependencies and removed after e2e validation.
3. Diff summary:
   - `map_renderer.js` removes the local transform reuse constants and policy bodies, adds a lazy owner factory, and delegates the eight required wrapper functions.
   - The new owner contains the extracted constants, reuse enablement, transform delta, contextBase/contextScenario decision, and exact fast-path readiness logic.
   - Architecture checks now include the owner line budget, forbidden runtime/lifecycle tokens, exact fast-path required/excluded pass checks, and ownership-token checks.
4. Commit state: not committed yet; final code review returned clear and staged diff review remains before commit.
5. Base divergence: worktree starts at `origin/main@f00ae918cda4f8f4f813a7f2a1f3c183aa126b07`; parent checkout local `main@383a626a` remains behind remote and dirty with unrelated docs/archive and `lessons learned.md` WIP.
6. Overlap risk:
   - Yellow with future renderer owner/catalog and architecture-boundary work because `js/core/map_renderer.js`, `package.json`, and `tools/check_architecture_boundaries.mjs` are shared surfaces.
   - Green against the parent checkout docs/archive deletion WIP because this worktree did not edit those parent WIP files.
7. Validation:
   - `node --check js/core/renderer/render_transform_reuse_policy_owner.js`
   - `node --check js/core/map_renderer.js`
   - `node --check tests/render_transform_reuse_policy_owner_behavior.test.mjs`
   - `node --check tools/check_architecture_boundaries.mjs`
   - `npm run test:node:render-transform-reuse-policy-owner`
   - `npm run test:node:render-cache-owner`
   - `npm run test:node:render-pipeline-catalog`
   - `npm run test:node:exact-after-settle-pass-catalog`
   - `npm run test:node:exact-after-settle-refresh-plans`
   - `npm run test:node:render-pass-catalog`
   - `npm run test:node:render-invalidation-catalog`
   - `npm run test:node:renderer-host-inventory`
   - `npm run test:node:renderer-runtime-state-behavior`
   - `npm run test:node:render-transaction-diagnostics`
   - `npm run test:node:scenario-refresh-plans`
   - `npm run test:node:scenario-chunk-contracts`
   - `npm run verify:architecture-boundaries`
   - `npm run verify:state-write-allowlist`
   - `npm run verify:test-import-graph`
   - `npm run test:e2e:dev:tno-ready-state`
   - `npm run test:e2e:smoke`
   - `git diff --check`
8. Unverified risks: no separate browser visual inspection was run because P15 only moves policy ownership and requested e2e smoke/TNO gates passed. Smoke still reports known local auth 401 and unsafe water geometry warnings.
9. Recommended next step: commit the functional change, push the branch and `main`, archive the docs, update registry truth, push closeout, and clean this worktree.
10. Integrability: ready for integration, because the implementation is validated, scoped, reviewed, and based on latest `origin/main`.
