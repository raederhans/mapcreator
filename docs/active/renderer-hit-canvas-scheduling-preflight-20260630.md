# Renderer Hit Canvas Scheduling Preflight 2026-06-30

## Scope and guardrails

This preflight is docs, tests, and tooling only.

Allowed file scope:

- `docs/active/renderer-hit-canvas-scheduling-preflight-20260630.md`
- `tests/renderer_hit_canvas_scheduling_inventory_boundary.test.mjs`
- `package.json`
- `tools/check_architecture_boundaries.mjs`
- `docs/active/_worktree_registry.md`

Forbidden in this phase:

- No production runtime edits in `js/core/map_renderer.js`.
- No `hit_canvas_*` owner, helper, controller, or scheduler.
- No migration of `buildHitCanvasAfterStartup`.
- No changes to spatial index runtime owner, interaction event binding owner, interaction hit candidates, scenario refresh runtime, exact scheduler, public facade, state-write allowlist, or `dist/**`.

## Current P42 renderer lifecycle baseline

The current renderer extraction line already has narrow owners for request boundaries, visible-frame diagnostics, and render phase lifecycle. Hit canvas scheduling is still hosted by `js/core/map_renderer.js`.

Relevant baseline:

- P41 `render_request_boundary_owner.js` owns request/flush/fallback ordering only.
- P42 `visible_frame_diagnostics_owner.js` owns visible-frame diagnostic payload and metric ordering only.
- P43 `render_phase_lifecycle_owner.js` owns render phase value writes, phase-enter timestamps, phase timer clearing, phase idle scheduling, and reset phase state only.
- `renderer_render_lifecycle_owner.js` remains absent.
- `drawCanvas()`, `renderPassToCache()`, hit canvas build, scenario refresh runtime, exact scheduler, public facade, state-write allowlist, and `dist/**` remain outside the P41/P42/P43 owner moves.

## Hit canvas build entry inventory

The hit canvas build body remains in `js/core/map_renderer.js`.

Current anchors:

- `function drawHitCanvas()`
- `function drawHitCanvasWithMetric(details = {})`
- `function recordDeferredFullHitCanvasMetric({ reason = "deferred-full", keepReady = false } = {})`
- `async function buildHitCanvasAfterStartup({ keepReady = false, reason = "startup-deferred-hit-canvas" } = {})`
- `async function buildFullInteractionInfrastructureAfterStartup({ chunked = true, buildHitCanvas = true } = {})`

`buildHitCanvasAfterStartup` currently records the deferred-full metric and sets interaction infrastructure state to `hit-canvas-deferred`; it does not perform a full synchronous hit canvas rebuild. This body stays in `map_renderer.js` for the next owner boundary.

## Hit canvas dirty and topology revision inventory

Dirty/topology writes are still scattered across renderer host orchestration and scenario refresh paths. A first scheduling owner should not claim these writes.

Current anchors:

- `runtimeState.hitCanvasDirty` is set by startup/reset injection, fitProjection/viewport/secondary spatial paths, draw/build paths, interaction paths, and scenario refresh integration.
- `runtimeState.hitCanvasTopologyRevision = 0` is used when topology changes or hit canvas cannot be built.
- `runtimeState.hitCanvasTopologyRevision = Number(runtimeState.topologyRevision || 0)` is set after a successful hit canvas draw.
- `markRendererTopologyChanged({ hitCanvasDirty = false } = {})` still resets the hit canvas topology revision.
- `resetRendererTransactionState({ hitCanvasDirty = false } = {})` still passes the dirty flag into topology change handling.

The safe first owner boundary is scheduling and cancellation around an existing dirty signal. Dirty-source ownership should be a later phase with its own inventory.

## Hit canvas scheduling/cancel handle inventory

Scheduling is still local to `js/core/map_renderer.js`.

Current anchors:

- `function scheduleHitCanvasBuildIfNeeded({ reason = "idle-render" } = {})`
- `runtimeState.hitCanvasBuildScheduled`
- `runtimeState.hitCanvasBuildScheduled = scheduleDeferredWork(() => {`
- `runtimeState.hitCanvasBuildScheduled = null`
- `cancelDeferredWork(runtimeState.hitCanvasBuildScheduled)`

Current scheduling gates:

- hit context and hit path must exist.
- `runtimeState.hitCanvasDirty` must be true.
- `runtimeState.deferHitCanvasBuild` must be false.
- `runtimeState.renderPhase` must be idle.
- an existing `runtimeState.hitCanvasBuildScheduled` handle suppresses duplicate scheduling.

Current forced-validation path cancels the scheduled handle before synchronous build:

- `ensureHitCanvasUpToDate({ force: true })`
- `cancelDeferredWork(runtimeState.hitCanvasBuildScheduled)`
- `runtimeState.hitCanvasBuildScheduled = null`
- `drawHitCanvasWithMetric({ mode: "forced", reason: "strict-validation" })`

## Deferred startup and interaction infrastructure boundary

Deferred startup currently builds the basic spatial infrastructure first, then defers full hit canvas work.

Current anchors:

