# Main Runtime Diagnostics Phase 2 Task

## Goal

Extract main runtime diagnostics snapshot construction from `js/main.js` into `js/bootstrap/main_runtime_diagnostics.js`.

## Delivery Checklist

- [x] New module exports `cloneSnapshotValue`, `buildMainRuntimeLoadStatusSnapshot`, `buildMainRuntimeVersionSnapshot`, and `registerMainRuntimeDiagnostics`.
- [x] `main.js` registers diagnostics through the new module.
- [x] Snapshot schema stays compatible.
- [x] New module avoids root state imports and state writes.
- [x] Behavior and boundary tests cover the new owner.
- [x] Package script `test:node:main-runtime-diagnostics` is added.
- [x] Requested verification passes, with dist drift handled through Pages dist rebuild.
- [x] Delivery package records integration readiness and risks.

## Delivery Package

1. Changed what:
   - Extracted main runtime diagnostics snapshot construction from `js/main.js` into `js/bootstrap/main_runtime_diagnostics.js`.
   - Preserved `loadStatus/main_runtime` and `version/main_runtime` provider names and output schemas.
   - Added behavior tests for clone, loadStatus, version, and registration.
   - Added boundary tests proving `main.js` only registers and the new owner avoids root state imports and state writes.
   - Regenerated Pages dist to include the new bootstrap module and manifest entries.

2. Files:
   - Core: `js/bootstrap/main_runtime_diagnostics.js`, `js/main.js`, `package.json`.
   - Tests: `tests/main_runtime_diagnostics_behavior.test.mjs`, `tests/main_runtime_diagnostics_boundary.test.mjs`.
   - Dist: `dist/app/js/main.js`, `dist/app/js/bootstrap/main_runtime_diagnostics.js`, `dist/pages-dist-manifest.json`.
   - Docs: `docs/active/main-runtime-diagnostics-phase2-20260625/plan.md`, `context.md`, `task.md`, `docs/active/_worktree_registry.md`.
   - Temporary files: none.

3. Diff summary:
   - `main.js` drops local clone/loadStatus/version provider construction and calls `registerMainRuntimeDiagnostics(...)`.
   - New owner exposes the required snapshot builders and registration function.
   - Package gains `test:node:main-runtime-diagnostics`.
   - Dist mirrors source and updates `pages-dist-manifest.json`.

4. Commit status:
   - Committed on `codex/main-runtime-diagnostics-phase2-20260625`; final branch HEAD hash is reported after the last amend/push.

5. Base divergence:
   - Worktree branch started from `origin/main@949801b1582619be2f587a3fd8e99252eb39e6cf`, which already contains the post-ready scheduler phase1 integration closeout.

6. Conflict risk:
   - Yellow with other startup/bootstrap work because `js/main.js`, `package.json`, and Pages dist are shared hot files.
   - Green against parent checkout `docs/archive/**` deletion WIP because this worktree does not touch those archive deletions.

7. Validation:
   - PASS `node --check js/bootstrap/main_runtime_diagnostics.js js/main.js`
   - PASS `npm run test:node:main-runtime-diagnostics`
   - PASS `npm run test:node:post-ready-scheduler`
   - PASS `npm run test:node:startup-hydration-behavior`
   - PASS `npm run test:node:render-transaction-diagnostics`
   - PASS `npm run verify:state-write-allowlist`
   - PASS `npm run verify:architecture-boundaries`
   - PASS `npm run verify:pages-dist`
   - PASS `npm run test:node:exact-after-settle-refresh-plans`
   - PASS staged `npm run verify:dist-drift`
   - PASS `git diff --check`
   - PASS `npm run python -- -m unittest tests.test_mapcreator_snapshot_contract tests.test_main_startup_scenario_boot_boundary_contract -q`
   - PASS repeat `npm run test:node:main-runtime-diagnostics`
   - PASS final code review recheck after requested fixes

8. Remaining risks:
   - `cloneSnapshotValue` is exported because the task requires it. Architect review recommends consolidating clone semantics later if another diagnostics owner needs the same helper.
   - Full browser e2e smoke was not part of the phase2 verification list; published-path startup shell and landing smoke passed through `verify:pages-dist`.

9. Recommended next step:
   - Push the feature branch; fast-forward/push main if remote main remains at `949801b1`.
