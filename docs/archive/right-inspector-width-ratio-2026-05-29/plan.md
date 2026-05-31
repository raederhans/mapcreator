# right inspector width ratio

## Plan

- [x] Measure the current served layout at the reported `1267x1030` viewport.
- [x] Add a late desktop invariant for the right inspector width and mode.
- [x] Sync the packaged app stylesheet and static contract.
- [x] Verify the right inspector keeps the original `288px` docked width at `1267px`.
- [x] Archive this task folder after verification.

## Acceptance

- At `1267x1030`, `#rightSidebar` is docked with width `288px`.
- At `1267x1030`, `#rightPanelToggle` is hidden.
- At `1023x900`, drawer mode still uses the `340px` drawer width and visible toggle.

## Verification

- `node --check js/ui/sidebar.js` passed.
- `git diff --check -- css/style.css dist/app/css/style.css js/ui/sidebar.js tests/test_ui_rework_plan02_mainline_contract.py ...` passed.
- `python -m unittest tests/test_ui_rework_plan02_mainline_contract.py -q` passed, 16 tests.
- Playwright DOM measurement at `1267x1030`: right sidebar `width=288`, `left=979`, `right=1267`, `position=relative`, right panel toggle hidden.
- Playwright DOM measurement at `1024x900`: right sidebar `width=288`, `position=relative`, right panel toggle hidden.
- Playwright DOM measurement at `1023x900`: right sidebar `width=340`, `position=fixed`, right panel toggle visible.
