# UI Palette Startup Integration Plan

## Classification

- Task level: integration.
- Base: `origin/main@15941a7dbe54655fbc79c28932159e9d8c47723c`.
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-ui-palette-startup-integration-20260624`.
- Branch: `codex/ui-palette-startup-integration-20260624`.

## Goal

Safely migrate the preserved parent checkout UI/palette/startup WIP onto the renderer-stable baseline without changing renderer behavior.

## Boundaries

- Parent checkout stays read-only: no pull, merge, rebase, commit, or edits.
- Production renderer behavior stays unchanged unless a new regression is reproduced.
- Dist and Pages output are regenerated from integrated source.
- Phase 1/2A/2B/2C renderer contracts stay as sentinels.

## WIP Inventory and Strategy

| Group | Files | Strategy |
| --- | --- | --- |
| A UI shell / toolbar / palette source | `css/style.css`, `data/locales.json`, `js/core/i18n_catalog.js`, `js/ui/sidebar/country_inspector_controller.js`, `js/ui/toolbar/appearance_controls_controller.js`, `js/ui/toolbar/layer_status_diagnostics.js`, `js/ui/toolbar/palette_library_panel.js`, `js/ui/toolbar/thematic_layer_preview_controller.js`, `js/ui/styled_selects.js` | migrate manually |
| B startup behavior | `js/main.js`, `js/bootstrap/ui_shell_debug_seed.js`, `tests/test_main_startup_data_pipeline_boundary_contract.py`, `tests/test_startup_shell.py` | migrate manually, with `js/main.js` reviewed as the shared integration point |
| C tests and support | `tests/country_inspector_controller_behavior.test.mjs`, `tests/e2e/ui_rework_support_transport_hardening.spec.js`, `tests/palette_library_panel_grouping.test.mjs`, `tests/test_ui_rework_plan01_foundation_contract.py`, `tests/test_ui_rework_plan02_mainline_contract.py`, `tests/test_ui_rework_plan03_support_transport_contract.py` | migrate manually |
| D package/scripts | none | no-op |
| E docs/registry/lessons | `docs/active/_worktree_registry.md`, `lessons learned.md` | migrate manually, rewritten against current main truth |
| F generated dist/pages | `dist/app/**` mirrors and manifest | regenerate |

## Execution Order

1. Register integration worktree and active docs.
2. Apply source-only WIP in small groups, excluding `dist/`.
3. Add new source modules.
4. Run syntax/import checks after source migration.
5. Migrate focused tests and support contracts.
6. Run focused UI/palette/startup tests.
7. Regenerate dist/pages mirrors through project build gate.
8. Run renderer sentinels.
9. Run final review, commit split, push, archive docs, and clean worktree.

## Acceptance Gates

- UI/palette/toolbar Node tests pass.
- Startup shell Python tests pass.
- Import graph / architecture boundary / state-write allowlist pass when applicable.
- `npm run verify:pages-dist` passes and dist is regenerated from source.
- Renderer sentinel passes:
  - `npm run test:e2e:dev:scenario-chunk-runtime` or required targeted fallback.
  - Non-1962 1936/1939 Red Sea checks.
  - `npm run test:node:scenario-refresh-plans`.
  - `npm run test:node:scenario-chunk-contracts`.
  - `npm run test:node:render-transaction-diagnostics`.
- `git diff --check` passes.
