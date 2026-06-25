# UI Shell Debug Boot Phase 5 Plan

Updated: 2026-06-25 16:36 UTC

## Goal

Extract the `ui_shell=1` startup branch from `js/main.js` into `js/bootstrap/ui_shell_boot.js` while preserving the existing startup order, debug query semantics, render runtime binding, deferred UI bootstrap visibility, localization hydration, ready metrics, and debug global.

## Constraints

- Work only in `C:\Users\raede\.codex\worktrees\mapcreator-ui-shell-debug-boot-phase5-20260625`.
- Preserve the parent checkout `docs/archive/**` deletion WIP.
- Keep ordinary startup, post-ready scheduler, main runtime diagnostics, render runtime binding, and startup failure recovery behavior unchanged.
- `runUiShellDebugBoot()` must expose `renderDispatcher` and `startupUiBootstrapPromise` through hooks before awaiting UI bootstrap.
- New owner must use explicit helper injection and avoid direct imports of runtime state, map renderer public API, or UI shell debug seed.
- Keep Pages dist in sync when source changes affect `dist/app/**`.

## Steps

- [x] Confirm clean worktree from `origin/main`.
- [x] Read task attachment, lessons learned, registry, and existing startup bootstrap owners.
- [x] Add `js/bootstrap/ui_shell_boot.js` with `isUiShellDebugMode()` and `runUiShellDebugBoot()`.
- [x] Update `js/main.js` to delegate the UI shell branch through the new owner.
- [x] Add node behavior and boundary tests plus `test:node:ui-shell-boot`.
- [x] Run required node/static/dist/e2e validation.
- [x] Review for simpler failure-recovery preserving implementation.
- [ ] Commit, push, archive task docs, update registry, and clean the integration worktree.

## Verification Set

- `node --check js/bootstrap/ui_shell_boot.js js/main.js`
- `npm run test:node:ui-shell-boot`
- `npm run test:node:startup-failure-recovery`
- `npm run test:node:render-runtime-binding`
- `npm run test:node:main-runtime-diagnostics`
- `npm run test:node:post-ready-scheduler`
- `npm run test:node:startup-hydration-behavior`
- `npm run verify:state-write-allowlist`
- `npm run verify:architecture-boundaries`
- `npm run verify:pages-dist`
- `npm run verify:dist-drift`
- `npm run test:e2e:dev:tno-ready-state`
- `npm run test:e2e:smoke`
- `npm run test:e2e:ui-rework-mainline`
