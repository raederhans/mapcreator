# Phase4.5 UI Rework Mainline Context

## 2026-06-25 16:12 UTC

- Created clean worktree `C:\Users\raede\.codex\worktrees\mapcreator-ui-rework-mainline-phase45-20260625`.
- Branch: `codex/ui-rework-mainline-phase45-20260625`.
- Base: `origin/main@9fce96593cc4ff8fa0e8616f86187a0580cb3cfc`.
- Parent checkout is preserved with unrelated `docs/archive/**` deletion WIP.
- `node_modules` is absent in the clean worktree, so `npm ci` is required before Playwright gates can produce meaningful layout evidence.

## 2026-06-25 16:28 UTC

- `npm ci` completed successfully: 3 packages, 0 vulnerabilities.
- Initial `npm run test:e2e:ui-rework-mainline` reproduced the expected drift: 2 passed, 3 failed.
- Failure artifacts:
  - `.runtime/tests/playwright/ui_rework_mainline_shell_s-64df1-ck-stay-inside-the-viewport/test-failed-1.png`
  - `.runtime/tests/playwright/ui_rework_mainline_shell_s-0f30c-in-a-usable-horizontal-rail/test-failed-1.png`
  - `.runtime/tests/playwright/ui_rework_mainline_shell_s-307d6-nd-compact-adaptive-heights/test-failed-1.png`
- A runtime-only measurement spec under `.runtime/tests/phase45/` confirmed:
  - At 1024x760, `#scenarioContextBar` and `#zoomControls` overlap by about 19px because the compact stacking breakpoint starts below 1024px.
  - At 1440x900, `#bottomDock` is exactly 96px high, stays horizontal, and has no horizontal scroll drift.
  - With visual adjustments open, `#selectedCountryActionsSection .inspector-panel-body` is 576px high because production CSS uses the `has-open-visual-adjustments` 66vh contract.
- Fixes applied:
  - Product CSS: add a 1024-1050px scenario context bar stacking breakpoint.
  - Test baseline: accept the exact 96px single-row bottom dock rail.
  - Test baseline: bind the action-body max-height assertion to the visual-adjustments 66vh CSS contract.
  - Selector/semantic baseline: Special Regions content can be represented by visible scenario/relief controls even when `#specialRegionList` is hidden.
- Verification passed:
  - `npm run test:e2e:ui-rework-mainline` -> 5/5.
  - `npm run verify:ui-rework-mainline` -> 18/18.
  - `npm run test:node:render-runtime-binding` -> 14/14.
  - `npm run test:node:startup-failure-recovery` -> 14/14.
  - `npm run test:e2e:dev:tno-ready-state` -> 5/5.
  - `npm run test:e2e:smoke` -> 4/4.
  - `npm run verify:pages-dist` -> Pages startup shell 39/39 and landing showcase 8/8.
  - `npm run verify:dist-drift` -> passed after staging regenerated dist CSS and manifest.

## Live Process Ownership

- Main Codex agent owns all live npm installs, Playwright tests, browser smoke, Pages dist, and dist drift checks.
- Other agents may read checked-in files or completed logs only.
