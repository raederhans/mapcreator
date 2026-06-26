# P20 Viewport Resize Lifecycle Owner Context

## 2026-06-26 15:46 UTC

- Preconditions passed: `origin/main@d2171b5fec0f78557736bf456416c1691925e204` contains `scenario_water_cache_policy_owner.js` and `viewport_command_owner.js`.
- Parent checkout is dirty with unrelated archive/lesson WIP and remains untouched.
- Isolated worktree: `C:\Users\raede\.codex\worktrees\mapcreator-p20-viewport-resize-lifecycle-owner`.
- Branch: `codex/viewport-resize-lifecycle-owner-p20-20260626`.
- Live process owner: main Codex agent only.
- Static subagents assigned:
  - code-mapper: map resize/DPR handles and sequencing.
  - test-engineer: design pure Node owner behavior tests.
  - architect: review owner boundary and architecture checker.
  - code-reviewer: final bug review after implementation.

## Findings

- Current resize/DPR lifecycle lived in `js/core/map_renderer.js` near `getResizeReason` through `handleSidebarLayoutStart`.
- Migrated handles: resize observer/frame/timer/pending reason, DPR media query/handler, visual viewport handler/target, and deferred spatial refresh handle.
- Host effects that stayed injected: render phase writes, `setCanvasSize`, projection fit, zoom reset/enforce, overlay dirty flags, render, spatial index build, hit canvas dirty write, hit canvas scheduling, and performance metrics.
- P20 explicitly freezes `dist/app/**`; source owner checks now live in owner tests, architecture boundaries, and the Python source boundary contract. Pages dist sync remains a downstream gate outside this phase.

## Review Loop

- Final code review requested changes for untracked owner/test files, `dist/app` delivery clarity, selector routing, and missing `dispose()` coverage.
- Response:
  - Owner and test files are included in the intended staged set.
  - `dist/app/**` remains untouched by requirement and is called out in this context, task delivery package, and registry.
  - `tools/test_route_registry.mjs` now maps the new owner to `infra:architecture-boundaries`.
  - Owner behavior tests now cover `dispose()` cleanup of observer, frame, timer, deferred work, DPR media listener, and visualViewport listener.

## Validation Log

- `node --check js/core/renderer/viewport_resize_lifecycle_owner.js` passed.
- `node --check js/core/map_renderer.js` passed.
- `node --check tests/viewport_resize_lifecycle_owner_behavior.test.mjs` passed.
- `node --check tools/check_architecture_boundaries.mjs` passed.
- `node --check tools/test_route_registry.mjs` passed.
- `npm run test:node:viewport-resize-lifecycle-owner` passed, 12/12.
- `npm run test:node:viewport-command-owner` passed, 8/8.
- `npm run test:node:viewport-read-model-owner` passed, 12/12.
- `npm run test:node:scenario-water-cache-policy-owner` passed, 7/7.
- `npm run test:node:projected-geometry-bounds-owner` passed, 12/12.
- `npm run test:node:render-transform-reuse-policy-owner` passed, 7/7.
- `npm run test:node:render-cache-owner` passed, 6/6.
- `npm run test:node:renderer-host-inventory` passed, 7/7.
- `npm run test:node:renderer-runtime-state-behavior` passed, 10/10.
- `npm run test:node:render-transaction-diagnostics` passed, 21/21.
- `npm run test:node:scenario-refresh-plans` passed, 24/24.
- `npm run test:node:scenario-chunk-contracts` passed, 57/57.
- `npm run verify:architecture-boundaries` passed.
- `npm run verify:state-write-allowlist` passed, 115 tracked files.
- `npm run verify:test-import-graph` passed, 49 specs.
- `npm run python -- -m unittest tests.test_frontend_render_boundary_contract -q` passed, 5 tests.
- `npm run python -- -m unittest tests.test_e2e_structural_tooling -q` passed, 28 tests.
- `node tools/select_verification_targets.mjs --check` passed, 189 routes.
- `node tools/select_verification_targets.mjs explain js/core/renderer/viewport_resize_lifecycle_owner.js` recommends both `test:node:viewport-resize-lifecycle-owner` and `verify:architecture-boundaries`.
- `npm run test:e2e:dev:tno-ready-state` passed, 5/5.
- `npm run test:e2e:smoke` passed, 4/4.
- `git diff --check` passed with CRLF working-copy warnings only.
- Forbidden path scan for `dist/app/**`, state-write allowlist, and `js/core/map_renderer/public.js` returned no changed paths.
- Owner forbidden token scan returned no `runtimeState`, `drawCanvas`, `initZoom`, `map_renderer`, DOM creation, or canvas context tokens.

## Known Local Smoke Noise

- E2E smoke retained the known local `/api/backend/auth/me` 401.
- E2E smoke retained known D3 unsafe water geometry warnings for `marine_arctic_ocean` and `marine_southern_ocean`.
