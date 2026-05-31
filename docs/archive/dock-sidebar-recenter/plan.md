# Dock Sidebar Recenter

## Plan
- [x] Trace bottom dock positioning and nearby floating controls after sidebar collapse.
- [x] Center the collapsed Dev quick edit dock when both sidebars are collapsed.
- [x] Add or update contract coverage and sync dist.
- [x] Verify with targeted tests and browser measurements.

## Context
- User observed that after both vertical sidebars collapse, the Dev quick edit dock remains right-shifted instead of aligning with the newly centered map stage.
- Current CSS intentionally anchors `.bottom-dock.dev-workspace-mode.is-collapsed` to the right side. The new behavior should apply only when both sidebars are collapsed.
- Fix adds a desktop-only rule for `body.left-sidebar-collapsed.right-sidebar-collapsed .bottom-dock.dev-workspace-mode.is-collapsed` so the quickbar uses `left: calc(50% + var(--bottom-dock-center-offset, 0px))` and `translateX(-50%)`.
- Browser measurement with the Dev quickbar class applied: map stage center X 603px, dock center X 603px. Other visible floating controls keep their intended anchors: zoom top-right, context/guide top-left, sidebar handles on the side edges, onboarding hint centered.
- Verification passed: `python -m unittest tests.test_dev_workspace_shell_builder_boundary_contract -q`, `python -m unittest tests.test_ui_rework_plan02_mainline_contract -q`, and `npm run verify:pages-dist`.
