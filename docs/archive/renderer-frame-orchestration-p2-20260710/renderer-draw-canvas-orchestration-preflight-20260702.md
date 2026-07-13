# Renderer Draw Canvas Orchestration Preflight P53

## Scope and guardrails

P53 is preflight only. It inventories `drawCanvas()` pass orchestration before any implementation.

Allowed changes:

- `docs/archive/renderer-frame-orchestration-p2-20260710/renderer-draw-canvas-orchestration-preflight-20260702.md`
- `tests/renderer_draw_canvas_orchestration_inventory_boundary.test.mjs`
- `package.json`
- `tools/check_architecture_boundaries.mjs`
- `docs/active/_worktree_registry.md`

Closed boundaries:

- No production runtime changes.
- No `js/core/map_renderer.js` changes.
- No render pass drawing function movement.
- No hit canvas build movement.
- No exact-after-settle scheduler movement.
- No scenario refresh/chunk movement.
- No strategic overlay runtime or render movement.
- No public facade, state-write allowlist, or `dist/**` changes.
- No broad `renderer_render_lifecycle_owner`.

## Current P52 render pass cache baseline

P51 is landed on default main as commit `725abb4a305a03687e7bca358ff918ba659cfef1`.
P52 is landed on default main as commit `c60fd9239f8352b1916686b6dac8ee16eee8f017`.

Current baseline after P52:

- `function renderPassToCache(passName, drawFn, transform, timings)` remains in `js/core/map_renderer.js`.
- P51 `render_pass_cache_host_owner.js` owns only pass host setup: pass canvas, 2D context, pass layout, target preparation, and `drawFn(k)`.
- P52 `render_pass_commit_accounting_owner.js` owns only post-host commit/accounting: commit-skipped metrics, reference transforms, signatures, dirty flags, timing, counters, political metadata, and political warmup.
- `renderPassToCache` is now a stable wrapper that calls P51 first and P52 second.
- `drawCanvas()` remains untouched in `js/core/map_renderer.js`.

## drawCanvas entry and phase inventory

`function drawCanvas()` remains in `js/core/map_renderer.js`.

Current entry duties:

- Checks renderer surface/path readiness.
- Ensures layer data from topology.
- Increments the `drawCanvas` perf counter.
- Clears stale political patch overlay state.
- Cancels non-idle political path warmup.
- Promotes deferred color render to idle when allowed.
- Creates per-frame timing state.
- Chooses fast transformed frame vs exact idle frame.
- Records last-frame cache state.
- Marks first visible frame through the visible-frame diagnostics owner wrapper.
- Captures last good frames when the frame is stable enough.
- Finalizes exact-after-settle after a successful exact frame.
- Increments the `frames` counter.

P53 locks this as orchestration inventory. It does not move `drawCanvas()`.

## Idle pass orchestration inventory

Idle/exact rendering inside `drawCanvas()` currently does this:

- Calls `resetContextBreakdownForExactFrame()`.
- Resolves active pass names through `getActiveRenderPassNames()`.
- Delegates idle pass preparation to `getRenderPipelinePassesOwner().ensureIdleRenderPasses(frameTimings, activeRenderPassNames)`.
- Composes the requested cached passes through `composeCachedPasses(activeRenderPassNames)`.
- Calls `abortPendingExactAfterSettleRefreshAfterPaint("compose-cached-passes-failed")` when exact composition fails.

`render_pipeline_passes.js` remains authoritative for idle pass preparation and injected `renderPassToCache` calls.
`render_pipeline_catalog.js` remains authoritative for `IDLE_RENDER_PASS_DEFINITIONS`.
`render_pass_catalog.js` remains authoritative for pass-name groups such as `RENDER_PASS_NAMES`, `INTERACTION_COMPOSITE_PASS_NAMES`, and `TRANSFORMED_FRAME_PASS_NAMES`.

## Interactive/transformed frame pass inventory

Interactive, settling, and deferred-exact idle frames currently flow through:

- `drawTransformedFrameFromCaches(frameTimings, { interactiveBorders })`
- `getActiveTransformedFramePassNames()`
- `canDrawTransformedPass(...)`
- `getInteractionCompositeReuseDecision(...)`
- `buildInteractionComposite(...)`
- `drawInteractionComposite(...)`
- `composeTransformedFrameToBuffer(...)`
- `drawLastGoodFrameFallback(...)`
- `drawBaseVisibleFrameFallback(...)`

