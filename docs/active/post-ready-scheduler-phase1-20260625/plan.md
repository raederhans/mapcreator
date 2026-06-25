# Post-ready Scheduler Phase 1 Plan

## Task Grade

complex

Reason: this extracts a scheduler owner from `js/main.js`, touches startup scheduling, runtime diagnostics, state-write guardrails, and multiple targeted test gates.

## First-principles Target

`main.js` should keep startup policy decisions, while a dedicated bootstrap owner owns post-ready task handles, idle gating, retry timing, epoch invalidation, and diagnostics synchronization.

## Non-goals

- Do not change startup scenario boot.
- Do not change deferred detail promotion owner behavior.
- Do not change render dispatcher, map renderer, data pipeline, UI bootstrap, scenario apply, or failure recovery.
- Do not add direct root state writer allowlist entries.
- Do not add dependencies.

## Steps

- [x] Create isolated worktree from `origin/main@c4a5632f`.
- [x] Load requested `ultragoal`, `ultrawork`, and `ultraqa` skills.
- [x] Create durable ultragoal artifacts and Codex aggregate goal.
- [x] Create active docs for this complex refactor.
- [x] Locate current scheduler implementation and startup policy call sites.
- [x] Extract `js/bootstrap/post_ready_scheduler.js`.
- [x] Wire `js/main.js` to the new owner with existing task keys and timing.
- [x] Add focused scheduler behavior and boundary tests.
- [x] Add `test:node:post-ready-scheduler` script.
- [x] Run requested validation commands in order.
- [x] Run final first-principles bug review and update delivery package.

## Acceptance Evidence

- `node --check js/bootstrap/post_ready_scheduler.js js/main.js`
- `npm run test:node:post-ready-scheduler`
- `npm run test:node:startup-hydration-behavior`
- `npm run test:node:exact-after-settle-refresh-plans`
- `npm run test:node:render-transaction-diagnostics`
- `npm run verify:state-write-allowlist`
- `npm run verify:architecture-boundaries`
- `npm run test:node:physical-layer-contracts`
- `npm run python -- -m unittest tests.test_main_startup_scenario_boot_boundary_contract tests.test_scenario_chunk_refresh_contracts -q`
- `git diff --check`

## Result

This worktree is ready for integration after commit. The parent checkout still has unrelated `docs/archive/**` deletion WIP, so main integration should wait for a clean parent checkout or use a clean integration worktree.
