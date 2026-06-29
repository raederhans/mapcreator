# Scenario Forge Renderer P33 Task

## Checklist

- [x] Create/update isolated worktree from current `origin/main`.
- [x] Confirm required files with `rg --files`.
- [x] Record plan and context under `docs/active/renderer-surface-runtime-bridge-p33-20260629/`.
- [x] Export `applyRendererSurfaceBridgeState` from `renderer_runtime_state.js`.
- [x] Replace direct `initMap` bridge writes with one state op call.
- [x] Add behavior test and package script.
- [x] Update lifecycle inventory and architecture boundary checks.
- [x] Sync `dist/app/**` and manifest through Pages dist gate.
- [x] Run required validation commands.
- [x] Run independent code-review and QA/self-check.
- [x] Commit and rebase over current `origin/main`.
- [x] Push functional commit to `main`.
- [x] Archive P33 docs during closeout.
- [ ] Clean the P33 worktree after closeout push.

## Delivery Package

1. Changed runtime behavior: `initMap` now calls `applyRendererSurfaceBridgeState(runtimeState, handles)` once instead of directly writing surface bridge fields.
2. Changed state owner: `renderer_runtime_state.js` owns the mapping from raw surface handles to `runtimeState` bridge fields, including `lineCanvas` and `lineCtx` reset to `null`.
3. Changed contracts: behavior test, surface lifecycle inventory, Python boundary contract, and architecture boundary check now lock the helper export/call/order and reject old direct writes.
4. Changed scripts: `package.json` exposes `test:node:renderer-surface-runtime-bridge-state`.
5. Changed dist: Pages dist mirrors and `dist/pages-dist-manifest.json` were regenerated.

Core files:
- `js/core/state/renderer_runtime_state.js`
- `js/core/map_renderer.js`
- `dist/app/js/core/state/renderer_runtime_state.js`
- `dist/app/js/core/map_renderer.js`

Test files:
- `tests/renderer_surface_runtime_bridge_state_behavior.test.mjs`
- `tests/renderer_surface_lifecycle_inventory_boundary.test.mjs`
- `tests/test_renderer_runtime_state_boundary_contract.py`

Tooling/docs/generated files:
- `tools/check_architecture_boundaries.mjs`
- `package.json`
- `dist/pages-dist-manifest.json`
- `docs/active/renderer-surface-runtime-bridge-p33-20260629/`

Diff summary before final rebase:
- Source/tests/tools: 6 files changed, 158 insertions, 17 deletions, plus one new behavior test and task docs.
- Dist: 3 generated files changed, 31 insertions, 13 deletions.

Commit status:
- Functional commit `882fff6c` is pushed to `origin/main`; this closeout commit archives docs and records cleanup.

Base divergence:
- Worktree implemented on `origin/main@2f78a9cffda64ea69378b789a735f7aa1ae8c426`.
- Rebased over current `origin/main@4a5c1e34`; the only conflict was generated `dist/pages-dist-manifest.json`, resolved by rerunning `tools/build_pages_dist.py`.

Potential conflicts:
- Red only for future edits to `js/core/map_renderer.js`, `js/core/state/renderer_runtime_state.js`, architecture boundary, lifecycle inventory, package scripts, or the matching dist mirrors.
- Green against the latest remote diagnostics/perf commit by path.

Validation passed:
- `node --check js/core/state/renderer_runtime_state.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/renderer_surface_runtime_bridge_state_behavior.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `npm run test:node:renderer-surface-runtime-bridge-state`
- `npm run test:node:renderer-surface-lifecycle-inventory`
- `npm run test:node:renderer-surface-lifecycle`
- `npm run test:node:renderer-fit-projection-lifecycle`
- `npm run test:node:renderer-runtime-state-behavior`
- `npm run python -- -m unittest tests.test_renderer_runtime_state_boundary_contract -q`
- `npm run python -- -m unittest tests.test_map_renderer_spatial_index_runtime_owner_boundary_contract -q`
- `npm run verify:architecture-boundaries`
- `npm run verify:state-write-allowlist`
- `npm run verify:test-import-graph`
- `git diff --check`
- `npm run verify:pages-dist`
- `npm run verify:dist-drift`

Review passed:
- Code reviewer: no findings.
- Architect: `Architectural Status: CLEAR`, `verdict: approve`.

Remaining risk:
- Worktree cleanup follows after the closeout commit is pushed.

Recommended next action:
- Push the closeout commit, verify remote contains it, then remove the P33 worktree.
