# right inspector zoom breakpoint

## Plan

- [x] Locate the CSS and JS owners for right inspector drawer behavior.
- [x] Align the right inspector drawer breakpoint with the JS tablet threshold.
- [x] Sync the packaged app stylesheet.
- [x] Verify desktop zoom width keeps the inspector docked and tablet width keeps drawer behavior.
- [x] Archive this task folder after verification.

## Acceptance

- At `1267x1030`, `#rightSidebar` is visible as a normal docked sidebar and `#rightPanelToggle` is hidden.
- At `1023x900`, `#rightSidebar` remains drawer-based and `#rightPanelToggle` is visible.
- Existing left drawer behavior at `1023px` is preserved.

## Verification

- `node --check js/ui/sidebar.js` passed.
- `git diff --check -- css/style.css dist/app/css/style.css js/ui/sidebar.js docs/active/right-inspector-zoom-breakpoint` passed.
- Playwright DOM measurement at `1267x1030`: `#rightSidebar` is `position: relative`, width `288`, and `#rightPanelToggle` is hidden.
- Playwright stale drawer check at `1267x1030`: forced `body.right-drawer-open` keeps `#rightSidebar` relative and hides the drawer overlay.
- Playwright DOM measurement at `1023x900`: `#rightSidebar` is fixed drawer, and `#rightPanelToggle` is visible at top `76`.
- Playwright DOM measurement at `900x900`: `#rightSidebar` is fixed drawer, and `#rightPanelToggle` is visible.
- Playwright collapse check at `1267x1030`: right sidebar collapse class applies, content becomes inert, `aria-expanded=false`, and the sidebar settles to a 1px edge.
- Static review found missing `dist/app` collapse sync and stale `1280px` contract; both were fixed.
- `python -m unittest tests/test_ui_rework_plan02_mainline_contract.py -q` passed, 16 tests.
