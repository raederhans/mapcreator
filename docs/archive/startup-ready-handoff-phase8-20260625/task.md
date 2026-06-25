# Startup Ready Handoff Phase8 Task

## Checklist

- [x] Extract ready handoff owner.
- [x] Rewire `main.js` to lazy-create the owner and route deferred detail helpers through it.
- [x] Remove moved policy functions and internal ready flags from `main.js`.
- [x] Delete unused `schedulePostReadyCityWarmup`.
- [x] Add behavior and boundary tests.
- [x] Add package script.
- [x] Run requested validation stack.
- [x] Sync dist if needed.
- [x] Archive this task package, update registry, commit, push, and clean the worktree.

## Delivery Package

1. Changed behavior:
   - Moved startup ready handoff and post-ready scheduling policy from `js/main.js` into `createStartupReadyHandoffOwner(...)`.
   - Preserved ready handoff order, scheduler keys, timeouts, retry delays, idle quieting, first-ready chunk flush seeding, hydration, context warmup, visual warmup, political reconcile, and full interaction infrastructure warmup.
   - Kept startup data pipeline bridge functions in `main.js` because they depend on lazy startup data owner access.
   - Rewired `DeferredDetailPromotionOwner` helper injection to the ready handoff owner.
   - Deleted unused `schedulePostReadyCityWarmup`.

2. Changed files:
   - Core: `js/main.js`, `js/bootstrap/startup_ready_handoff.js`.
   - Tests: `tests/startup_ready_handoff_behavior.test.mjs`, `tests/main_startup_ready_handoff_boundary.test.mjs`, `tests/main_bootstrap_wiring_boundary.test.mjs`, `tests/main_post_ready_scheduler_boundary.test.mjs`.
   - Config: `package.json`.
   - Dist: `dist/app/js/main.js`, `dist/app/js/bootstrap/startup_ready_handoff.js`, `dist/pages-dist-manifest.json`.
   - Docs: `docs/archive/startup-ready-handoff-phase8-20260625/`, `docs/active/_worktree_registry.md`.

3. Diff summary:
   - `main.js` imports `createStartupReadyHandoffOwner`, lazy-creates it once, and delegates post-ready handoff calls through the owner.
   - New owner module receives runtime state, post-ready scheduler, and helper functions by dependency injection.
   - Node tests cover owner behavior and static wiring boundaries.
   - Pages dist mirrors the source move.

4. Commit status:
   - Phase8 code, tests, dist, and docs are committed on `codex/startup-ready-handoff-phase8-20260625`.
   - Branch is safe to fast-forward into `main` after remote freshness check.

5. Base divergence:
   - Worktree base is `origin/main@3826e4f1c383d9c2a22999ad8dbc7639381d7e18`.
   - No unrelated parent checkout WIP is included.

6. Conflict risk:
   - Yellow for future edits to `js/main.js`, bootstrap owner imports, package scripts, phase boundary tests, and generated Pages dist.
   - Green against the parent checkout `docs/archive/**` deletion WIP.

7. Verification:
   - Syntax: `node --check js/bootstrap/startup_ready_handoff.js`; `node --check js/main.js`.
   - Node/static: startup-ready handoff, main bootstrap wiring, deferred bootstrap, UI shell boot, startup failure recovery, render runtime binding, main runtime diagnostics, post-ready scheduler, startup hydration, scenario refresh plans, exact-after-settle refresh plans, render transaction diagnostics, state-write allowlist, architecture boundaries.
   - Publish path: `npm run verify:pages-dist`, then `npm run verify:dist-drift` after staging generated dist.
   - Browser: TNO ready-state 5/5, smoke 4/4, UI rework mainline 5/5, scenario chunk runtime 8/8.
   - Hygiene: `git diff --check`, `git diff --cached --check`.

8. Remaining risks:
   - Full e2e matrix was outside the requested phase8 validation scope.
   - Existing smoke diagnostics include D3-unsafe water geometry warnings and `/api/backend/auth/me` 401 while the gate passes.

9. Recommended integration action:
   - Fast-forward `origin/main` from this branch, keep the remote feature branch as recovery evidence, and remove the local phase8 worktree after push confirmation.
