# render-runtime-binding phase3 task

## Delivery Package

1. Extracted duplicated startup render runtime binding from `js/main.js` into `js/bootstrap/render_runtime_binding.js`.
2. Kept UI shell and normal startup flush reasons explicit.
3. Added behavior and boundary tests under a named package script.
4. Preserved startup path ordering around `initMap`, `setMapData`, `bootstrapDeferredUi`, `loadDeferredMilsymbol`, and `renderDispatcher.flush`.
5. Dist rebuild and browser smoke remain part of the final closeout.

## Files

Core:
- `js/bootstrap/render_runtime_binding.js`
- `js/main.js`
- `package.json`

Tests:
- `tests/render_runtime_binding_behavior.test.mjs`
- `tests/main_render_runtime_binding_boundary.test.mjs`

Docs:
- `docs/active/render-runtime-binding-phase3-20260625/plan.md`
- `docs/active/render-runtime-binding-phase3-20260625/context.md`
- `docs/active/render-runtime-binding-phase3-20260625/task.md`
- `docs/active/_worktree_registry.md`

Generated dist:
- `dist/app/js/bootstrap/render_runtime_binding.js`
- `dist/app/js/main.js`
- `dist/pages-dist-manifest.json`

## Current Diff Summary

- New bootstrap owner centralizes dispatcher creation, render boundary binding, legacy globals, runtime hooks, toast init, boot preview hide, and preset init.
- `main.js` replaces two duplicated binding blocks with two owner calls.
- Package script adds `test:node:render-runtime-binding`.
- New tests lock behavior and ownership boundaries.

## Integration State

- Commit status: not committed yet.
- Base commit: `origin/main@5b88fb6d94e320bad6bb52a58c96ef7ce60f264c`.
- Branch: `codex/render-runtime-binding-phase3-20260625`.
- Parent checkout WIP: unrelated `docs/archive/**` deletions stay outside this worktree.
- Current main divergence at creation: `HEAD...origin/main = 0 0`.

## Overlap Risk

- Red: direct overlap with `js/main.js`, `package.json`, startup/bootstrap tests, and Pages dist from prior phase lanes.
- Yellow: semantic overlap with post-ready scheduler and main runtime diagnostics because all three touch startup ownership.
- Green: parent checkout archive deletion WIP is path-isolated from production code.

## Validation

- PASS `node --check js/bootstrap/render_runtime_binding.js js/main.js`.
- PASS `npm run test:node:render-runtime-binding` 14/14.
- PASS `npm run test:node:main-runtime-diagnostics` 12/12.
- PASS `npm run test:node:post-ready-scheduler` 10/10.
- PASS `npm run test:node:startup-hydration-behavior` 12/12.
- PASS `npm run test:node:render-transaction-diagnostics` 21/21.
- PASS `npm run test:node:renderer-runtime-state-behavior` 10/10.
- PASS `npm run verify:state-write-allowlist`.
- PASS `npm run verify:architecture-boundaries`.
- PASS `npm run verify:pages-dist` with startup shell 39/39 and landing showcase 8/8.
- PASS staged `npm run verify:dist-drift` after expected dist updates.
- PASS `node --check dist/app/js/bootstrap/render_runtime_binding.js dist/app/js/main.js`.
- PASS `npm run test:e2e:dev:tno-ready-state` 5/5.
- PASS `npm run test:e2e:smoke` 4/4.
- Optional `npm run test:e2e:ui-rework-mainline` remains a baseline UI layout gate failure: current worktree 2/5, clean phase2 baseline 2/5 with matching failed assertions.

## Recommended Next Step

Run final review, then commit and push this branch and fast-forward `origin/main` from the clean worktree.
