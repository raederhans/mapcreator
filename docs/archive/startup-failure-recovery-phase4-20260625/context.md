# Startup Failure Recovery Phase 4 Context

## 2026-06-25

- Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` is local `main@c4a5632f`, behind `origin/main`, with unrelated `docs/archive/**` deletion WIP. It is preserved.
- Clean worktree created at `C:\Users\raede\.codex\worktrees\mapcreator-startup-failure-recovery-phase4-20260625`.
- Branch is `codex/startup-failure-recovery-phase4-20260625`, tracking `origin/main`.
- Base commit is `origin/main@c8fbe1241eca7bba7900464da67698868dd98f73`.
- Live test/build owner is the main Codex agent. Static subagents may inspect code and recommend fixes.
- Current code evidence: `js/main.js` catch block still owns deferred UI bootstrap failure logging, `scenarioApplyInFlight` reset, UI replay, failed boot metric, error console output, readonly unlock, continue handler, warmup state, render invalidation/flush, first-visible checkpoints, and ready finalization.

## Integration Notes Draft

- Source branch: `codex/startup-failure-recovery-phase4-20260625`.
- Base: `origin/main@c8fbe1241eca7bba7900464da67698868dd98f73`.
- Hot files: `js/main.js`, `js/bootstrap/startup_failure_recovery.js`, startup failure tests, `package.json`, generated `dist/app/js/main.js`, generated `dist/app/js/bootstrap/startup_failure_recovery.js`, `dist/pages-dist-manifest.json`, active docs and registry.
- Parent WIP overlap: green for production code, yellow for shared docs/registry.

## Validation Evidence

- PASS `node --check js/bootstrap/startup_failure_recovery.js js/main.js`.
- PASS `npm run test:node:startup-failure-recovery` 14/14.
- PASS `npm run test:node:render-runtime-binding` 14/14.
- PASS `npm run test:node:main-runtime-diagnostics` 12/12.
- PASS `npm run test:node:post-ready-scheduler` 10/10.
- PASS `npm run test:node:startup-hydration-behavior` 12/12.
- PASS `npm run test:node:exact-after-settle-refresh-plans` 8/8.
- PASS `npm run test:node:render-transaction-diagnostics` 21/21.
- PASS `npm run verify:state-write-allowlist`.
- PASS `npm run verify:architecture-boundaries`.
- PASS `npm run verify:pages-dist`: startup shell 39/39, landing showcase 8/8, total size 1101.70 MiB.
- `npm run verify:dist-drift` initially reported expected generated drift for `dist/app/js/main.js`, `dist/app/js/bootstrap/startup_failure_recovery.js`, and `dist/pages-dist-manifest.json`; generated dist is included in this integration.
- PASS `npm run test:e2e:dev:tno-ready-state` 5/5.
- PASS `npm run test:e2e:smoke` 4/4. Existing smoke diagnostics included backend auth `/api/backend/auth/me` 401 and D3-unsafe water geometry warnings; smoke assertions passed.
- PASS `npm ci` after clean worktree browser smoke first reported missing `node_modules/@playwright/test`.
- Code review returned COMMENT with no runtime behavior findings; follow-up test coverage added for handler-registration-before-error-state and Proxy-observed target state writes.

## Closeout

- Functional commit is `898b2e1e418c437a049389de9865ca751cd33ea9` on `codex/startup-failure-recovery-phase4-20260625`.
- The branch was rebased from base `origin/main@c8fbe1241eca7bba7900464da67698868dd98f73` onto integration base `origin/main@2aab955c5bc98694ca6109e5660ed613585557f2`.
- Before final closeout, the only residual worktree noise was `dist/app/css/style.css` with LF-in-index vs CRLF-in-worktree mismatch; restoring the worktree copy removed the false dirty state with no content change.
- Final docs action is archival under `docs/archive/startup-failure-recovery-phase4-20260625/` plus registry sync that moves phase4 out of Current Worktrees.
