# Task Record

## Delivery Package Draft

### Changes Made

- Added a regression that proves deferred infra restores full political state after the visual stage used only `GER`/`ITA`.
- Added a color-only regression that proves stale `colors` refreshes when `landData` already covers `GER`/`ITA`/`POL`/`FRA`.
- Split visible-subset readiness from complete political derived-state readiness.
- Added feature-id coverage guards so `POL`/`FRA` cannot disappear from stable `landData`/`colors` after chunk promotion.
- Added bounded diagnostics for partial political derived-state coverage.
- Updated Node/Python contracts and Pages dist mirrors.

### Files

- Core: `js/core/map_renderer/scenario_refresh_runtime.js`.
- Tests: `tests/scenario_refresh_plans_behavior.test.mjs`, `tests/scenario_chunk_contracts.test.mjs`, `tests/test_scenario_chunk_refresh_contracts.py`, `tests/test_map_renderer_spatial_index_runtime_orchestration_contract.py`.
- Docs: `docs/active/scenario-political-chunk-full-derived-state-20260622/plan.md`, `context.md`, `task.md`, `docs/active/_worktree_registry.md`, `lessons learned.md`.
- Dist: `dist/app/js/core/map_renderer/scenario_refresh_runtime.js`, `dist/app/js/core/data_service.js`, `dist/app/js/core/thematic_admin_metrics_loader.js`, `dist/pages-dist-manifest.json`.
- Temporary: none retained.

### Diff Summary

- `scenario_refresh_runtime` now records political coverage, separates visible and complete readiness, restores full political derived state from `scenarioPoliticalChunkData`, clears the transient visible subset, refreshes stale colors, and records diagnostics.
- Regression test simulates full political payload ids `GER`/`ITA`/`POL`/`FRA` with visible ids `GER`/`ITA`, then asserts full `landData` and `colors` after deferred infra.
- Static contracts assert the new readiness fields, restore path, diagnostics, and feature-id coverage behavior.
- Pages dist was regenerated. The dist generator also mirrored existing source-to-dist drift for `data_service` and `thematic_admin_metrics_loader`; no Thematic source/UI file was edited in this phase.

### Commit State

- Ready to commit from `main`; final review is CLEAR and staging is pending.

### Base Divergence

- Base commit: `6402153b1bb7f2c6ae1a472407a2305594815788`.
- Current `origin/main`: `6402153b1bb7f2c6ae1a472407a2305594815788`.
- Divergence: local working tree is ahead only by this phase-1 change set plus pre-existing unrelated local `data/i18n/manual_ui.json` edits, which are excluded from this task.

### Potential Overlap

- Only one worktree exists at task start.
- Hot shared paths: renderer runtime, scenario refresh contracts, scenario chunk contracts, Python boundary contracts, Pages dist mirrors.
- Direct path overlap with other active worktrees: none observed.

### Validation

- `node --check js/core/map_renderer/scenario_refresh_runtime.js`: pass.
- `npm run test:node:scenario-refresh-plans`: pass, 22/22.
- `npm run test:node:scenario-chunk-contracts`: pass, 55/55.
- `npm run test:node:scenario-chunk-promotion-helpers`: pass, 9/9.
- `npm run test:node:scenario-lifecycle-runtime-behavior`: pass, 12/12.
- `npm run test:node:scenario-runtime-state-behavior`: pass, 6/6.
- `npm run test:node:render-transaction-diagnostics`: pass, 21/21.
- `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_political_collection_boundary_contract tests.test_map_renderer_spatial_index_runtime_orchestration_contract -q`: pass, 48/48.
- `node node_modules/@playwright/test/cli.js test tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js --grep "tno post-edit keeps political detail fill" --workers=1 --retries=0`: pass, 1/1.
- `npm run verify:pages-dist`: pass, Pages startup shell 39/39 and landing showcase 8/8.

### Risks

- Full browser smoke still has an unrelated Phase 2 runtime color coverage failure for country/base-color keys `CF`, `CG`, `CM`, `CY`, `EH`, `GA`, `MT`, `TW`, and `VA`.
- 1936/1939 Red Sea is out of scope for Phase 1.
- Generated dist includes existing non-renderer dist drift; source Thematic/UI files remain untouched.

### Recommended Integration

- Current task runs directly on `main`. After final review and `git diff --check`, stage the phase-1 files, commit with Lore trailers, and push `main`.
