# P19 Viewport Command Owner Task

## Delivery Package Draft

### Changes

- Extract viewport zoom command wrappers from `map_renderer.js` into `viewport_command_owner.js`.
- Keep host wrapper names stable for existing call sites.
- Keep `runtimeState.zoomTransform` writes in the renderer host through an injected effect.
- Add focused owner behavior coverage and package script.
- Extend architecture boundary checks for the new owner and renderer delegation.

### Files

- Core: `js/core/renderer/viewport_command_owner.js`, `js/core/map_renderer.js`.
- Tests: `tests/viewport_command_owner_behavior.test.mjs`.
- Tooling: `tools/check_architecture_boundaries.mjs`, `package.json`.
- Docs: `docs/archive/viewport-command-owner-p19-20260626/`, `docs/active/_worktree_registry.md`.

### Diff Summary

- `map_renderer.js` imports `createViewportCommandOwner`, creates a lazy singleton, injects host getters/effects, and delegates `updateZoomTranslateExtent`, `resetZoomToFit`, `zoomByStep`, `setZoomPercent`, and `enforceZoomConstraints`.
- New owner owns scale/translate extent update, reset-to-fit command dispatch, step zoom, percent zoom, and constraint nudge.
- Architecture checks now require the owner and forbid the extracted command side-effect snippets from returning to `map_renderer.js`.
- No intended changes to `dist/app/**`, `tools/eslint-rules/state-writer-allowlist.json`, or `js/core/map_renderer/public.js`.

### Commit State

- Functional change exists on the current branch HEAD after rebase. Final push, archive, and cleanup remain.

### Base Divergence

- Original base was `origin/main@07bafc248eb5861789785b25fbe719466b7f0b9b`.
- Current base after rebase is `origin/main@7e72eddf811a064347c15ec0b98f70744f41ba72`.
- Parent checkout is behind remote and has unrelated WIP.

### Conflict Risk

- Yellow/red with future renderer extraction lanes touching `js/core/map_renderer.js`, `tools/check_architecture_boundaries.mjs`, `package.json`, or viewport owner tests.
- Green against parent `docs/archive/**` deletion WIP.
- Green against the integrated audit bridge fix; the only rebase conflict was registry documentation.

### Validation

- Initial syntax checks passed for owner, test, renderer, and architecture tool.
- New owner behavior test passed 8/8.
- Architecture boundary gate passed.
- Owner side-effect token scan returned no matches.
- Full post-rebase non-E2E matrix passed from `.runtime/tests/p19-non-e2e-post-rebase-20260626T152712Z.log`: viewport read-model 12/12, scenario water cache policy 7/7, projected geometry bounds 12/12, transform reuse 7/7, render cache 6/6, renderer host inventory 7/7, runtime state 10/10, render transaction diagnostics 21/21, scenario refresh 24/24, scenario chunk contracts 57/57, state-write allowlist 115 tracked files, and import graph 49 specs.
- Post-rebase E2E passed: `test:e2e:dev:tno-ready-state` 5/5 from `.runtime/tests/p19-e2e-ready-state-post-rebase-20260626T152732Z.log` and `test:e2e:smoke` 4/4 from `.runtime/tests/p19-e2e-smoke-post-rebase-20260626T152905Z.log`.
- `git diff --check` passed with LF/CRLF warnings only.
- Forbidden-path scan found no changes to `dist/app/**`, `tools/eslint-rules/state-writer-allowlist.json`, or `js/core/map_renderer/public.js`.

### Remaining Risk

- Final code-review finding was fixed: architecture boundaries now forbid the old reset `globalThis.d3.select(interactionRect.node()).call(zoomBehavior.transform, transform);` snippet from returning to `map_renderer.js`.
- Yellow for future work touching viewport command wrappers, architecture boundary checks, package scripts, or the shared renderer host file.

### Recommended Next Step

- Push this archive/registry closeout, then clean this isolated worktree after remote confirmation.
