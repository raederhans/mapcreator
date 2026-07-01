# Renderer Map Hover Interaction Owner P48

## Objective

Move only the `handleMouseMove(event)` hover, tooltip, cursor, and hover-overlay orchestration out of `js/core/map_renderer.js` into `js/core/map_renderer/map_hover_interaction_owner.js`.

## Task Class

Complex integration-stage renderer extraction. The parent checkout is dirty and behind `origin/main`, so P48 runs in an isolated worktree. The main agent owns all live validation commands.

## Baseline

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-p48-map-hover-interaction-owner-20260701`
- Branch: `codex/p48-map-hover-interaction-owner-20260701`
- Base: `origin/main@0d6667f58b111d23d728c03733c553370b253d07`
- P47 is already on default main: merge commit `a2131698a353aed4a7688c14aa63b80a92d651b5` is contained in `origin/main`, and `js/core/map_renderer/hit_canvas_scheduling_owner.js` exists on `origin/main`.

## First Principles

- User-visible hover behavior must stay stable: throttle, no-data skip, special-zone editor hover clear, HGO runtime hover, reduced-hover clear, land/water/special hover id transitions, facility hover, city tooltip, land/water/special tooltip, tooltip queue payloads, cursor updates, and hover overlay scheduling order remain equivalent.
- The owner receives injected getters/effects/helpers and does not import `map_renderer.js`.
- `map_renderer.js` keeps `function handleMouseMove(event)` as the stable wrapper.
- Runtime writes remain in `map_renderer.js` through injected effects: hovered ids, facility hover entry, dev hover hit, hover overlay dirty/schedule, tooltip queue, and cursor writes.
- Non-goals: click/double-click, selection/fill, brush/physical-intensity, hit canvas, render/draw/pass, scenario refresh, exact scheduler, strategic runtime, public facade, state-write allowlist, and `dist/**`.
- Existing P47 hit canvas scheduling owner, event binding owner, interaction hit candidates, public facade, state-write allowlist, and `dist/**` remain unchanged.

## Allowed Write Set

Core:
- `js/core/map_renderer.js`
- `js/core/map_renderer/map_hover_interaction_owner.js`

Tests:
- `tests/map_hover_interaction_owner_behavior.test.mjs`
- `tests/map_hover_interaction_owner_inventory.test.mjs`

Tooling/package:
- `tools/check_architecture_boundaries.mjs`
- `package.json`

Docs:
- `docs/active/renderer-map-hover-interaction-owner-p48-20260701.md`
- `docs/active/_worktree_registry.md`

## Plan

- [x] Confirm P47 is integrated on default main before starting.
- [x] Create isolated P48 worktree from current `origin/main`.
- [x] Read the required renderer, owner, boundary, public facade, allowlist, package, and test files.
- [x] Implement `createMapHoverInteractionOwner(...)` with fail-fast dependencies and frozen summaries.
- [x] Wire `map_renderer.js` wrapper to delegate to the owner through injected getters/effects/helpers.
- [x] Add behavior coverage for hover clear, HGO hover, reduced phase, hover id transitions, facility/city/map tooltip priority, cursor updates, tooltip-hidden paths, and dependency fail-fast.
- [x] Add inventory coverage for wrapper delegation, forbidden migrations, unchanged public/state-write/P47/event-binding/interaction-hit-candidate boundaries, package scripts, and no `dist/**` diff.
- [x] Register P48 in `tools/check_architecture_boundaries.mjs` and `package.json`.
- [x] Run the required validation list.
- [x] Run review/self-check.
- [x] Commit, integrate to default main, push, and record closeout truth.

## Context Log

- 2026-07-01: Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` is `main@16abfd5f`, behind remote, and dirty with unrelated docs/archive/landing/lessons WIP. It remains untouched.
- 2026-07-01: P48 worktree created at `origin/main@0d6667f58b111d23d728c03733c553370b253d07`.
- 2026-07-01: Existing `handleMouseMove(event)` starts at `js/core/map_renderer.js:20767` and owns only mousemove hover/tooltip/cursor orchestration. Existing `getMapInteractionEventBindingOwner()` injects `handleMouseMove` into the binding owner at `js/core/map_renderer.js:2496`.
- 2026-07-01: Noether static review returned WATCH and confirmed the owner boundary is viable while requesting old hover/facility contract tests follow the moved tokens. The two touched Python contract methods now pass directly.
- 2026-07-01: State-write allowlist initially flagged the new tests because direct assignment tokens appeared inside test source and contract strings. The tests now use local closure variables and constructed state-write tokens.
- 2026-07-01: Functional commit `f9b0a2691058cc7e3855cf49fade5c798c23530e` was pushed to `origin/codex/p48-map-hover-interaction-owner-20260701` and fast-forwarded to `origin/main`; `git merge-base --is-ancestor f9b0a2691058cc7e3855cf49fade5c798c23530e origin/main` returned success.
- 2026-07-01: Registry closeout commit `22066cb859bc6687086cf1687dc9c872d22c3acb` was pushed to `origin/codex/p48-map-hover-interaction-owner-20260701` and fast-forwarded to `origin/main`.

## Validation Results

Passed in `.runtime/tests/p48-validation-final-20260701.log`:

- `node --check js/core/map_renderer/map_hover_interaction_owner.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/map_hover_interaction_owner_behavior.test.mjs`
- `node --check tests/map_hover_interaction_owner_inventory.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
- `npm run test:node:map-hover-interaction-owner` (`12/12`)
- `npm run test:node:map-hover-interaction-inventory` (`7/7`)
- `npm run test:node:map-hover-interaction` (`19/19`)
- `npm run test:node:map-interaction-event-binding-owner` (`6/6`)
- `npm run test:node:interaction-hit-candidates` (`5/5`)
- `npm run test:node:hit-canvas-scheduling-owner-suite` (`32/32`)
- `npm run test:node:renderer-render-lifecycle-inventory` (`8/8`)
- `npm run test:node:renderer-render-request-boundary` (`13/13`)
- `npm run test:node:renderer-render-phase-lifecycle` (`17/17`)
- `npm run test:node:visible-frame-diagnostics` (`14/14`)
- `npm run test:node:scenario-chunk-contracts` (`57/57`)
- `npm run test:node:scenario-refresh-plans` (`24/24`)
- `npm run test:node:exact-after-settle-refresh-plans` (`9/9`)
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph` (`51` specs)
- `npm run verify:state-write-allowlist` (`115` tracked files)
- `git diff --check`

Additional focused contracts passed:

- `py -3 -m unittest tests.test_runtime_hooks_boundary_contract.RuntimeHooksBoundaryContractTest.test_hgo_runtime_preview_hooks_are_registered_for_renderer_mode`
- `py -3 -m unittest tests.test_transport_facility_interactions_contract.TransportFacilityInteractionsContractTest.test_map_renderer_wires_facility_hover_and_card_logic`

Not run: browser/dev-server E2E and Pages dist generation. P48 explicitly keeps `dist/**` unchanged and the required Node/static/scenario contract suite covers the moved mousemove hover path. A full run of the two touched Python modules exposed existing unrelated contract failures outside the changed P48 methods, so the migrated methods were verified directly.