- `buildBasicInteractionInfrastructureAfterStartup`
- `buildFullInteractionInfrastructureAfterStartup`
- `runtimeState.deferHitCanvasBuild = false`
- `buildIndexChunked({ scheduleUiMode: "deferred" })`
- `buildSpatialIndexChunked({ includeSecondary: false })`
- `scheduleSecondarySpatialIndexBuild({ reason: "startup-deferred-secondary-spatial" })`
- `buildHitCanvasAfterStartup({ keepReady: true, reason: "startup-deferred-hit-canvas" })`
- `scheduleHitCanvasBuildIfNeeded({ reason: "startup-deferred-hit-canvas" })`

A scheduling owner may receive startup mode and dirty status through injected getters/effects. It should not own interaction infrastructure stage names or startup build sequencing.

## Spatial index dependency boundary

The spatial index runtime owner owns index construction and marks the hit canvas dirty when spatial data changes.

Current boundary:

- `js/core/renderer/spatial_index_runtime_owner.js` does not import `js/core/map_renderer.js`.
- `buildSpatialIndex` and `buildSpatialIndexChunked` mark `state.hitCanvasDirty = true`.
- The spatial owner does not schedule hit canvas builds.
- Secondary spatial index orchestration in `map_renderer.js` may call `scheduleHitCanvasBuildIfNeeded` after rebuilding secondary indexes.

A scheduling owner should depend on existing spatial readiness signals through injected getters. The spatial index runtime owner should remain independent.

## Scenario refresh and chunk promotion boundary

`scenario_refresh_runtime.js` receives `scheduleHitCanvasBuildIfNeeded` as an injected dependency from `map_renderer.js`.

Current anchors:

- `createScenarioRefreshRuntime({ ... scheduleHitCanvasBuildIfNeeded, ... })`
- deferred infra refresh calls `scheduleHitCanvasBuildIfNeeded({ reason: `${reason}-hit-canvas` })` when dirty.
- water/special secondary sync skip-deferred path calls `scheduleHitCanvasBuildIfNeeded({ reason: `${reason}-secondary-hit-canvas` })` when dirty.
- scenario apply keeps `resetRendererTransactionState({ hitCanvasDirty: true })`.
- scenario refresh currently resets `runtimeState.hitCanvasTopologyRevision = 0` during refresh transaction reset.
- scenario refresh runtime does not import a hit canvas owner.

A scheduling owner may be injected into `scenario_refresh_runtime.js` through the existing dependency slot after the owner exists. This preflight does not change that injection shape.

## Interaction hit candidate boundary

`interaction_hit_candidates.js` remains pure candidate ranking and hit-result support.

Current boundary:

- It exports candidate collection, ranking, containment, and hit-result helpers.
- It does not import `map_renderer.js`.
- It does not read or write `runtimeState`.
- It does not own hit canvas build, scheduling, cancellation, dirty flags, topology revision, or canvas pixel reads.

Hit canvas point probing and validated canvas reads remain in `map_renderer.js` for this preflight.

## P45/P47 allowed first move

Recommended next implementation: hit canvas scheduling owner.

Allowed first move:

- Add a narrow scheduling owner that owns only the deferred build handle, duplicate-schedule guard, idle/defer gating, and scheduled-handle cancellation.
- Keep `drawHitCanvas()`, `drawHitCanvasWithMetric()`, `recordDeferredFullHitCanvasMetric()`, `buildHitCanvasAfterStartup()`, point probe, dirty-source writes, and topology revision writes in `map_renderer.js`.
- Inject effects/getters for context/path availability, dirty state, defer state, render phase, `scheduleDeferredWork`, `cancelDeferredWork`, and the existing build metric function.
- Keep the existing `scheduleHitCanvasBuildIfNeeded` wrapper name in `map_renderer.js`.

Diagnostics-only owner is a lower-priority option because the current boundary question is about scheduling ownership and cancellation safety. Diagnostics can follow after scheduling is isolated, or stay in `map_renderer.js` until a metric-specific preflight exists.

## Forbidden areas

The next implementation phase must not begin by moving these areas:

- `drawHitCanvas()`
- `drawHitCanvasWithMetric()`
- `recordDeferredFullHitCanvasMetric()`
- `buildHitCanvasAfterStartup()`
- `getDirtyHitCanvasPointProbeHit()`
- `getValidatedCanvasHit()`
- dirty-source writes across renderer host, viewport, spatial, scenario refresh, and topology reset paths
- `runtimeState.hitCanvasTopologyRevision` ownership
- spatial index runtime owner
- interaction hit candidates
- interaction event binding owner
- scenario refresh runtime body
- exact-after-settle scheduler
- public facade
- state-write allowlist
- `dist/**`
- any new production `js/core/**` module whose filename contains `hit_canvas` or `hitCanvas`

## Required validation commands

- `node --check tests/renderer_hit_canvas_scheduling_inventory_boundary.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
- `npm run test:node:renderer-hit-canvas-scheduling-inventory`
- `npm run test:node:renderer-render-lifecycle-inventory`
- `npm run test:node:renderer-render-request-boundary`
- `npm run test:node:visible-frame-diagnostics`
- `npm run test:node:interaction-hit-candidates`
- `npm run test:node:scenario-chunk-contracts`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `npm run verify:state-write-allowlist`
- `git diff --check`
