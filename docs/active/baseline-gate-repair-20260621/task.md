# Baseline Gate Repair 2026-06-21 Task

## Checklist

- [x] Confirm `origin/main` and parent checkout state.
- [x] Reproduce A1 architecture boundary failure.
- [x] Identify focused owner extraction for `map_renderer.js`.
- [x] Run A1 validation commands.
- [ ] Commit and push A1 branch.
- [ ] Continue A2 state-write allowlist repair.

## A1 Delivery Notes

1. Extracted existing canvas color parsing/safety/mixing helpers from `js/core/map_renderer.js` into `js/core/renderer/canvas_color_helpers.js`.
2. Kept `map_renderer.js` as the renderer facade/caller and reduced it from 24154 lines to 24093 lines.
3. Strengthened `tools/check_architecture_boundaries.mjs` so the new helper owner is required, import direction stays one-way, and the helpers cannot drift back into `map_renderer.js`.
4. Extended `tests/test_map_renderer_color_resolution_strategy_boundary_contract.py` for the canvas color helper owner boundary.
5. Rebuilt Pages dist so `dist/app/js/core/map_renderer.js`, `dist/app/js/core/renderer/canvas_color_helpers.js`, and `dist/pages-dist-manifest.json` match source.

### Files

Core files:

- `js/core/map_renderer.js`
- `js/core/renderer/canvas_color_helpers.js`
- `tools/check_architecture_boundaries.mjs`

Test files:

- `tests/test_map_renderer_color_resolution_strategy_boundary_contract.py`

Generated publish files:

- `dist/app/js/core/map_renderer.js`
- `dist/app/js/core/renderer/canvas_color_helpers.js`
- `dist/pages-dist-manifest.json`

Documentation files:

- `docs/active/baseline-gate-repair-20260621/context.md`
- `docs/active/baseline-gate-repair-20260621/plan.md`
- `docs/active/baseline-gate-repair-20260621/task.md`

### Diff Summary

- `map_renderer.js` now imports canvas color helper functions from a dedicated renderer owner.
- The pure helper implementation moved without changing call sites or color behavior.
- Architecture checks now fail if the helper owner disappears, imports `map_renderer.js`, or the helper bodies return to `map_renderer.js`.

### Commit Status

- A1 worktree has not been committed yet because Stage A1 verification was still being recorded when this note was written.
- Base commit is `origin/main@1a52603de0be04d798a9e71d50788b9ff5e3c2e2`.
- Parent checkout `main` is older and dirty; Stage B will back it up and sync after Stage A repairs.

### Overlap / Integration Risk

- Shared hotspot: `js/core/map_renderer.js`, `tools/check_architecture_boundaries.mjs`, Pages dist.
- Direct file overlap with later Stage C is possible because Stage C may also touch renderer/toolbar wiring. Recommended order remains A1, A2, Stage B sync, then Stage C.

### Verification

- `node --check js/core/map_renderer.js` - passed.
- `node --check js/core/renderer/canvas_color_helpers.js` - passed.
- `npm run verify:architecture-boundaries` - passed.
- `npm run python -- -m unittest tests.test_map_renderer_color_resolution_strategy_boundary_contract -q` - passed, 2 tests.
- `npm run verify:test-import-graph` - passed, wrote import graph for 49 specs.
- `npm run test:node:scenario-chunk-contracts` - passed, 55 tests.
- `npm run test:node:renderer-runtime-state-behavior` - passed, 10 tests.
- `npm run test:node:render-transaction-diagnostics` - passed, 21 tests.
- `npm run verify:pages-dist` - passed, including 38 startup shell unittest tests and 8 landing showcase Node tests.
- `git diff --check` - passed.

### Remaining Risk

- A2 `verify:state-write-allowlist` has not been repaired yet.
- Stage C work must be rebased after both baseline gates are green.

### Recommended Next Step

Commit A1, checkpoint G038-G069, then start A2 from the A1 branch or a second branch based on A1 so the state-write repair sees the fixed architecture baseline.
