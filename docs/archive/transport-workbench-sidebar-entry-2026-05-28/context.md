# Transport workbench sidebar entry context

## 2026-05-28

- Current dirty state before task: `.omx/metrics.json` only. Keep it outside this task.
- Current source places `scenarioTransportWorkbenchBtn` inside `#zoomUtilityWorkspaceGroup`.
- Transport controller uses `document.getElementById("scenarioTransportWorkbenchBtn")`, so moving the same id preserves event ownership.
- Right project sidebar already has project-level sections and support entry button styling suitable for a workbench entry.
- Live process owner: none. No dev server or browser smoke is running for this task.

## Decision

Use the existing id and existing overlay controller. Add a lightweight project sidebar section that contains the entry button. Defer shortcut debugging controls to a later small design step after the sidebar entry is stable.

## Verification notes

- `node --check js/ui/toolbar.js`
- `node --check dist/app/js/ui/toolbar.js`
- `node --check` for changed transport e2e specs.
- `python -m unittest tests.test_ui_rework_plan02_mainline_contract tests.test_ui_rework_plan03_support_transport_contract tests.test_pages_dist_startup_shell -q`
- `git diff --check`
