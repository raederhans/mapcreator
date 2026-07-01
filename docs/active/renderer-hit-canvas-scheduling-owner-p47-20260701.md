# Renderer Hit Canvas Scheduling Owner P47

## Objective

Move only the hit canvas deferred scheduling and scheduled-handle cancellation lifecycle out of `js/core/map_renderer.js` into `js/core/map_renderer/hit_canvas_scheduling_owner.js`.

## Task Class

Complex. This touches the renderer hot path, the architecture boundary checker, package scripts, and registry truth. Main owns all live commands and validation logs. Subagents are limited to plan review, code review, architecture review, and QA/static review.

## First Principles

- The user-visible renderer behavior must stay stable: hit canvas drawing, building, point probing, dirty-source writes, topology revision writes, scenario refresh runtime, exact-after-settle scheduling, spatial index ownership, interaction event binding, public facade, state-write allowlist, and `dist/**` remain outside this change.
- The only production extraction is the scheduling owner. It receives injected getters/effects and must not import `map_renderer.js`.
- `map_renderer.js` keeps `scheduleHitCanvasBuildIfNeeded({ reason = "idle-render" } = {})` as the internal wrapper.
- The wrapper preserves the existing boolean behavior: it returns `false` after scheduling, matching the current renderer contract.
- The new owner returns a frozen summary for tests and diagnostics.
- The deferred callback preserves the old metric shape exactly: `mode: "deferred"`, the caller `reason`, and `activeScenarioId: String(runtimeState.activeScenarioId || "")`.

## Allowed Write Set

Core:
- `js/core/map_renderer.js`
- `js/core/map_renderer/hit_canvas_scheduling_owner.js`

Tests:
- `tests/hit_canvas_scheduling_owner_behavior.test.mjs`
- `tests/hit_canvas_scheduling_owner_inventory.test.mjs`
- `tests/renderer_hit_canvas_scheduling_inventory_boundary.test.mjs`

Tooling/package:
- `tools/check_architecture_boundaries.mjs`
- `package.json`

Docs:
- `docs/active/renderer-hit-canvas-scheduling-owner-p47-20260701.md`
- `docs/active/_worktree_registry.md`

## Plan

- [x] Intake current `origin/main` renderer and preflight boundaries.
- [x] Create isolated worktree from `origin/main`.
- [x] Ralplan gate: architect review of this plan. Verdict WATCH; plan now hardens script, old-behavior, and checker acceptance.
- [x] Ralplan gate: critic review after architect approval.
- [x] Implement `createHitCanvasSchedulingOwner(...)` with injected getters/effects and frozen summaries.
- [x] Wire `map_renderer.js` wrapper and scheduled cancellation through the owner.
- [x] Add owner behavior tests for skip gates, duplicate guard, scheduling, callback order, cancellation, strict-validation cancellation, fail-fast dependencies, summary freezing, empty scheduled-handle return, and forbidden source tokens.
- [x] Add named package entries: `test:node:hit-canvas-scheduling-owner`, `test:node:hit-canvas-scheduling-owner-inventory`, and `test:node:hit-canvas-scheduling-owner-suite`.
- [x] Flip inventory and architecture checks from preflight-only to P47 unique-owner state.
- [x] Run required validation commands.
- [x] Run independent code-review and architecture review; fix findings.
- [x] Run UltraQA/static adversarial closeout.
- [x] Create Lore commit and mark ready-for-integration according to final integration safety.

## P47 Acceptance Checklist

- `map_renderer.js` imports exactly one hit canvas scheduling owner: `./map_renderer/hit_canvas_scheduling_owner.js`.
- `map_renderer.js` keeps `function scheduleHitCanvasBuildIfNeeded({ reason = "idle-render" } = {})`.
- The wrapper calls `getHitCanvasSchedulingOwner().scheduleHitCanvasBuildIfNeeded({ reason })`.
- The wrapper returns `false` for the scheduled path, preserving the current caller contract.
- The owner callback clears the scheduled handle before the draw effect.
- The owner callback sends `mode: "deferred"`, the original `reason`, and string `activeScenarioId` into the injected draw effect.
- Forced validation cancellation goes through the owner before `drawHitCanvasWithMetric({ mode: "forced", reason: "strict-validation" })`.
- Reset cancellation goes through the owner and clears the scheduled handle.
- `drawHitCanvas()`, `drawHitCanvasWithMetric()`, `recordDeferredFullHitCanvasMetric()`, `buildHitCanvasAfterStartup()`, point probing, dirty writes, and topology revision writes stay in `map_renderer.js`.
- `scenario_refresh_runtime.js` keeps injected `scheduleHitCanvasBuildIfNeeded` and imports no hit canvas owner.
- `spatial_index_runtime_owner.js`, `interaction_hit_candidates.js`, and `map_interaction_event_binding_owner.js` remain outside scheduling ownership.
- `public.js`, `tools/eslint-rules/state-writer-allowlist.json`, and `dist/**` have no diff.

## Architecture Checker Target State

