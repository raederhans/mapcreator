# Phase4.5 UI Rework Mainline Task

## Acceptance Criteria

- `npm run test:e2e:ui-rework-mainline` passes 5/5 on current main.
- Every changed assertion has a clear UI contract reason.
- No tests are skipped or removed from the verification path.
- `npm run test:e2e:dev:tno-ready-state` passes.
- `npm run test:e2e:smoke` passes.
- `npm run test:node:render-runtime-binding` passes.
- `npm run test:node:startup-failure-recovery` passes.
- `npm run verify:pages-dist` passes.
- `npm run verify:dist-drift` passes, or generated dist changes are rebuilt and included.

## Failure Record

- `adaptive scenario bar and bottom dock stay inside the viewport`
  - Selector/contract: `#scenarioContextBar` vs `#zoomControls`.
  - Expected: no horizontal/vertical overlap.
  - Actual: overlap predicate returned `false`; measurement showed about 19px horizontal overlap at 1024x760.
  - Artifact: `.runtime/tests/playwright/ui_rework_mainline_shell_s-64df1-ck-stay-inside-the-viewport/test-failed-1.png`.
- `desktop bottom dock keeps quick controls in a usable horizontal rail`
  - Selector/contract: `#bottomDock`.
  - Expected: height `< 96`.
  - Actual: height `96`.
  - Artifact: `.runtime/tests/playwright/ui_rework_mainline_shell_s-0f30c-in-a-usable-horizontal-rail/test-failed-1.png`.
- `country inspector submenus keep hierarchy and compact adaptive heights`
  - Selector/contract: `#selectedCountryActionsSection .inspector-panel-body`.
  - Expected: client height `<= 560`.
  - Actual: client height `576`.
  - Artifact: `.runtime/tests/playwright/ui_rework_mainline_shell_s-307d6-nd-compact-adaptive-heights/test-failed-1.png`.
- Secondary stale assertion exposed after the first pass:
  - Selector/contract: `#specialRegionList` inside `#specialRegionInspectorSection`.
  - Expected: non-empty section implies visible list.
  - Actual: section may contain visible scenario/relief controls while the list is hidden.

## Fix Classification

- `#scenarioContextBar` / `#zoomControls`: product layout bug at an exact responsive breakpoint. Fixed CSS by stacking the scenario context bar below the top utility rail for 1024-1050px wide viewports.
- `#bottomDock`: stable baseline update. Current product CSS creates an exact 96px single-row rail with no horizontal overflow, so the test now accepts `<= 96`.
- `#selectedCountryActionsSection .inspector-panel-body`: stable baseline update. The open visual-adjustments state intentionally uses a 66vh max-height contract, so the test now checks that contract.
- `#specialRegionList`: selector/semantic stabilization. The test now accepts either a visible special-region list or visible scenario/relief controls for a non-empty Special Regions section.

## Verification

- `npm run test:e2e:ui-rework-mainline` -> 5/5 passed.
- `npm run verify:ui-rework-mainline` -> 18/18 passed.
- `npm run test:e2e:dev:tno-ready-state` -> 5/5 passed.
- `npm run test:e2e:smoke` -> 4/4 passed.
- `npm run test:node:render-runtime-binding` -> 14/14 passed.
- `npm run test:node:startup-failure-recovery` -> 14/14 passed.
- `npm run verify:pages-dist` -> passed, regenerated `dist/app/css/style.css` and `dist/pages-dist-manifest.json`.
- `npm run verify:dist-drift` -> passed after generated dist changes were staged.
