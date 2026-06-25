# Startup Failure Recovery Phase 4 Task

## Delivery Package

### Changes

- Added `handleStartupFailure(...)` as the startup failure recovery owner.
- Replaced the `js/main.js` catch body with explicit helper wiring and a single `startupUiBootstrapFailed` local-state sync.
- Added behavior coverage for helper validation, deferred UI bootstrap rejection, base-map continue gating, continue handler order, and error-state progress fallback.
- Added static boundary coverage for ownership, moved strings, direct import bans, and the single allowed target state write.
- Rebuilt Pages dist and included generated startup failure recovery output.

### Files

- Core: `js/bootstrap/startup_failure_recovery.js`, `js/main.js`.
- Tests: `tests/startup_failure_recovery_behavior.test.mjs`, `tests/main_startup_failure_recovery_boundary.test.mjs`, `package.json`.
- Docs: `docs/active/startup-failure-recovery-phase4-20260625/{plan,context,task}.md`, `docs/active/_worktree_registry.md`.
- Dist: `dist/app/js/main.js`, `dist/app/js/bootstrap/startup_failure_recovery.js`, `dist/pages-dist-manifest.json`.

### Diff Summary

- `main.js` catch block shrinks from inline failure recovery to `handleStartupFailure(...)` wiring.
- New owner holds the original deferred UI bootstrap logging, failure metric, readonly unlock, continue handler, warmup render flush, first-visible checkpoints, and final ready state flow.
- New node tests add 14 phase4 checks through `test:node:startup-failure-recovery`.
- Pages dist now ships `app/js/bootstrap/startup_failure_recovery.js` and updated manifest sizes.

### Commit State

- Pending final review, stage, commit, push, and cleanup.

### Base Divergence

- Base is `origin/main@c8fbe1241eca7bba7900464da67698868dd98f73`; current branch starts from that commit.

### Overlap Risk

- Yellow with recent startup/bootstrap extraction phases by semantics and generated dist.
- Green against parent `docs/archive/**` deletion WIP for production code.

### Verification

- PASS `node --check js/bootstrap/startup_failure_recovery.js js/main.js`.
- PASS `npm run test:node:startup-failure-recovery` 14/14.
- PASS adjacent node regressions: render runtime binding 14/14, main runtime diagnostics 12/12, post-ready scheduler 10/10, startup hydration 12/12, exact-after-settle 8/8, render transaction diagnostics 21/21.
- PASS `npm run verify:state-write-allowlist`.
- PASS `npm run verify:architecture-boundaries`.
- PASS `npm run verify:pages-dist` with startup shell 39/39 and landing showcase 8/8.
- `npm run verify:dist-drift` reported required generated dist changes before staging; final staged drift check remains pending.
- PASS `npm run test:e2e:dev:tno-ready-state` 5/5.
- PASS `npm run test:e2e:smoke` 4/4.

### Remaining Risks

- Browser smoke still reports the existing unauthenticated backend `/api/backend/auth/me` 401 and known D3-unsafe water geometry warnings; smoke assertions passed.
- Staged dist drift check remains before commit.

### Recommended Next Step

- Complete review, stage all phase4 source/test/dist/docs changes, rerun `verify:dist-drift`, then commit and push this clean worktree into `origin/main`.
