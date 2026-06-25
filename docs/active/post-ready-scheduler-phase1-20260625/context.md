# Post-ready Scheduler Phase 1 Context

## Current Facts

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-post-ready-scheduler-phase1-20260625`
- Branch: `codex/post-ready-scheduler-phase1-20260625`
- Base: `origin/main@c4a5632fc112ac2eed9a7381dd21e5eb58ea3721`
- Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` has unrelated `docs/archive/**` deletion WIP and is preserved.
- `ultrawork` reference file `references/agent-tiers.md` is absent in the installed skill directory; delegation decisions will use available Codex native tools and explicit static review lanes.
- Live process owner: main Codex agent owns all tests/builds/checks for this task.
- Other agents: static analysis/review only; no shared live process polling.

## Findings Log

- 2026-06-25: Created durable `.omx/ultragoal` artifacts in the isolated worktree and created an aggregate Codex goal for this run.
- 2026-06-25: Located the old post-ready scheduler internals in `js/main.js`; policy call sites remain in `main.js`, while task handles, idle gating, retry, reset epoch, and diagnostics moved to `js/bootstrap/post_ready_scheduler.js`.
- 2026-06-25: Added behavior coverage for blocker order, timeout fallback, failure warnings, reset/epoch cancellation, low idle-budget retry, and diagnostics sync.
- 2026-06-25: Added static boundary coverage to keep warmup policy in `main.js`, keep exported scheduler constants in the owner, and prevent root state variable names inside the new owner.
- 2026-06-25: Architect review returned CLEAR for the current boundary: `main.js` owns warmup policy and the new bootstrap owner owns scheduler mechanics.
- 2026-06-25: Code review returned COMMENT findings. Fixed the unused `POST_READY_IDLE_TIME_REMAINING_MS` import in `main.js`; staging will include the new owner and new tests; active docs are updated here.
- 2026-06-25: Final ai-slop-cleaner pass was bounded to changed files. Behavior was already locked by tests; fallback-like scan found no masking fallback. Cleanup action was limited to deleting the unused import and updating task docs.

## Verification Log

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

## Current Integration State

- Status: ready-for-integration after commit.
- Direct hot files: `js/main.js`, `js/bootstrap/post_ready_scheduler.js`, `package.json`, startup/physical/scenario chunk contract tests.
- Parent checkout overlap: parent `main` has unrelated `docs/archive/**` deletion WIP. Production source files for this task do not overlap that WIP.
- Recommended integration path: merge or fast-forward this branch from a clean main checkout, run the same validation set, then clean the worktree after main push.
