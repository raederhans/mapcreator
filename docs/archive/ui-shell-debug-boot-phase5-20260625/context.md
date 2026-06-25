# UI Shell Debug Boot Phase 5 Context

## Current Evidence

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-ui-shell-debug-boot-phase5-20260625`
- Branch: `codex/ui-shell-debug-boot-phase5-20260625`
- Base: `origin/main@c30486e4285bf780d5893cf908137255d023a672`
- Parent checkout: `C:\Users\raede\Desktop\dev\mapcreator` remains dirty with unrelated `docs/archive/**` deletions and is not used for edits.
- Existing `js/main.js` owns `isUiShellDebugMode()` and the full UI shell debug startup branch.
- Existing `handleStartupFailure()` receives `renderDispatcher`, `startupUiBootstrapPromise`, `startupUiBootstrapAwaited`, and `startupUiBootstrapFailed` from `bootstrap()` catch.
- Existing UI shell branch sets `renderDispatcher` and `startupUiBootstrapPromise` before awaiting UI bootstrap. The new owner must keep this visible through hooks.
- Existing owner tests use pure injected harnesses and source boundary tests.
- State-write allowlist detects direct roots named `state`, `runtimeState`, and `appState`; a `targetState.uiShellDebug` write in the new owner should not add a new allowlist entry.

## Live Process Ownership

- Main Codex agent owns all commands, builds, and browser/e2e validation.
- Subagents are read-only/static reviewers.
- Long validation logs should be written under `.runtime/tests/phase5-ui-shell-boot/` when backgrounded.

## Notes

- Lessons learned call out UI shell full localization hydration and the need to grep old boundary tests when extracting bootstrap owners.
- `verify:pages-dist` is the authoritative source/dist sync gate for `dist/app/**`.
- Architecture review raised a possible teardown for UI shell failure. This phase keeps the existing behavior and the attachment contract: `runUiShellDebugBoot()` exposes dispatcher and UI promise through hooks, then throws to the existing `handleStartupFailure()` path when UI bootstrap rejects.
- `dist/app/js/main.js`, `dist/app/js/bootstrap/ui_shell_boot.js`, and `dist/pages-dist-manifest.json` changed after `verify:pages-dist`; `verify:dist-drift` then passed after staging the generated dist set.

## Validation Results

- `node --check js/bootstrap/ui_shell_boot.js js/main.js`: passed.
- `npm run test:node:ui-shell-boot`: passed, 11/11.
- `npm run test:node:startup-failure-recovery`: passed, 14/14.
- `npm run test:node:render-runtime-binding`: passed, 14/14.
- `npm run test:node:main-runtime-diagnostics`: passed, 12/12.
- `npm run test:node:post-ready-scheduler`: passed, 10/10.
- `npm run test:node:startup-hydration-behavior`: passed, 12/12.
- `npm run verify:state-write-allowlist`: passed, 115 tracked files.
- `npm run verify:architecture-boundaries`: passed.
- `npm run verify:pages-dist`: passed, Pages startup shell 39/39 and landing showcase 8/8.
- `npm run verify:dist-drift`: passed.
- `npm run test:e2e:dev:tno-ready-state`: passed, 5/5, log `.runtime/tests/phase5-ui-shell-boot/tno-ready-state.log`.
- `npm run test:e2e:smoke`: passed, 4/4, log `.runtime/tests/phase5-ui-shell-boot/smoke.log`.
- `npm run test:e2e:ui-rework-mainline`: passed, 5/5, log `.runtime/tests/phase5-ui-shell-boot/ui-rework-mainline.log`.
