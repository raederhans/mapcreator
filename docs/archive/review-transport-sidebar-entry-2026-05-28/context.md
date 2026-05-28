# Review transport sidebar entry context

## 2026-05-28

- Review target: commit `9d24f5e7`.
- Current dirty state before follow-up: `.omx/metrics.json` only.
- Confirmed issue: after moving the visible transport button, `#zoomUtilityWorkspaceGroup` remains in the top controls with only a hidden dev workspace fallback button.
- Fix direction: make the group and fallback button visible only while developer mode is active, using the existing `syncDeveloperModeUi` path.

## Live process ownership

- No dev server or browser smoke owner for this review.
- Verification will use targeted static checks and Python contracts.

## Verification notes

- `node --check js/ui/toolbar.js`
- `node --check dist/app/js/ui/toolbar.js`
- `node --check tests/e2e/dev_workspace_i18n.spec.js`
- `node --check tests/e2e/ui_rework_mainline_shell_sidebar.spec.js`
- `node --check tests/e2e/ui_rework_support_transport_hardening.spec.js`
- `python -m unittest tests.test_ui_rework_plan02_mainline_contract tests.test_ui_rework_plan03_support_transport_contract tests.test_pages_dist_startup_shell -q`
- `git diff --check`
