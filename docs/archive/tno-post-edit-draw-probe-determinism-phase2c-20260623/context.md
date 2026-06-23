# Phase 2C Context

## Start State

- Current date: 2026-06-23.
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-phase2c-post-edit-determinism-20260623`.
- Branch: `codex/phase2c-post-edit-determinism-20260623`.
- Base commit: `75ffdaa7100d9c371d5a2fe2b75d3a3408603029`.
- Parent checkout: `C:\Users\raede\Desktop\dev\mapcreator`, `main@75ffdaa7`, clean at start.
- `git worktree list` shows only parent main and this Phase 2C worktree.
- `ultragoal` repo artifact is an old completed thematic/admin ledger, so this task uses the active Codex goal plus this docs folder.
- `ultraqa` state is active for this workflow.

## Inherited Evidence

- Phase 1.5 fixed full-derived-state stability: visible political subset cannot become stable `landData`/spatial/colors state.
- Phase 2A fixed TNO owner/base-color coverage: full runtime owner universe is collected beyond the country map, and the full e2e suite had one residual post-edit pixel failure.
- Residual failure: `tno post-edit keeps political detail fill before progressive recovery skip` on `FR_ARR_18002`; runtime reports `resolvedColor: "#ff00aa"` while the main-canvas pixel probe samples blue.
- Phase 2B Red Sea remains out of scope.

## Live Ownership

- Main Codex agent owns all e2e/dev-server/build/test commands.
- Static subagents are read-only. They must not start, monitor, retry, or interpret live process state.
- Long-running logs and artifacts must remain under `.runtime/`.

## Findings Log

- 2026-06-23 15:50 local: created isolated Phase 2C worktree from `origin/main@75ffdaa7`.
- 2026-06-23 15:50 local: confirmed no current parent checkout WIP despite older registry notes about historical WIP.
- 2026-06-23 15:50 local: read Phase 1.5 and Phase 2A archive contexts; both explicitly record this post-edit failure as a later draw/probe lane.
- 2026-06-23 15:55 local: initial baseline command failed before test execution because this new worktree had no `node_modules`; created a local junction to the parent checkout `node_modules`, matching the earlier Phase 2A worktree setup pattern.
- 2026-06-23 15:58 local: valid baseline single grep passed on current `origin/main@75ffdaa7`: `1 passed (1.7m)`, test body time `19.3s`, log `.runtime/tests/playwright/phase2c-single-grep-baseline-rerun.log`.
- Because the single grep no longer reproduces the reported failure on current main, next step is the full `npm run test:e2e:dev:scenario-chunk-runtime` route before editing production code.
- 2026-06-23 later: full baseline route reproduced the residual failure at 7/8. The failing snapshot had `featureId=FR_ARR_18002`, `resolvedColor=#ff00aa`, `visualOverride=#ff00aa`, `featureOverride=#ff00aa`, `colorRevision=12`, `scenarioDataGeneration=2`, `renderPhase=idle`, `deferExactAfterSettle=false`, `renderPassCache.dirty.political=true`, reason `rebuild-colors`, empty `partialPoliticalDirtyIds`, empty `pendingPoliticalColorEditIds`, `pendingPoliticalColorEditRevision=-1`, `politicalPassRenders=9`, `drawPoliticalFeatureFillLoop.reason=progressive-coarse-underlay`, `renderedCount=0`, `drawPoliticalBackgroundFillsPass.progressive=true`, and blue main-canvas samples.
- Diagnosis: this is a production draw/cache issue. The resolved color state was correct, but chunk promotion plus color rebuild cleared the pending edit before a final fine political fill reached the main canvas. Progressive recovery then reused the admin0/coarse path and skipped the fine feature loop, leaving the visible canvas at the old owner/base blue.
- Fix: `drawPoliticalPass` now treats visible explicit political color overrides as foreground obligations. The extra scan only runs after the normal progressive coarse-skip candidate is already true, preserving the fast path for ordinary frames.
- Regression coverage: `tests/scenario_chunk_contracts.test.mjs` now covers the post-edit visual override surviving a chunk promotion that clears pending edit state, and the existing E2E now records four snapshots plus a `waitForPostEditPoliticalPaint` gate before pixel sampling.
- Final E2E target lock: the post-edit browser test now edits exactly `FR_ARR_18002`, derives an interior probe from that feature geometry, and passed both the focused grep and full 8/8 runtime suite after the target lock.
- Current-base Python note: a broader manual boundary run that included `tests.test_scenario_renderer_bridge_boundary_contract` failed because that contract expects `scenario_refresh_runtime.js` to import `getScenarioChunkPromotionTargetPasses`, while current code consumes `resolveScenarioChunkPromotionRendererRefreshDescriptor`. Those files were not touched in Phase 2C. The direct Phase 2C boundary set passed 55/55.

## Final Classification

- Failure class: production draw/cache bug.
- Main reason: `resolvedColor` and overrides updated state, while `rebuild-colors` plus progressive coarse recovery skipped the fine political loop after the pending edit state had already cleared.
- Out of scope kept: Thematic, Appearance, Map Content UI, and 1936/1939 Red Sea.
- Integration: functional commit `8130f496` was pushed to `origin/main`; parent local main was left untouched because it had unrelated UI/palette WIP.
