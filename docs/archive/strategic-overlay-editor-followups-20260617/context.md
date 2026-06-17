# Strategic Overlay Editor Followups Context

Last updated: 2026-06-17

## Start State

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator`
- Branch: `codex/strategic-overlay-editor-followups`
- Base: `main@ee42ba98`
- `main` and `origin/main` were synchronized before branch creation.
- Live test/build owner: main Codex agent only.

## Guidance Read

- `lessons learned.md`
- `docs/shared/agent-tiers.md`
- `docs/active/_worktree_registry.md`
- `docs/archive/strategic-overlay-render-owner-20260617/`
- `docs/archive/strategic-overlay-cleanup-followups-20260617/`

## Initial Findings

- Operation Graphic vertex drag already moved into `operation_graphics_runtime_domain.js`.
- Operation Graphic midpoint insertion still commits `insert-operation-graphic-vertex` directly in `map_renderer.js`.
- Special Zone membership click and drag still commit `special-zone-membership-*` history directly in `map_renderer.js`.
- Runtime owner already has access to history, dirty, render, and UI refresh helpers needed to own these transactions.
- Dependency Spike must stay report-only and keep production dependencies unchanged.

## Implementation Notes

- Added `insertOperationGraphicVertex(insertIndex, coord)` to `operation_graphics_runtime_domain.js`.
- Moved Operation Graphic midpoint insertion history, dirty state, selected vertex sync, UI refresh, and render refresh into the runtime domain.
- Added Special Zone membership click and drag-session APIs to `strategic_overlay_runtime_owner.js`.
- Kept `map_renderer.js` responsible for D3 event binding, hit extraction, feature id validation, cursor/render orchestration, and facade calls.
- Preserved Special Zone drag behavior split: click uses `toggle`/`replace`/brush mode; non-brush drag uses `add` or `remove` from Alt.
- Synced `dist/app` and `dist/pages-dist-manifest.json` through `verify:pages-dist`.

## Dependency Spike Result

- Production dependencies remain unchanged.
- `simplify-js` is a small future RDP candidate, but current coastline simplification also depends on local effective-area and latitude-adjusted logic.
- `rbush` and `flatbush` are plausible spatial-index candidates, but current grid query carries local semantics for draw order, globals, overflow, and stats.
- Recommended next step is extracting local helper contracts before any package import.

## Live Process Ownership

- Main Codex agent owns all test/build commands.
- No child agent owns or monitors live processes.

## Validation

- `node --test tests/strategic_overlay_runtime_owner_behavior.test.mjs tests/strategic_overlay_render_owner_behavior.test.mjs`: passed, 19 tests.
- `py -3 -m unittest tests.test_map_renderer_strategic_overlay_runtime_owner_boundary_contract tests.test_map_renderer_strategic_overlay_render_owner_boundary_contract -q`: passed, 4 tests.
- `node --check js/core/map_renderer.js js/core/renderer/strategic_overlay_runtime_owner.js js/core/renderer/strategic_overlay_runtime/operation_graphics_runtime_domain.js`: passed.
- `npm run test:node:renderer-splits`: passed, 46 tests.
- `git diff --check`: passed with Windows line-ending warnings only.
- `cmd /c "set PATH=C:\Users\raede\AppData\Local\hermes\hermes-agent\venv\Scripts;%PATH%&& npm run verify:pages-dist"`: passed; Pages startup shell 37 tests, landing showcase 6 tests.

## Review Notes

- Self-review found a drag-mode regression risk: non-brush Shift drag must keep using `add`, while click keeps using `toggle`.
- Fixed by separating Special Zone membership click-mode and drag-mode resolution, then adding a regression assertion for non-brush drag add.
- Residual scan found no renderer-side `insert-operation-graphic-vertex` transaction strings and no renderer-side `special-zone-membership-*` history/dirty transaction strings in source or dist.
