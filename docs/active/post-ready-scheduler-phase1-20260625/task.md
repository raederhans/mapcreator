# Post-ready Scheduler Phase 1 Task

## Goal

Extract the post-ready scheduler internals from `js/main.js` into `js/bootstrap/post_ready_scheduler.js`, while preserving startup behavior, task keys, retry timing, diagnostics shape, and public runtime state.

## Required Files

- `js/bootstrap/post_ready_scheduler.js`
- `js/main.js`
- `tests/post_ready_scheduler_behavior.test.mjs`
- `tests/main_post_ready_scheduler_boundary.test.mjs`
- `package.json`
- `docs/active/_worktree_registry.md`

## Delivery Checklist

- [x] New owner exports `createPostReadyScheduler`, `POST_READY_IDLE_QUIET_MS`, and `POST_READY_IDLE_TIME_REMAINING_MS`.
- [x] New owner receives `targetState` explicitly and avoids root state variable names.
- [x] `main.js` imports and initializes the owner.
- [x] `main.js` keeps post-ready warmup policy functions.
- [x] Existing task keys, delay, timeout, retry delay, idle quiet, and idle time thresholds are preserved.
- [x] Diagnostics continue syncing to `targetState.postReadyTaskDiagnostics`, `targetState.renderPerfMetrics.postReadySchedulerState`, and `globalScope.__renderPerfMetrics`.
- [x] Behavior and boundary tests cover the new owner.
- [x] Requested validation commands pass.
- [x] Final delivery package records integration readiness and risks.
- [x] Clean integration rebuilt Pages dist mirrors and passed browser smoke.

## Delivery Package

1. What changed:
   - Extracted post-ready task handle ownership, idle gating, retry scheduling, reset epoch invalidation, and diagnostics sync from `js/main.js` into `js/bootstrap/post_ready_scheduler.js`.
   - Kept post-ready startup policy functions and task key choices in `js/main.js`.
   - Added focused owner behavior tests and static boundary tests.
   - Updated existing startup, scenario chunk, and physical-layer contracts to read the new owner boundary.
   - Added `npm run test:node:post-ready-scheduler` for the new coverage.
2. Files changed:
   - Core: `js/main.js`, `js/bootstrap/post_ready_scheduler.js`, `package.json`.
   - Tests: `tests/post_ready_scheduler_behavior.test.mjs`, `tests/main_post_ready_scheduler_boundary.test.mjs`, `tests/physical_layer_contracts.test.mjs`, `tests/test_main_startup_scenario_boot_boundary_contract.py`, `tests/test_scenario_chunk_refresh_contracts.py`.
   - Docs: `docs/active/post-ready-scheduler-phase1-20260625/plan.md`, `docs/active/post-ready-scheduler-phase1-20260625/context.md`, `docs/active/post-ready-scheduler-phase1-20260625/task.md`, `docs/active/_worktree_registry.md`.
   - Temporary files: none committed; `.omx/ultragoal/**` remains ignored local workflow state.
3. Diff summary relative to base:
   - `js/main.js` loses the inline scheduler internals and calls `postReadyScheduler.scheduleTask(...)` / `postReadyScheduler.reset("bootstrap")`.
   - New bootstrap owner is about 354 lines and contains the moved scheduling mechanics.
   - New tests cover scheduler behavior and static boundary contracts; existing contracts now point at the new owner.
4. Commit state:
   - Prepared for the functional commit on branch `codex/post-ready-scheduler-phase1-20260625`; final CLI closeout records the commit hash.
5. Base and main divergence:
   - Base commit is `origin/main@c4a5632fc112ac2eed9a7381dd21e5eb58ea3721`.
   - Before commit, `HEAD...origin/main` is `0 0`; the task branch starts from current remote main.
6. Potential conflicts:
   - Direct path overlap with parent checkout is limited to `docs/active/_worktree_registry.md`; parent production source files are clean relative to this task.
   - Shared hot files for future work: `js/main.js`, startup diagnostics, post-ready scheduling, `package.json`, and startup/scenario chunk contracts.
7. Validation:
   - PASS `node --check js/bootstrap/post_ready_scheduler.js js/main.js`
   - PASS `npm run test:node:post-ready-scheduler`
   - PASS `npm run test:node:startup-hydration-behavior`
   - PASS `npm run test:node:exact-after-settle-refresh-plans`
   - PASS `npm run test:node:render-transaction-diagnostics`
   - PASS `npm run verify:state-write-allowlist`
   - PASS `npm run verify:architecture-boundaries`
   - PASS `npm run test:node:physical-layer-contracts`
   - PASS `npm run python -- -m unittest tests.test_main_startup_scenario_boot_boundary_contract tests.test_scenario_chunk_refresh_contracts -q`
   - PASS `git diff --check`
8. Unverified risk:
   - Browser smoke was not run because this phase is a scheduler extraction covered by targeted Node/Python/static contracts.
   - Main integration is pending because the parent checkout has unrelated `docs/archive/**` deletion WIP.
9. Recommendation:
   - Commit and push this branch, then integrate from a clean main checkout or clean integration worktree with the validation set above.
10. Integration readiness:
   - Ready for integration after commit; keep the worktree until the branch is merged into main and pushed.

## Clean Integration Note - 2026-06-25

- Integration worktree: `C:\Users\raede\Desktop\dev\scenario-forge-integration`
- Integration branch: `integrate/post-ready-scheduler-phase1-20260625`
- Base: `origin/main@c4a5632fc112ac2eed9a7381dd21e5eb58ea3721`
- Source branch/commit: `origin/codex/post-ready-scheduler-phase1-20260625` at `7beeb4a7d036158fefca1d4aa3082e680180998a`
- Merge result: clean `--no-ff` merge with no conflicts; parent checkout `C:\Users\raede\Desktop\dev\mapcreator` kept its unrelated `docs/archive/**` deletion WIP untouched.
- Dist result: `npm run verify:pages-dist` rebuilt necessary mirrors for `dist/app/js/main.js`, `dist/app/js/bootstrap/post_ready_scheduler.js`, and `dist/pages-dist-manifest.json`; `npm run verify:dist-drift` passed after staging those dist updates.
- Browser smoke: PASS `npm run test:e2e:smoke` with 4/4 tests in 52.7s. Evidence screenshots were written under `.runtime\browser\mcp-artifacts\screenshots\hoi4_1939_ui_smoke.png` and `.runtime\browser\mcp-artifacts\screenshots\tno_1962_ui_smoke.png`. Console/network output only showed the existing D3-unsafe water geometry warnings and local `/api/backend/auth/me` 401 dev-auth probe.
- Validation commands passed: `node --check js/bootstrap/post_ready_scheduler.js js/main.js`; `npm run test:node:post-ready-scheduler`; `npm run test:node:startup-hydration-behavior`; `npm run test:node:exact-after-settle-refresh-plans`; `npm run test:node:render-transaction-diagnostics`; `npm run verify:state-write-allowlist`; `npm run verify:architecture-boundaries`; `npm run verify:pages-dist`; `npm run verify:dist-drift`; `npm run test:e2e:smoke`; plus extra phase1-adjacent contracts `npm run test:node:physical-layer-contracts` and `npm run python -- -m unittest tests.test_main_startup_scenario_boot_boundary_contract tests.test_scenario_chunk_refresh_contracts -q`.
- Integration state: ready to push from the clean integration worktree; changed files are limited to phase1 source/tests/docs plus necessary dist mirror updates.
