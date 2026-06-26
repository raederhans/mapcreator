# P17 Viewport Read-Model Owner Task

## Delivery Package

### Changes

- Extracted viewport read-model calculations from `map_renderer.js` into a pure owner.
- Kept existing renderer wrapper names so call sites stay stable.
- Preserved zoom, DOM, SVG/canvas, projection lifecycle, resize, and render side effects in `map_renderer.js`.
- Added focused owner behavior coverage and package script.
- Extended architecture boundary checks and updated the existing Python boundary contract.

### Files

- Core: `js/core/renderer/viewport_read_model_owner.js`, `js/core/map_renderer.js`.
- Tests: `tests/viewport_read_model_owner_behavior.test.mjs`, `tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`.
- Tooling: `tools/check_architecture_boundaries.mjs`, `package.json`.
- Docs: `docs/active/viewport-read-model-owner-p17-20260626/`.

### Diff Summary

- `map_renderer.js` removes inline read-model helper bodies and delegates to `createViewportReadModelOwner(...)`.
- New owner owns viewport/projection signatures, geo viewport bounds, pan extent, projected renderable content bounds, centered fit transform, and zoom percent.
- Architecture checks now enforce the owner boundary and renderer delegation.
- No changes to `dist/app/**`, `tools/eslint-rules/state-writer-allowlist.json`, or `js/core/map_renderer/public.js`.

### Commit State

- Ready to commit after final staging.

### Base Divergence

- Base is `origin/main@25df0b12905594fe4e6fd285cd3c3062c473796a`.
- Parent checkout is behind remote and has unrelated WIP.

### Conflict Risk

- Yellow: `js/core/map_renderer.js`, `tools/check_architecture_boundaries.mjs`, `package.json`, renderer owner tests.
- Green against parent docs/archive deletion WIP.

### Validation

- Syntax checks passed for changed JS/test/tooling files.
- Focused owner test passed 12/12.
- Dependent renderer owner/catalog/static suites passed: projected geometry bounds 12/12, transform reuse 7/7, render cache 6/6, render pipeline catalog 3/3, exact pass catalog 6/6, renderer host inventory 7/7, runtime state 10/10, render transaction diagnostics, scenario refresh 23/23, scenario chunk 57/57, canvas layer 4/4.
- Static gates passed: architecture boundaries, state-write allowlist, test import graph, Python render pipeline boundary 5/5, `git diff --check`.
- E2E gates passed: TNO ready-state 5/5 and smoke 4/4.
- E2E smoke retained known local auth 401 and D3 unsafe water geometry warnings while passing.

### Remaining Risk

- Yellow for future work touching viewport read-model, zoom wrappers, architecture boundary checks, and package scripts.
- Green against the parent checkout's unrelated `docs/archive/**` deletion WIP.

### Recommended Next Step

- Commit P17, push the branch and `origin/main`, archive this task folder, update registry, then clean the isolated worktree after confirming the branch is an ancestor of `origin/main`.
