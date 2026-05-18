# Political Viewport Scale Color Loss Context

## 2026-05-18 Start

- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-political-viewport-color-loss`
- Branch: `codex/political-viewport-color-loss`
- Active workflow: `$ultragoal` with one aggregate story, plus `$ultrawork` static lanes.
- Live process owner: main thread only.
- External research used: WHATWG/MDN canvas sizing behavior confirms width/height changes clear/reset the canvas bitmap/context.

## Current Evidence

- Prior color authority work made `state.colors` viewport-independent, so this wave treats the color table as a preserved contract.
- `setRenderPhase()` passes a narrow DPR-change pass list to `setCanvasSize()`.
- `setCanvasSize()` currently defaults actual canvas resize to all render passes when `targetPassesOnCanvasResize` is omitted.
- Scenario political background entries are built through a path that calls `pathBoundsInScreen()` before caching.

## Active Agents

- Main thread: implementation, live tests, final verification.
- Static resize/cache lane: read-only code mapping.
- Static test lane: read-only coverage mapping.

## 2026-05-18 Implementation Notes

- `setCanvasSize()` now derives `canvasResizePasses` from the pass list that will be invalidated for the current size/DPR change unless the caller explicitly provides `targetPassesOnCanvasResize`.
- `applyExactAfterSettleRefreshPlan()` still controls its own pass list and continues to exclude `political`.
- `buildScenarioPoliticalBackgroundEntries()` no longer filters full cached entries through `pathBoundsInScreen()`. Screen-rect filtering remains in `drawScenarioPoliticalBackgroundFills()`.

## 2026-05-18 Verification

- `node --check js/core/map_renderer.js` passed.
- `node --check js/core/renderer/render_cache_owner.js` passed.
- `npm run test:node:scenario-chunk-contracts` passed: 29 tests.
- `npm run test:node:physical-layer-contracts` passed: 2 tests.
- `npm run test:node:renderer-runtime-state-behavior` passed: 6 tests.
- `python -m unittest tests.test_map_renderer_render_cache_owner_boundary_contract tests.test_renderer_runtime_state_boundary_contract -q` passed: 5 tests.
- `git diff --check` passed; only expected CRLF conversion warnings were printed.

## Cleanup Pass

- Scope: changed renderer and contract test files only.
- Fallback-like findings: no new fallback, retry, recovery, or workaround branch was introduced.
- Cleanup decision: no extra refactor; the current diff is smaller and keeps the planned behavior boundary.

## Final Review

- Code-review lane: APPROVE, 0 critical/high/medium/low findings.
- Architect lane: CLEAR, merge-ready from architecture boundary.
- `lessons learned.md` checked; no new major lesson added because the canvas lifecycle baseline lesson already exists.

## Merge Closure

- Worktree commit: `40f4f6b Keep political rendering stable across viewport changes`.
- Main merge commit: `6ba3290 Merge political viewport color stability fix`.
- Post-merge checks on `main` passed: `node --check js/core/map_renderer.js`, `npm run test:node:scenario-chunk-contracts`, and the Python boundary unittest.
