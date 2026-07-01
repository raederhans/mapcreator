# Renderer Render Pass Cache Host Preflight P50

## Scope and guardrails

P50 is preflight only.

No production runtime behavior changes.

Allowed P50 file scope:

- `docs/active/renderer-render-pass-cache-host-preflight-20260701.md`
- `tests/renderer_render_pass_cache_host_inventory_boundary.test.mjs`
- `package.json`
- `tools/check_architecture_boundaries.mjs`
- `docs/active/_worktree_registry.md`

`renderPassToCache(` remains in `map_renderer.js`.

`drawCanvas()` remains in `map_renderer.js`.

No render pass drawing functions move.

No public facade changes.

No state-write allowlist changes.

P50 does not touch `dist/**`.

## Current P47 renderer lifecycle baseline

Current default-main renderer lifecycle baseline includes P40 render lifecycle preflight, P41 render request boundary owner, P42 visible frame diagnostics owner, P43 render phase lifecycle owner, P47 hit canvas scheduling owner, P48 map hover interaction owner, and P49 renderer transaction reset owner.

The active renderer composition root remains `js/core/map_renderer.js`.

P47 hit canvas scheduling ownership remains independent from render pass cache host ownership.

## renderPassToCache current entry inventory

`renderPassToCache(` is the current entry that `render_pipeline_passes.js` calls through injection.

Current entry anchors:

- `function renderPassToCache(passName, drawFn, transform, timings)`
- `const cache = getRenderPassCacheState();`
- `const passCanvas = ensureRenderPassCanvas(passName);`
- `const passContext = passCanvas.getContext("2d");`
- `withRenderTarget(passContext, () => {`
- `drawResult = drawFn(k);`

P50 keeps the entry in `js/core/map_renderer.js`.

## Pass canvas sizing and context acquisition inventory

Current pass host setup is still inside `renderPassToCache(`.

Current host anchors:

- `ensureRenderPassCanvas(passName)`
- `passCanvas.getContext("2d")`
- `if (!passContext) return;`
- `getRenderPassLayout(passName)`
- `prepareTargetContext(passContext, transform, layout)`

P51 may only move this host setup into a narrow adapter when the adapter delegates the same draw callback contract back to the existing pass drawing functions.

## Transform and reference-transform inventory

Current transform anchors:

- `passName === "hgoPreview"`
- `Math.max(0.0001, Number(transform?.k || 1))`
- `prepareTargetContext(passContext, transform, layout)`
- `setPassReferenceTransform(passName, transform);`
- `setPassFullReferenceTransform(passName, transform);`
- `clearPassFullReferenceTransforms([passName]);`

`render_transform_reuse_policy_owner.js` remains authoritative for transform reuse decisions.

P50 does not migrate transform reuse policy.

## Dirty/signature/cache-state inventory

Current cache-state anchors:

- `cache.signatures[passName] = getRenderPassSignature(passName, transform);`
- `cache.dirty[passName] = false;`
- `cache.partialPoliticalDirtyIds.clear();`
- `cache.counters.contextScenarioReuseCount = 0;`
- `cache.politicalPassSceneGeneration`
- `cache.politicalPassScenarioDataGeneration`
- `cache.politicalPassDataStage`
- `cache.politicalPassFullReady`
- `cache.politicalPassFineCacheReady`

`render_cache_owner.js` remains authoritative for render pass cache state, invalidation, pass canvas allocation, pass layouts, and reference transform helpers.

## Draw callback contract inventory

The current draw callback contract is:

- `drawFn` receives the resolved `k`.
- `drawResult` may return an object with `committed === false`.
- Declined commits record `renderPassCommitSkipped`.
- Political pass draw results may provide political data-stage and cache readiness metadata.

No render pass drawing functions move in P50.

P51 must not move render pass drawing functions.

## Pass timings and render transaction diagnostics inventory

Current timing anchors:

- `const passStart = nowMs();`
- `recordPassTiming(timings, passName, passStart);`
- `getPassCounterNames(passName).forEach((counterName) => incrementPerfCounter(counterName));`
- `recordRenderPerfMetric("renderPassCommitSkipped"`

`render_transaction_diagnostics.js` remains authoritative for transaction diagnostics behavior.

P50 does not migrate render diagnostics.

## Render cache owner boundary

`render_cache_owner.js` remains authoritative for:

- render pass cache state
- render pass canvas allocation
- render pass canvas sizing
- pass layout lookup
- pass signatures
- reference transforms
- full reference transforms
- dirty and invalidation helpers

The render cache owner must not import `map_renderer.js`.

## Render pipeline catalog boundary

Existing render pipeline and catalog owners remain authoritative:

- `render_pipeline_passes.js` owns idle pass preparation and calls injected `renderPassToCache`.
- `render_pipeline_catalog.js` owns idle pass definitions/catalog.
- `render_invalidation_catalog.js` owns invalidation vocabulary.
- `render_transform_reuse_policy_owner.js` owns transform reuse policy.

P50 does not duplicate these owners.

## Exact-after-settle and deferred pass boundary

`exact_after_settle_scheduler.js` remains authoritative for exact-after-settle scheduling.

Deferred/idle pass preparation remains in `render_pipeline_passes.js` and `render_pipeline_catalog.js`.

P50 does not migrate exact scheduler behavior.

P50 does not migrate scenario refresh runtime behavior.

P50 does not migrate strategic runtime or render behavior.

## P51 allowed first move

P51 may add a render pass cache host adapter owner.

The allowed P51 first move is limited to pass canvas/context acquisition and target context preparation around the existing draw callback.

P51 must preserve the current `drawFn(k)` callback contract.

P51 must delegate existing draw callback behavior and must keep render pass drawing functions in their current modules.

If P50 validation stays green, no additional preflight is required before a narrow P51 host adapter owner.

## Forbidden areas

P50 forbidden areas:

- No `renderPassToCache(` migration.
- No `drawCanvas()` migration.
- No render pass drawing function migration.
- No hit canvas build migration.
- No scenario refresh runtime migration.
- No exact-after-settle scheduler migration.
- No strategic runtime or render migration.
- No public facade changes.
- No state-write allowlist changes.
- No `dist/**` changes.

P51 forbidden areas:

- No broad renderer lifecycle owner.
- No render pass drawing function migration.
- No public facade changes unless a later implementation phase proves and documents the need.
- No state-write allowlist changes unless a later implementation phase proves and documents the need.

## Required validation commands

- `node --check tests/renderer_render_pass_cache_host_inventory_boundary.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
- `npm run test:node:renderer-render-pass-cache-host-inventory`
- `npm run test:node:renderer-render-lifecycle-inventory`
- `npm run test:node:renderer-render-request-boundary`
- `npm run test:node:renderer-render-phase-lifecycle`
- `npm run test:node:visible-frame-diagnostics`
- `npm run test:node:hit-canvas-scheduling-owner-suite`
- `npm run test:node:render-cache-owner`
- `npm run test:node:render-transform-reuse-policy-owner`
- `npm run test:node:render-pipeline-catalog`
- `npm run test:node:render-transaction-diagnostics`
- `npm run test:node:exact-after-settle-refresh-plans`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `npm run verify:state-write-allowlist`
- `git diff --check`
