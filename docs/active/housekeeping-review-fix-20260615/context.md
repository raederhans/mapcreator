# Housekeeping Review Fix Context

## Evidence

- Main checkout is at `7211640d`, matching `origin/main`, with only the pre-existing `lessons learned.md` local edit.
- Live worktrees at review start:
  - `C:\Users\raede\Desktop\dev\mapcreator` on `main` at `7211640d`.
  - `C:\Users\raede\Desktop\dev\mapcreator-a11y-home-app-fix-20260615` on `codex/a11y-home-app-fix-20260615` at `9f0ef27a`.
  - `C:\Users\raede\Desktop\dev\mapcreator-housekeeping-review-fix-20260615` on `codex/housekeeping-review-fix-20260615` at `7211640d`.
- Validation discovered `C:\Users\raede\Desktop\dev\mapcreator-localization-governance-20260615` on `codex/localization-governance-20260615` at `7211640d`. It is clean and matches `origin/main`.
- Initial registry still named `codex/worktree-housekeeping-20260615` as the integration branch and kept older base values for current rows.
- `mapcreator-a11y-home-app-fix-20260615` current dirty files:
  - `css/style.css`
  - `index.html`
  - `landing/styles.css`
  - `js/core/map_renderer.js`
  - `js/ui/sidebar.js`
  - `js/ui/sidebar/country_inspector_controller.js`
  - `js/ui/sidebar/project_support_diagnostics_controller.js`
  - `js/ui/toolbar/appearance_controls_controller.js`
  - `js/ui/toolbar/transport_workbench_event_owner.js`
  - `js/ui/toolbar/transport_workbench_right_deck_owner.js`
  - `js/ui/toolbar/transport_workbench_shell_owner.js`
  - `data/i18n/locales_baseline.json`
  - `data/i18n/manual_ui.json`
  - `data/locales.json`
  - `dist/app/css/style.css`
  - `dist/app/index.html`
  - `dist/app/js/core/map_renderer.js`
  - `dist/app/js/ui/sidebar.js`
  - `dist/app/js/ui/sidebar/country_inspector_controller.js`
  - `dist/app/js/ui/sidebar/project_support_diagnostics_controller.js`
  - `dist/app/js/ui/toolbar/appearance_controls_controller.js`
  - `dist/app/js/ui/toolbar/transport_workbench_event_owner.js`
  - `dist/app/js/ui/toolbar/transport_workbench_right_deck_owner.js`
  - `dist/app/js/ui/toolbar/transport_workbench_shell_owner.js`
  - `dist/pages-dist-manifest.json`
  - `dist/styles.css`
  - `tests/country_inspector_controller_behavior.test.mjs`
  - `tests/project_support_diagnostics_controller_behavior.test.mjs`
  - `tests/test_i18n_audit.py`
  - `tests/transport_workbench_event_owner_behavior.test.mjs`

## Live Process Ownership

- No live server, browser smoke, or long test process is used for this review-fix task.
- Main Codex agent owns all validation commands.
- Child agents are read-only static reviewers.
