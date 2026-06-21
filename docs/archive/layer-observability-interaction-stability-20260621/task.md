# Layer Observability and Interaction Stability Task

## Current Status

Integrated after Stage 5 and archived.

## Changed Files

Core files:
- `js/ui/toolbar/layer_status_diagnostics.js`
- `js/ui/toolbar/toolbar_render_scheduler.js`
- `js/ui/toolbar/appearance_controls_controller.js`
- `js/ui/toolbar/appearance_texture_owner.js`
- `js/ui/toolbar/ocean_lake_controls_controller.js`
- `js/ui/toolbar.js`
- `css/style.css`
- `package.json`

Tests:
- `tests/layer_status_diagnostics_behavior.test.mjs`
- `tests/toolbar_render_scheduler_behavior.test.mjs`
- `tests/appearance_texture_owner_behavior.test.mjs`
- `tests/test_toolbar_split_boundary_contract.py`

Docs:
- `docs/archive/layer-observability-interaction-stability-20260621/plan.md`
- `docs/archive/layer-observability-interaction-stability-20260621/context.md`
- `docs/archive/layer-observability-interaction-stability-20260621/task.md`
- `docs/active/_worktree_registry.md`

Generated dist mirrors:
- `dist/app/css/style.css`
- `dist/app/js/ui/toolbar.js`
- `dist/app/js/ui/toolbar/appearance_controls_controller.js`
- `dist/app/js/ui/toolbar/appearance_texture_owner.js`
- `dist/app/js/ui/toolbar/ocean_lake_controls_controller.js`
- `dist/app/js/ui/toolbar/layer_status_diagnostics.js`
- `dist/app/js/ui/toolbar/toolbar_render_scheduler.js`
- `dist/pages-dist-manifest.json`

## Validation

- Passed `npm run test:node:layer-status-diagnostics`: 5 tests.
- Passed `npm run test:node:toolbar-render-scheduler`: 7 tests.
- Passed `npm run test:node:appearance-texture-owner`: 12 tests.
- Passed `npm run test:node:appearance-presets`: 10 tests.
- Passed `npm run verify:toolbar-split-boundary`: 52 tests.
- Passed `npm run test:node:transport-appearance-controller`: 3 tests.
- Passed `npm run test:node:ocean-depth-layer-contracts`: 3 tests.
- Passed `npm run test:node:ocean-render-owner`: 6 tests.
- Passed `npm run test:node:appearance-city-points-owner`: 6 tests.
- Passed `npm run test:node:appearance-physical-owner`: 7 tests.
- Passed `npm run test:node:appearance-rivers-owner`: 4 tests.
- Passed `npm run test:node:appearance-border-owner`: 3 tests.
- Passed `npm run test:node:appearance-parent-border-owner`: 6 tests.
- Passed `npm run verify:test-import-graph`: 49 specs indexed during final integration.
- Passed `npm run verify:pages-dist`: dist build, 38 startup shell tests, 8 landing showcase tests.
- Passed `git diff --check` and `git diff --check --cached`.
- Passed syntax checks for modified toolbar modules.
- `npm run verify:architecture-boundaries` remains blocked by base line-budget drift in `js/core/map_renderer.js`: 24,154 lines vs 24,100 budget. The same failure reproduces on clean `origin/main@c8f4f24f`.
- `npm run verify:state-write-allowlist` remains blocked by pre-existing direct state-write files outside this diff. The same failure reproduces on clean `origin/main@c8f4f24f`.

## Delivery Package

1. What changed:
   - Added read-only layer status diagnostics for Appearance and Map Content panels using existing runtime state, render metrics, and transport registry support metadata.
   - Added concise status strips for layer groups, bathymetry, texture, day/night, transport master, supported transport overview families, and workbench-only transport families.
   - Added a toolbar render scheduler that batches only high-frequency slider/input render requests while preserving synchronous dirty marking for every edit.
   - Wired ocean bathymetry debug count refresh back into the Appearance status summaries.
   - Mirrored source changes into Pages dist and added focused test entrypoints.

2. Diff summary:
   - Adds two toolbar helper modules and two focused Node behavior suites.
   - Extends `appearance_controls_controller.js` with status rendering and dirty-vs-render scheduling.
   - Extends existing owner and boundary tests to cover the new reason names and controller injection shape.
   - Updates `package.json` scripts for the new test entrypoints.
   - Updates dist mirrors through `verify:pages-dist`.

3. Commit state:
   - Branch: `codex/layer-observability-stability-20260621`.
   - Base: `origin/main@8e79ea0cebb3a44d89247dc6094baca9f25b22c9`.
   - Feature commit: `5f4b78ab17ae332cacdae0cd6877023827cdb9b2`.
   - Integrated after `origin/main@c8f4f24f`.

4. Base/main divergence:
   - Feature worktree diverges from `origin/main@8e79ea0cebb3a44d89247dc6094baca9f25b22c9` by the current branch HEAD commit.
   - Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` is `main@29c008f7` and behind `origin/main` by 6 commits, with unrelated docs/archive WIP and local file-status noise.

5. Worktree overlap:
   - Direct overlap with `C:\Users\raede\Desktop\dev\mapcreator-stage5-visual-acceptance`: `package.json`, `dist/pages-dist-manifest.json`, and `docs/active/_worktree_registry.md`.
   - Stage5 also changes `js/core/scenario_chunk_manager.js`, e2e specs, scenario chunk contracts, and state-write allowlist; this branch changes toolbar Appearance/Ocean/Transport UI paths.
   - Risk rating after integration: green for the resolved Stage5 overlap, yellow for future nearby validation gates.

6. Unverified risks:
   - Browser visual inspection was intentionally skipped because this task could be validated through code and tool tests.
   - The diagnostics module is a Phase 1 central read-only fan-in; future growth should split by owner when status logic becomes stateful or renderer-facing.
   - Global architecture/state-write gates have base failures that still need their own repair branch.

7. Recommended next step:
   - Push the merged integration branch to `origin/main`.
   - Remove temporary worktrees after the push succeeds, preserving recovery via main history and feature commit `5f4b78ab17ae332cacdae0cd6877023827cdb9b2`.
