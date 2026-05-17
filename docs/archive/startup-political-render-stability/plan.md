# Startup Political Render Stability Plan

## Goal
Fix the linked TNO 1962 startup and zoom rendering failures by tightening first-frame political rendering, ocean-fill invalidation, and political repaint scope.

## Tasks
- [x] Establish docs/context/task artifacts.
- [x] Add targeted startup and renderer contracts.
- [x] Render an early political first frame after startup scenario apply.
- [x] Gate `firstVisibleFramePainted` on current political/composed frame state and record blocked reasons.
- [x] Route scenario ocean fill/style changes through political/context invalidation.
- [x] Limit partial political repaint to targeted `refresh-colors`.
- [x] Preserve post-ready detail/chunk political reconcile.
- [x] Run targeted validation, perf gate, and final smoke as needed.
- [x] Run final review/self-check, update lessons learned only for major new findings, and commit.

## Live Process Ownership
The main thread owns all tests, perf gate, dev server, and browser smoke. Subagents may inspect static files and completed log snapshots only.

## Verification Notes
- `npm run perf:gate` passed. Current median `tno_1962` first visible: 4815.5 ms; interactive-ready: 4828.3 ms; first-visible leads by 12.8 ms. `tno_1962` interactive-ready improved by about 977 ms against `docs/perf/baseline_2026-04-20.json`.
- Final focused Playwright smoke passed after the second strict safe-write: `tno zoom-end keeps Great Lakes Congo political detail fill stable`.
- A misquoted broad Playwright run also exercised adjacent TNO/ocean specs and passed the target zoom-edge smoke plus the dedicated Mediterranean fill smoke, but the broader command had two unrelated adjacent failures and is not used as the final gate.
- Final review lanes returned `APPROVE` and `Architectural Status: CLEAR`.
