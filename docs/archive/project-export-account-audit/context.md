# Project Export Account Audit Context

## 2026-06-02 Start

- Isolated worktree: `C:\Users\raede\.codex\worktrees\project-export-account-audit`
- Branch: `codex/project-export-account-audit`
- Base: `origin/main` at `bd7f1486`
- Relevant prior commit: `23c2c915 Make project export entry points discoverable`
- Main checkout has unrelated dirty files and remains untouched.
- Main agent owns browser smoke and test/build processes.

## Working Notes

- Source/dist parity is required when UI source changes.
- Project ZIP export can become confusing if local loading only accepts JSON.
- Account UI should stay separated from Cloud Save actions because account features are not fully active.

## Findings And Fixes

- Fixed local project ZIP loading by unwrapping `map_project.json` before handing the file to the existing import funnel.
- Added a Project Management hint that local load accepts JSON or ZIP packages and Community saves open from Account.
- Fixed Community Save load so it uses the same unsaved-change confirmation as local Load Project.
- Added a small per-button in-flight lock for Cloud Save, Publish Latest, Community Refresh, and Community Load.
- Added source/dist mirror contract checks for the Project support release surface.

## Verification

- `node --test tests/project_support_diagnostics_controller_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs`
- `python -m unittest tests.test_project_support_diagnostics_sidebar_boundary_contract tests.test_ui_rework_plan02_mainline_contract tests.test_ui_rework_plan03_support_transport_contract -q`
- `node --check js/ui/sidebar/project_support_diagnostics_controller.js; node --check js/ui/sidebar.js; node --check js/ui/i18n_catalog.js; node --check dist/app/js/ui/sidebar/project_support_diagnostics_controller.js; node --check dist/app/js/ui/sidebar.js; node --check dist/app/js/ui/i18n_catalog.js`
- `python tools/i18n_audit.py`
- `npm run verify:pages-dist`
- Browser smoke on `http://127.0.0.1:8011/index.html?scope=current-project` confirmed Export default open, Account exists, Cloud Save hidden on static backend, and local input accepts JSON/ZIP.