This path owns fast-frame reuse and composition decisions around existing cached passes. P53 does not extract transformed-frame composition.

## First visible frame and diagnostics boundary

`visible_frame_diagnostics_owner.js` remains the diagnostics owner for first visible frame state, blocked-frame reasons, committed frame identity, and visible-frame transaction diagnostics.

`map_renderer.js` keeps the thin wrappers:

- `markFirstVisibleFramePainted(reason = "visible-frame")`
- `resetFirstVisibleFramePainted(reason = "reset")`
- first visible frame block/diagnostic helpers

`drawCanvas()` calls `markFirstVisibleFramePainted(...)` after a visible frame is drawn. P53 does not move diagnostics logic.

## Hit canvas scheduling/build boundary

`hit_canvas_scheduling_owner.js` owns only deferred hit canvas scheduling and scheduled-handle cancellation.

Hit canvas draw/build/probe work remains in `js/core/map_renderer.js`, including:

- `function drawHitCanvas()`
- `function drawHitCanvasWithMetric(details = {})`
- `async function buildHitCanvasAfterStartup(...)`
- `function ensureHitCanvasUpToDate(...)`
- hit-candidate validation and point-probe paths

P53 locks that hit canvas build remains outside any drawCanvas orchestration owner.

## Exact-after-settle boundary

`exact_after_settle_scheduler.js` remains the owner for exact-after-settle scheduling, controller state transitions, sliced exact pass preparation, deferred exact context refresh, and post-paint finalize/abort.

`drawCanvas()` only observes this boundary through existing wrappers:

- `abortPendingExactAfterSettleRefreshAfterPaint(...)`
- `finalizePendingExactAfterSettleRefreshAfterPaint()`

P53 does not move exact-after-settle scheduler behavior.

## Scenario refresh/chunk boundary

`scenario_refresh_runtime.js` remains the owner for scenario apply refresh and scenario chunk promotion visual/infra flow.

It receives dependencies by injection from `map_renderer.js`, including render scheduling, hit canvas scheduling, invalidation, reset, overlays, and spatial rebuild hooks.

P53 keeps scenario refresh/chunk behavior separate from drawCanvas orchestration.

## Strategic overlay render boundary

Strategic overlay behavior remains separated:

- `strategic_overlay_runtime_owner.js` owns runtime interaction/editing state.
- `strategic_overlay_render_owner.js` owns strategic overlay render delegation.
- `strategic_overlay_helpers_owner.js` owns helper-level rendering support for strategic overlays.

P53 does not move strategic overlay runtime or render behavior into drawCanvas orchestration.

## P54/P55 allowed first move candidates

Allowed first move candidates after this preflight:

- Add a drawCanvas orchestration owner that only selects pass groups and delegates to existing pass functions/helpers.
- Add a transformed-frame compositor adapter preflight.
- Add a first-render acceptance adapter if P42 does not already cover the acceptance boundary fully.

The smallest safe implementation step is a drawCanvas orchestration owner that receives injected helpers and returns a frame decision summary while leaving every render pass drawing function in place.

## Forbidden areas

P54/P55 must not start by moving individual pass drawing functions.

Forbidden in this P53 preflight:

- Production runtime changes.
- `drawCanvas()` movement out of `map_renderer.js`.
- `renderPassToCache` movement out of `map_renderer.js`.
- Render pass drawing function movement.
- Hit canvas build movement.
- Exact scheduler movement.
- Scenario refresh/chunk movement.
- Strategic overlay runtime or render movement.
- Public facade changes.
- State-write allowlist changes.
- `dist/**` changes.
- Broad `renderer_render_lifecycle_owner`.

## Required validation commands

- `node --check tests/renderer_draw_canvas_orchestration_inventory_boundary.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
- `npm run test:node:renderer-draw-canvas-orchestration-inventory`
- `npm run test:node:render-pass-cache-host-owner-suite`
- `npm run test:node:render-pass-commit-accounting-owner`
- `npm run test:node:renderer-render-lifecycle-inventory`
- `npm run test:node:render-pipeline-catalog`
- `npm run test:node:render-transaction-diagnostics`
- `npm run test:node:exact-after-settle-refresh-plans`
- `npm run test:node:scenario-refresh-plans`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `npm run verify:state-write-allowlist`
- `git diff --check`
