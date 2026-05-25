# Section Interaction Loops Context

## 2026-05-24

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-section-interaction-loops-2026-05-24`
- Branch: `codex/section-interaction-loops-2026-05-24`
- Parent checkout had unrelated WIP, so this task uses an isolated clean worktree.
- Main thread owns live tests. Static subagent attempts were interrupted by session handoff, so implementation continues in the main thread and final review will use a fresh reviewer.
- Best-practice guidance adopted: user-visible status updates use polite live regions; disabled actions should expose the exact reason through visible nearby copy, title, or accessible label; section groups remain independent.
- Memory-derived project context: previous structure review recommended `shared base interaction -> per-section loop -> persistence`, with Special Zones, Frontlines/Strategic, Transport, and Appearance treated as separate loops.

## Current Anchors

- Special Zones: `js/ui/toolbar/special_zones_workbench_controller.js`, `tests/special_zones_workbench_controller_behavior.test.mjs`
- Frontlines/Strategic: `js/ui/sidebar.js`, `js/ui/sidebar/strategic_overlay_controller.js`, `tests/test_strategic_overlay_sidebar_boundary_contract.py`
- Transport: `js/ui/toolbar/transport_workbench_apply_bridge_owner.js`, `js/ui/toolbar/transport_workbench_shell_owner.js`, `js/ui/toolbar/transport_workbench_popover_owner.js`, `tests/transport_workbench_shell_owner_behavior.test.mjs`, `tests/transport_workbench_popover_owner_behavior.test.mjs`
- Appearance export status: `js/ui/sidebar.js`, `js/ui/sidebar/project_support_diagnostics_controller.js`, `js/core/file_manager.js`

## Verification Plan

- `node --test tests/special_zones_workbench_controller_behavior.test.mjs`
- `node --test tests/transport_workbench_shell_owner_behavior.test.mjs tests/transport_workbench_popover_owner_behavior.test.mjs`
- `python -m unittest tests.test_strategic_overlay_sidebar_boundary_contract tests.test_project_support_diagnostics_sidebar_boundary_contract tests.test_transport_workbench_manifest_runtime_contract`
- `node --check` for changed JS files

## Verification Evidence

- `node --check` passed for changed JS owner files and `tests\file_manager_project_roundtrip_behavior.test.mjs`.
- `node --test tests\file_manager_project_roundtrip_behavior.test.mjs tests\special_zones_workbench_controller_behavior.test.mjs tests\transport_workbench_shell_owner_behavior.test.mjs tests\transport_workbench_popover_owner_behavior.test.mjs` passed: 15 tests.
- `python -m unittest tests.test_strategic_overlay_sidebar_boundary_contract tests.test_project_support_diagnostics_sidebar_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_toolbar_split_boundary_contract tests.test_ui_rework_plan03_support_transport_contract` passed: 83 tests.
- `git diff --check` passed; only existing LF/CRLF warnings were printed.

## Review Fixes

- Removed raw `lastDirtyReason` display from Project Management status so internal section reason codes do not leak into the user-facing project loop.
- Added project import completion/error observers through `FileManager.importProject` and `importProjectThroughFunnel`, then refreshed `projectSaveStatus` from those observers.
- Removed unused `reasonCode` from transport apply button state.
- Reworded project import failure status so it does not promise rollback when a late import hook fails.