- Add `FILES.hitCanvasSchedulingOwner`, `FILES.hitCanvasSchedulingOwnerTest`, `FILES.hitCanvasSchedulingOwnerInventoryTest`, and `FILES.rendererHitCanvasSchedulingOwnerDoc`.
- Add a line budget for `hit_canvas_scheduling_owner.js`.
- Replace the preflight rule that forbids all production `hit_canvas` files with a unique-owner rule that allows only `js/core/map_renderer/hit_canvas_scheduling_owner.js`.
- Keep broad render lifecycle owner absent.
- Keep `scheduleHitCanvasBuildIfNeeded` checks focused on wrapper and injection boundaries.
- Keep `runtimeState.hitCanvasBuildScheduled` ownership visible in `map_renderer.js` through injected getter/effect wiring and reset/forced cancellation.
- Remove direct `cancelDeferredWork(runtimeState.hitCanvasBuildScheduled)` expectations from P47, replacing them with owner cancellation expectations.
- Prefer behavior assertions and narrow owner-path assertions over broad brittle source-token counts.
- Add package script checks for the owner behavior script, owner inventory script, combined suite, and legacy scheduling inventory script.

## Context Log

- 2026-07-01: Worktree `C:\Users\raede\.codex\worktrees\mapcreator-renderer-hit-canvas-scheduling-p47` created from `origin/main@c20cc67f481a3b635dd00d52a64a70c51db021fb`.
- 2026-07-01: Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` is dirty and behind remote; it remains untouched.
- 2026-07-01: Existing `scheduleHitCanvasBuildIfNeeded` currently schedules work, stores `runtimeState.hitCanvasBuildScheduled`, clears it before drawing, records `mode: "deferred"`, and returns `false` after scheduling.
- 2026-07-01: Existing forced validation path cancels and clears the scheduled handle before `drawHitCanvasWithMetric({ mode: "forced", reason: "strict-validation" })`.
- 2026-07-01: Architect gate returned WATCH. Required plan hardening: package owner scripts, exact old wrapper/callback behavior, and explicit architecture-checker P47 token target state. This document now records those acceptance points before implementation.
- 2026-07-01: First critic pass used a stale/parent view and did not see this worktree plan. Its substantive guidance is incorporated here: avoid brittle exact counts, lock reset cancellation, lock callback metric details, and explicitly flip preflight to one allowed scheduling owner.
- 2026-07-01: Second critic pass approved implementation. P47 owner now has two public commands: `scheduleHitCanvasBuildIfNeeded` and `cancelScheduledHitCanvasBuild`.
- 2026-07-01: Code review and architecture review both cleared the boundary. Their shared simplification request removed the unused clear-only API. QA requested coverage for empty scheduled-handle returns, now covered in `tests/hit_canvas_scheduling_owner_behavior.test.mjs`.
- 2026-07-01: The `map_renderer.js` wrapper remains an internal renderer function with a closed public facade. Execution coverage is at the owner API plus map-renderer source-boundary checks, architecture checker gates, and required scenario/refresh contract tests.

## Validation Results

Passed after the review fix:
- `node --check js/core/map_renderer/hit_canvas_scheduling_owner.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/hit_canvas_scheduling_owner_behavior.test.mjs`
- `node --check tests/hit_canvas_scheduling_owner_inventory.test.mjs`
- `node --check tests/renderer_hit_canvas_scheduling_inventory_boundary.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
- `npm run test:node:hit-canvas-scheduling-owner`
- `npm run test:node:hit-canvas-scheduling-owner-inventory`
- `npm run test:node:renderer-hit-canvas-scheduling-inventory`
- `npm run test:node:hit-canvas-scheduling-owner-suite`
- `npm run test:node:renderer-render-lifecycle-inventory`
- `npm run test:node:renderer-render-request-boundary`
- `npm run test:node:renderer-render-phase-lifecycle`
- `npm run test:node:visible-frame-diagnostics`
- `npm run test:node:interaction-hit-candidates`
- `npm run test:node:scenario-chunk-contracts`
- `npm run test:node:scenario-refresh-plans`
- `npm run test:node:exact-after-settle-refresh-plans`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `npm run verify:state-write-allowlist`
- `git diff --check` with Windows LF-to-CRLF warnings only.

Not run:
- Optional browser/dev-server E2E smoke. P47 is a narrow renderer owner extraction, and the required Node/static/scenario contract suite covered the changed scheduling path and closed boundary list.

## Validation Owner

Main agent owns all `node --check`, `npm run ...`, architecture, state-write, diff, commit, and push commands. Subagents may inspect files and report findings; they must not run or poll live commands.

## Current Risk Register

- Red path overlap: `js/core/map_renderer.js`, `package.json`, `tools/check_architecture_boundaries.mjs`, and `docs/active/_worktree_registry.md` are common renderer integration hot files.
- Yellow semantic risk: scenario refresh calls the wrapper by injection, so the wrapper surface must remain stable.
- Green boundaries: public facade, state-write allowlist, `dist/**`, exact scheduler, spatial index owner, interaction candidates, and interaction event binding stay textually unchanged by this task.
