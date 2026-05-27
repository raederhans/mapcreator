# Left Sidebar Collapse Plan

## Goal

Add a small mid-edge control that collapses the left sidebar to the left with a short smooth animation, while letting the map area resize during and after the transition.

## Acceptance

- Left sidebar has an accessible collapse/expand button on its right edge.
- Collapsed state hides sidebar content, keeps the handle reachable, and persists locally.
- Layout refresh runs after toggling so the map canvas can resize.
- Existing right sidebar collapse behavior remains intact.
- Targeted static contract test passes.

## Tasks

- [x] Locate existing right sidebar collapse implementation.
- [x] Mirror the contract for left sidebar HTML, CSS, JS, and aria state.
- [x] Add targeted regression coverage.
- [x] Run verification and review the diff for simpler implementation risks.
