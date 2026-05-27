# TNO Startup Political Visual Ready Plan

## Goal
Fix the TNO 1962 startup and zoom political-fill regression by making the first visible startup frame wait for the first real scenario political chunk visual promotion.

## Tasks
- [x] Create isolated worktree and task docs.
- [x] Add focused tests/contracts for startup-ready political chunk promotion and zoom color stability.
- [x] Add a narrow awaitable initial visual chunk promotion gate in scenario chunk runtime.
- [x] Wire the gate through scenario resources and startup boot before first-visible metrics.
- [x] Preserve existing chunk scheduling, shell-only empty baseline, zoom-end, and interaction contracts.
- [x] Run targeted Node/Python verification and browser/E2E smoke with one live-process owner.
- [x] Run final review/bug audit, update reusable lessons only if needed, archive docs, merge, commit, push, and clean worktree.

## Live Process Ownership
Main thread owns all dev server, browser, Playwright, E2E, long test, and log polling work. Subagents may only inspect static files, propose test coverage, or review completed outputs.

## Acceptance
- Direct `/app/?default_scenario=tno_1962` reaches ready only after `selectionVersion >= 1`, non-empty `scenarioPoliticalChunkData`, non-empty land data, and non-empty resolved political colors.
- Zoom in/out keeps fixed country probes on the same country and color.
- `scheduleScenarioChunkRefresh()` keeps its synchronous status-return contract.
- Shell-only active scenario political topology remains an explicit empty scenario-owned baseline until chunk promotion fills it.

## Verification Completed
- Python contract suite: 55 tests passed.
- Node contract suites: scenario chunk 29, startup hydration 12, physical layer 2 passed.
- E2E: `npm run test:e2e:tno-contracts` passed 2 tests; `npm run test:e2e:dev:scenario-chunk-runtime` passed 5 tests.
- Focused live smoke passed with startup `selectionVersion=1`, `scenarioPoliticalChunkFeatureCount=11935`, `landFeatureCount=12350`, `colorCount=12341`; zoom-end loaded `political.detail.country.gco` with stable Congo probe colors.
