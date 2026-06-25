# UI Shell Debug Boot Phase 5 Task

## Delivery Package

### Changed Files

- Core files:
  - `js/bootstrap/ui_shell_boot.js`
  - `js/main.js`
  - `dist/app/js/bootstrap/ui_shell_boot.js`
  - `dist/app/js/main.js`
- Test files:
  - `tests/ui_shell_boot_behavior.test.mjs`
  - `tests/main_ui_shell_boot_boundary.test.mjs`
  - `tests/main_render_runtime_binding_boundary.test.mjs`
- Config and generated metadata:
  - `package.json`
  - `dist/pages-dist-manifest.json`
- Documentation:
  - `docs/active/_worktree_registry.md`
  - `docs/active/ui-shell-debug-boot-phase5-20260625/plan.md`
  - `docs/active/ui-shell-debug-boot-phase5-20260625/context.md`
  - `docs/active/ui-shell-debug-boot-phase5-20260625/task.md`
  - `lessons learned.md`

### Diff Summary

- Added `runUiShellDebugBoot()` as the UI shell startup owner with explicit helpers and optional hooks.
- Moved `isUiShellDebugMode()` query parsing out of `main.js` while keeping the same accepted query values.
- Replaced the inline `main.js` UI shell branch with a single delegated boot call.
- Preserved failure recovery visibility by writing `renderDispatcher` and `startupUiBootstrapPromise` through hooks before awaiting UI bootstrap.
- Added behavior and boundary coverage for success, reject, helper validation, query parsing, and ownership boundaries.

### Verification

- `node --check js/bootstrap/ui_shell_boot.js js/main.js`: passed.
- `npm run test:node:ui-shell-boot`: passed, 11/11.
- `npm run test:node:startup-failure-recovery`: passed, 14/14.
- `npm run test:node:render-runtime-binding`: passed, 14/14.
- `npm run test:node:main-runtime-diagnostics`: passed, 12/12.
- `npm run test:node:post-ready-scheduler`: passed, 10/10.
- `npm run test:node:startup-hydration-behavior`: passed, 12/12.
- `npm run verify:state-write-allowlist`: passed, 115 tracked files.
- `npm run verify:architecture-boundaries`: passed.
- `npm run verify:pages-dist`: passed, 39/39 plus 8/8.
- `npm run verify:dist-drift`: passed.
- `npm run test:e2e:dev:tno-ready-state`: passed, 5/5.
- `npm run test:e2e:smoke`: passed, 4/4.
- `npm run test:e2e:ui-rework-mainline`: passed, 5/5.
- `git diff --check`: passed.

### Risks

- UI bootstrap rejection is intentionally delegated to existing startup failure recovery after hooks expose dispatcher and promise state.
- `documentRef` keeps the planned browser default and is passed explicitly by tests.
- Parent checkout still has unrelated docs/archive deletion WIP and remains untouched.

### Next Action

Commit, push, archive this task folder, update registry to integrated status, then clean the integration worktree.
