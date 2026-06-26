# P20 Viewport Resize Lifecycle Owner Task

## Delivery Package

### What Changed

- Added `createViewportResizeLifecycleOwner(...)` to own resize observer, resize RAF/timer coalescing, DPR media listener rebinding, visualViewport listener binding, and deferred spatial refresh scheduling.
- Rewired `map_renderer.js` resize/DPR wrapper functions to delegate to the owner through injected host effects.
- Added pure Node owner behavior coverage, including DPR coalescing, container debounce, observer binding, visualViewport scheduling, interactive resize, spatial refresh, and `dispose()` cleanup.
- Extended architecture boundaries and verification selector routing for the new owner.
- Updated the source boundary contract while keeping `dist/app/**`, the state-write allowlist, and `js/core/map_renderer/public.js` untouched.

### Files

- Core:
  - `js/core/renderer/viewport_resize_lifecycle_owner.js`
  - `js/core/map_renderer.js`
- Tests:
  - `tests/viewport_resize_lifecycle_owner_behavior.test.mjs`
  - `tests/test_frontend_render_boundary_contract.py`
- Tooling/docs:
  - `tools/check_architecture_boundaries.mjs`
  - `tools/test_route_registry.mjs`
  - `package.json`
  - `docs/active/_worktree_registry.md`
  - `docs/active/viewport-resize-lifecycle-owner-p20-20260626/plan.md`
  - `docs/active/viewport-resize-lifecycle-owner-p20-20260626/context.md`
  - `docs/active/viewport-resize-lifecycle-owner-p20-20260626/task.md`
- Temporary files:
  - Ignored local `node_modules` junction in the isolated worktree for E2E dependency access.

### Diff Summary

- `map_renderer.js`: old resize/DPR lifecycle state and scheduling logic removed from host; wrapper names now delegate to a singleton owner.
- New owner: 311 lines, under the architecture boundary budget of 360 lines.
- New owner test: 12 Node tests covering scheduling, observers, DPR refresh, interactive resize, spatial refresh, and disposal.
- Tooling: architecture boundary owner tokens and selector source refs updated.
- Package script: adds `test:node:viewport-resize-lifecycle-owner`.

### Commit State

- Functional changes are ready to commit from branch `codex/viewport-resize-lifecycle-owner-p20-20260626`.
- New owner and test files must be staged with the tracked changes before commit.

### Base Divergence

- Base and remote at start: `origin/main@d2171b5fec0f78557736bf456416c1691925e204`.
- Parent checkout local `main@383a626a` is behind remote and dirty; it is preserved.
- This P20 branch is based on the latest P19 closeout remote baseline and has not been rebased after implementation.

### Overlap Risk

- Yellow hot paths: `js/core/map_renderer.js`, `tools/check_architecture_boundaries.mjs`, `tools/test_route_registry.mjs`, `package.json`.
- Green paths by explicit constraint: `dist/app/**`, `tools/eslint-rules/state-writer-allowlist.json`, and `js/core/map_renderer/public.js`.
- Green against parent checkout production code; parent WIP is docs/archive cleanup plus `lessons learned.md`.

### Verification

- Syntax/static: `node --check` passed for owner, renderer, owner test, architecture checker, and route registry.
- Focused owner tests: `npm run test:node:viewport-resize-lifecycle-owner` passed 12/12.
- Renderer owner regression set: viewport command 8/8, viewport read-model 12/12, scenario water cache 7/7, projected bounds 12/12, transform reuse 7/7, render cache 6/6, host inventory 7/7, runtime state 10/10, diagnostics 21/21, scenario refresh 24/24, scenario chunk contracts 57/57.
- Boundaries/routing: architecture boundaries, state-write allowlist, test import graph, frontend boundary contract, e2e structural tooling, selector schema, and selector explain all passed.
- E2E: TNO ready-state 5/5 and smoke 4/4 passed.
- Final scans: forbidden changed-path scan clear, owner forbidden token scan clear, and `git diff --check` passed with CRLF working-copy warnings only.

### Remaining Risks

- `dist/app/**` still contains the previous generated bundle by design for P20; Pages dist regeneration is a downstream gate.
- E2E smoke continues to show the known local auth 401 and D3 unsafe water geometry warnings for `marine_arctic_ocean` and `marine_southern_ocean`.

### Recommended Next Step

- Commit this worktree, push the branch, fast-forward `origin/main`, archive the P20 docs, update registry status to integrated, then remove the isolated worktree.
- Integration recommendation: merge/fast-forward as-is; no rebase is needed because the branch was created from current P19 closeout `origin/main`.
