# scenario context bar zoom align

## Plan

- [x] Locate the owner files for `#scenarioContextBar`.
- [x] Remove the tablet-width forced vertical offset that appears after page zoom narrows the viewport.
- [x] Sync the packaged app stylesheet when the same rule exists there.
- [x] Verify the bar and right-side controls align at the reported viewport width.
- [x] Archive this task folder after verification.

## Acceptance

- At about 1267px viewport width, `#scenarioContextBar` and `#zoomControls` use the same top edge.
- Phone layout keeps its existing stacked placement.
- CSS syntax check and a browser-level DOM measurement pass.

## Verification

- `git diff --check -- css/style.css dist/app/css/style.css docs/active/scenario-context-bar-zoom-align` passed.
- Playwright DOM measurement at `1267x1030`: `#scenarioContextBar.top = 16`, `#zoomControls.top = 16`, overlap false.
- Playwright DOM measurement at `1023x900`: scenario bar top `78`, zoom bar top `16`, no overlap with left/right drawer toggles.
- Playwright DOM measurement at `900x900`: scenario bar top `78`, zoom bar top `16`, no overlap with left/right drawer toggles.
- Playwright DOM measurement at `767x900`: phone stacked layout preserved, scenario bar top `68`, zoom bar top `14`, no overlap with drawer toggles.
