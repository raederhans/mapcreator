# A11y Home/App Fix Task

## Changed Files

Core source:
- `index.html`
- `css/style.css`
- `landing/styles.css`
- `js/core/map_renderer.js`
- `js/ui/sidebar.js`
- `js/ui/sidebar/country_inspector_controller.js`
- `js/ui/sidebar/project_support_diagnostics_controller.js`
- `js/ui/toolbar/appearance_controls_controller.js`
- `js/ui/toolbar/transport_workbench_event_owner.js`
- `js/ui/toolbar/transport_workbench_right_deck_owner.js`
- `js/ui/toolbar/transport_workbench_shell_owner.js`
- `data/i18n/manual_ui.json`
- `data/i18n/locales_baseline.json`
- `data/locales.json`

Tests:
- `tests/country_inspector_controller_behavior.test.mjs`
- `tests/project_support_diagnostics_controller_behavior.test.mjs`
- `tests/transport_workbench_event_owner_behavior.test.mjs`
- `tests/test_i18n_audit.py`

Delivery mirrors:
- `dist/app/index.html`
- `dist/app/css/style.css`
- `dist/app/js/core/map_renderer.js`
- `dist/app/js/ui/sidebar.js`
- `dist/app/js/ui/sidebar/country_inspector_controller.js`
- `dist/app/js/ui/sidebar/project_support_diagnostics_controller.js`
- `dist/app/js/ui/toolbar/appearance_controls_controller.js`
- `dist/app/js/ui/toolbar/transport_workbench_event_owner.js`
- `dist/app/js/ui/toolbar/transport_workbench_right_deck_owner.js`
- `dist/app/js/ui/toolbar/transport_workbench_shell_owner.js`
- `dist/styles.css`
- `dist/pages-dist-manifest.json`

Docs:
- `docs/active/_worktree_registry.md`
- `docs/active/a11y-home-app-fix-20260615/plan.md`
- `docs/active/a11y-home-app-fix-20260615/context.md`
- `docs/active/a11y-home-app-fix-20260615/task.md`

## Verification

- `node --check js/core/map_renderer.js`
- `py -3 -m unittest tests.test_i18n_audit -q`
- `npm run test:node:transport-workbench-event-owner`
- `npm run test:node:country-inspector-controller`
- `npm run test:node:backend-cloud-support`
- `py -3 tools\build_pages_dist.py`
- `py -3 -m unittest tests.test_pages_dist_startup_shell -q`
- `npm run test:node:landing-showcase-view`
- `node .runtime\a11y\work\scan_home_app.mjs`
- `git diff --check`

## Remaining Integration Notes

- Rebase onto current `main` before merge because this branch started from `9f0ef27`.
- Resolve the registry conflict by keeping both this a11y delivery package and the housekeeping worktree entries.
- Rerun the final a11y scan and Pages dist checks after integration.
