# Layer Observability and Interaction Stability Context

## 2026-06-21

- Created worktree `C:\Users\raede\Desktop\dev\mapcreator-layer-observability` on branch `codex/layer-observability-stability-20260621`.
- Base commit: `origin/main@8e79ea0cebb3a44d89247dc6094baca9f25b22c9`.
- Parent checkout is dirty with docs/archive WIP and local `lessons learned.md`; parent was left untouched.
- Existing `mapcreator-stage5-visual-acceptance` worktree is dirty and touches `package.json`, `tests/e2e/test-import-graph.json`, `js/core/scenario_chunk_manager.js`, and stage5 docs.
- Root cause evidence:
  - `js/ui/toolbar.js` `renderDirty` calls `markDirty(reason)` and then `render()` immediately.
  - `js/ui/toolbar/transport_appearance_controller.js` batches only `renderTransportAppearanceUi()` via requestAnimationFrame; it still calls `renderDirty(...)` immediately.
  - Appearance owners call the injected `renderDirty` on high-frequency `input` events.
- State evidence:
  - Layer visibility defaults live in `js/core/state/ui_state.js`.
  - Optional/context data fields live in `js/core/state/content_state.js`.
  - Transport overview support lives in `js/core/transport_capability_registry.js`.
  - Transport family summary count logic already exists in `js/ui/toolbar/appearance_transport_summary.js`.

## Live Process Ownership

- Main Codex agent owns all live commands.
- Subagents are limited to static mapping and final independent review.

## Implementation Notes

- Added pure diagnostics in `js/ui/toolbar/layer_status_diagnostics.js`.
- Added frame-level render coalescing in `js/ui/toolbar/toolbar_render_scheduler.js`.
- Wired status strips into existing Appearance and Map Content panel anchors in `js/ui/toolbar/appearance_controls_controller.js`.
- Kept visual defaults and renderer data/schema contracts unchanged.
- Transport master now exposes the specific `enabled + no overview family selected` state.
- Unsupported overview families now surface the existing registry reason as workbench-only status text.

## Validation Evidence

- Code review finding fixed: the first scheduler draft batched dirty marking itself; the final implementation keeps every `markDirty(...)` synchronous and batches only the downstream render request for high-frequency controls.
- Architect review WATCH item narrowed: batching is limited to high-frequency slider/input reasons through `shouldBatchToolbarRenderReason(...)`; discrete toggles, preset actions, mode selects, and transport family selection still render immediately.
- Residual architecture note: `layer_status_diagnostics.js` intentionally centralizes Phase 1 status text in one pure module, with separate exported builders for transport, bathymetry, texture, day/night, and layer groups.
- Passed `npm run test:node:toolbar-render-scheduler` after adding the synchronous fallback recovery case and dirty-vs-render batching coverage.
- Passed `npm run test:node:layer-status-diagnostics` with coverage for visible/loaded counts, bathymetry states, transport master state, and workbench-only families including `industrial_zones`.
- Passed syntax checks for modified toolbar modules.
- Passed `npm run test:node:appearance-texture-owner`, `npm run test:node:appearance-presets`, `npm run test:node:transport-appearance-controller`, `npm run test:node:ocean-depth-layer-contracts`, `npm run test:node:ocean-render-owner`, `npm run test:node:appearance-city-points-owner`, `npm run test:node:appearance-physical-owner`, `npm run test:node:appearance-rivers-owner`, `npm run test:node:appearance-border-owner`, and `npm run test:node:appearance-parent-border-owner`.
- Passed `npm run verify:toolbar-split-boundary`: 52 tests.
- Passed `npm run verify:test-import-graph`.
- Passed `npm run verify:pages-dist`: dist build, 38 startup shell tests, and 8 landing showcase tests.
- `npm run verify:architecture-boundaries` still fails on base file `js/core/map_renderer.js` line budget: 24,154 lines vs 24,100 budget.
- `npm run verify:state-write-allowlist` still fails on pre-existing direct state-write allowlist drift outside this diff.

## Integration Notes

- Direct overlap with `mapcreator-stage5-visual-acceptance`: both worktrees edit `package.json` and `docs/active/_worktree_registry.md`.
- Direct overlap with Stage5 after current checks: `package.json`, `dist/pages-dist-manifest.json`, and `docs/active/_worktree_registry.md`.
- Semantic overlap with Stage5 is low for runtime behavior: this branch changes toolbar diagnostics/scheduling; Stage5 changes scenario chunk visual acceptance.
- Recommended action after final review: commit this branch and leave it `ready-for-integration`; integrate one worktree at a time. Lower-risk order is this branch first, then rebase Stage5 before its merge.
