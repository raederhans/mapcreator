# P19 Viewport Command Owner Context

## Baseline

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-p19-viewport-command-owner`
- Branch: `codex/viewport-command-owner-p19-20260626`
- Original base: `origin/main@07bafc248eb5861789785b25fbe719466b7f0b9b`
- Current base after rebase: `origin/main@7e72eddf811a064347c15ec0b98f70744f41ba72`
- Functional change after rebase: current branch HEAD. The exact final hash is recorded after the last amend/push.
- Parent checkout: local `main@383a626acd4f15002a80ff20e235a4103581ab43`, behind remote, with unrelated `docs/archive/**` deletion WIP and `lessons learned.md` WIP.

## Confirmed Facts

- `origin/main:js/core/renderer/scenario_water_cache_policy_owner.js` exists, so P18 is present.
- The P19 worktree was created from `origin/main@07bafc248eb5861789785b25fbe719466b7f0b9b`.
- P19 was rebased over audit closeout `origin/main@7e72eddf811a064347c15ec0b98f70744f41ba72`; the only rebase conflict was `docs/active/_worktree_registry.md`.
- Target wrappers in `map_renderer.js` before extraction were `updateZoomTranslateExtent`, `resetZoomToFit`, `zoomByStep`, `setZoomPercent`, and `enforceZoomConstraints`.
- Non-target host functions remain in `map_renderer.js`: `updateMap`, `initZoom`, `handleResize`, `requestMapContainerResizeSync`, `fitProjection`, `setCanvasSize`, `drawCanvas`, and `renderPassToCache`.

## Implementation Notes

- Added `js/core/renderer/viewport_command_owner.js` with `createViewportCommandOwner(...)`.
- `map_renderer.js` keeps public wrapper function names and delegates the five viewport command wrappers to the owner.
- The host injects `zoomBehavior`, `interactionRect`, `globalThis.d3`, `calculatePanExtent`, and `getCenteredFitZoomTransform`.
- The owner uses `effects.setZoomTransform(transform)` for the reset state write; the actual `runtimeState.zoomTransform = transform` assignment remains in `map_renderer.js`.
- Added `tests/viewport_command_owner_behavior.test.mjs` and package script `test:node:viewport-command-owner`.
- Extended `tools/check_architecture_boundaries.mjs` with a P19 file entry, 220-line owner budget, reverse-import guard, owner tokens, renderer delegation tokens, and forbidden host side-effect tokens.

## Validation Evidence

- `node --check js/core/renderer/viewport_command_owner.js` passed.
- `node --check tests/viewport_command_owner_behavior.test.mjs` passed.
- `node --check js/core/map_renderer.js` passed.
- `node --check tools/check_architecture_boundaries.mjs` passed.
- `npm run test:node:viewport-command-owner` passed 8/8.
- `npm run test:node:viewport-read-model-owner` passed 12/12.
- `npm run test:node:scenario-water-cache-policy-owner` passed 7/7.
- `npm run test:node:projected-geometry-bounds-owner` passed 12/12.
- `npm run test:node:render-transform-reuse-policy-owner` passed 7/7.
- `npm run test:node:render-cache-owner` passed 6/6.
- `npm run test:node:renderer-host-inventory` passed 7/7.
- `npm run test:node:renderer-runtime-state-behavior` passed 10/10.
- `npm run test:node:render-transaction-diagnostics` passed.
- `npm run test:node:scenario-refresh-plans` passed 24/24 after rebasing over the audit baseline.
- `npm run test:node:scenario-chunk-contracts` passed 57/57.
- `npm run verify:architecture-boundaries` passed.
- `npm run verify:state-write-allowlist` passed with 115 tracked files.
- `npm run verify:test-import-graph` passed with 49 specs.
- Owner side-effect scan for `runtimeState`, renderer lifecycle functions, and `map_renderer` imports returned no matches.
- `npm run test:e2e:dev:tno-ready-state` passed 5/5.
- `npm run test:e2e:smoke` passed 4/4; observed known `/api/backend/auth/me` 401 and D3 unsafe water geometry warnings for `marine_arctic_ocean, marine_southern_ocean`.
- `git diff --check` passed with LF/CRLF warnings only.
- Forbidden path scan found no changes to `dist/app/**`, `tools/eslint-rules/state-writer-allowlist.json`, or `js/core/map_renderer/public.js`.

## Pending Closeout

- Push this archive/registry closeout, then clean the isolated worktree after remote confirmation.

## Review Notes

- Final code-review subagent found one medium architecture gap: the boundary checker did not forbid the old reset `zoomBehavior.transform` snippet from returning to `map_renderer.js`.
- Fixed by adding the exact old reset snippet to `rendererForbiddenTokens`, while leaving `zoomToFacilityEntry` transition transform paths legal.
- Post-fix validation passed `node --check tools/check_architecture_boundaries.mjs`, `npm run verify:architecture-boundaries`, `npm run verify:state-write-allowlist`, `npm run test:node:viewport-command-owner`, and `git diff --check`.

## Runtime Artifacts

- Non-E2E verification log: `.runtime/tests/p19-non-e2e-20260626T151308Z.log`.
- Ready-state E2E log: `.runtime/tests/p19-e2e-ready-state-20260626T151409Z.log`.
- Smoke E2E log: `.runtime/tests/p19-e2e-smoke-20260626T151539Z.log`.
- Post-rebase non-E2E verification log: `.runtime/tests/p19-non-e2e-post-rebase-20260626T152712Z.log`.
- Post-rebase ready-state E2E log: `.runtime/tests/p19-e2e-ready-state-post-rebase-20260626T152732Z.log`.
- Post-rebase smoke E2E log: `.runtime/tests/p19-e2e-smoke-post-rebase-20260626T152905Z.log`.
- Temporary ignored dependency junction: `node_modules -> C:\Users\raede\Desktop\dev\mapcreator\node_modules`.
