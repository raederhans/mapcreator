# Startup Ready Handoff Phase8 Context

## 2026-06-25 Start

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-startup-ready-handoff-phase8-20260625`
- Branch: `codex/startup-ready-handoff-phase8-20260625`
- Base: `origin/main@3826e4f1c383d9c2a22999ad8dbc7639381d7e18`
- Parent checkout: `C:\Users\raede\Desktop\dev\mapcreator` remains dirty with unrelated `docs/archive/**` deletion WIP and is not edited for this phase.
- Existing phase7 boundary test still requires ready handoff policy to stay in `main.js`; phase8 must update that contract.
- `schedulePostReadyCityWarmup` is defined only in `js/main.js` and has no repository references, so phase8 can delete it with a boundary assertion.

## Live Process Ownership

- Main Codex agent owns all long-running builds, Playwright runs, dev-server work, and command interpretation.
- Subagents, if used later, are limited to static review and must not poll or rerun live processes.

## 2026-06-25 Closeout Evidence

- Extracted `createStartupReadyHandoffOwner(...)` into `js/bootstrap/startup_ready_handoff.js`.
- `main.js` now lazy-creates the ready handoff owner, keeps startup data pipeline bridge wrappers local, and routes deferred detail promotion helper calls through the owner.
- Deleted the unused `schedulePostReadyCityWarmup` helper after repository search found no callers.
- Updated phase7 bootstrap wiring and post-ready scheduler boundary tests so phase8 owns ready handoff policy and timing assertions.
- Added `npm run test:node:startup-ready-handoff`, covering owner behavior plus `main.js` boundary contracts.
- Dist drift appeared after the source move; `npm run verify:pages-dist` rebuilt Pages dist, and the generated `dist/app/js/bootstrap/startup_ready_handoff.js`, `dist/app/js/main.js`, and `dist/pages-dist-manifest.json` are included.
- Browser gates passed: TNO ready-state 5/5, smoke 4/4, UI rework mainline 5/5, scenario chunk runtime 8/8. Smoke still reports the existing D3-unsafe water geometry warnings and `/api/backend/auth/me` 401 diagnostic while passing.

## Final Validation

- `node --check js/bootstrap/startup_ready_handoff.js`
- `node --check js/main.js`
- `npm run test:node:startup-ready-handoff`
- `npm run test:node:main-bootstrap-wiring`
- `npm run test:node:deferred-bootstrap`
- `npm run test:node:ui-shell-boot`
- `npm run test:node:startup-failure-recovery`
- `npm run test:node:render-runtime-binding`
- `npm run test:node:main-runtime-diagnostics`
- `npm run test:node:post-ready-scheduler`
- `npm run test:node:startup-hydration-behavior`
- `npm run test:node:scenario-refresh-plans`
- `npm run test:node:exact-after-settle-refresh-plans`
- `npm run test:node:render-transaction-diagnostics`
- `npm run verify:state-write-allowlist`
- `npm run verify:architecture-boundaries`
- `npm run verify:pages-dist`
- `npm run verify:dist-drift`
- `npm run test:e2e:dev:tno-ready-state`
- `npm run test:e2e:smoke`
- `npm run test:e2e:ui-rework-mainline`
- `npm run test:e2e:dev:scenario-chunk-runtime`

All listed commands passed in the phase8 clean worktree.
