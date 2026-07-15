# P3.3a Political-Pass Orchestration Preflight

## Scope and invariants

P3.3a is preflight only.

Production runtime diff is zero. `js/**`, `dist/**`, the public renderer facade, the state-writer allowlist, both pass catalogs, P2 owners, P3.1/P3.2 owners, and RendererRuntimeContext retain their current bytes and ownership.

`drawPoliticalPass(k)` remains in `js/core/map_renderer.js` during P3.3a. This phase freezes the current branch order, return contracts, worker/cache seams, state/effect boundaries, browser lanes, and performance acceptance before P3.3b changes production code.

## Current drawPoliticalPass orchestration

The current top-level order is binding:

1. HGO preview records a skipped `drawPoliticalPass` metric and returns `undefined`.
2. The composition root resolves transform, logical dimensions, chunk-load state, and visible-frame identity.
3. It creates the worker identity from scene, scenario-data, selection, topology, color, transform-bucket, DPR, viewport, and political pass-signature identity.
4. It records the worker snapshot before viewport collection.
5. It builds one overscanned screen rectangle and collects visible spatial items only in `PROD` mode.
6. It records visible-item statistics, then publishes the current political diagnostics snapshot when diagnostics are enabled.
7. It consumes an accepted worker bitmap before any synchronous background work.
8. A successfully drawn bitmap records another worker snapshot and returns the fine-ready worker-bitmap result.
9. A missing or rejected bitmap continues into the synchronous background path.
10. Background fills execute and record their exact recovery/cache metric payload.
11. Missing land data returns the not-ready result after background painting and before packet construction.
12. The worker packet is built only when the bitmap flag is enabled; the disabled path still requests the worker pass with a null packet and fallback render-hint dimensions.
13. The accepted worker callback invalidates the political pass before requesting a non-flushing render with the existing `render()` fallback.
14. A third worker snapshot is recorded after the request is submitted.
15. Progressive coarse-skip admission checks background state, pending color edits, then visible foreground overrides.
16. The accepted coarse path records zero-duration fill and stroke metrics before returning its coarse result.
17. The fine path preserves shell-underlay ordering over either visible items or all land features.
18. The fine path records fill then stroke metrics, clears only painted pending edits, and returns the fine-feature-loop result.

The function keeps five return paths: one HGO `undefined` return and four `createPoliticalPassDrawResult` returns for worker bitmap, missing land, progressive coarse recovery, and the fine feature loop.

## Worker identity and bitmap path

Worker identity, packet construction, bitmap commit, and accepted-result repaint remain composition-root effects.

The worker identity continues to include:

- scene generation;
- scenario-data generation;
- scenario id;
- selection version with chunk-load fallback;
- topology and color revisions;
- transform bucket and DPR;
- the full logical viewport rectangle;
- the political pass signature.

The worker client and packet builder remain authoritative at:

- `js/core/political_raster_worker_client.js`;
- `js/core/map_renderer/political_raster_worker_packet.js`;
- `js/workers/political_raster.worker.js`.

P3.3b may call narrow composition-root effects for identity creation, bitmap consumption/commit, packet construction, request submission, and snapshot recording. The new owner does not move worker protocol, freshness checks, bitmap blitting, packet geometry, render-hint calculation, or the accepted-result callback.

## Background and missing-land path

`drawPoliticalBackgroundFills` and all progressive background-cache construction remain in `map_renderer.js`. The orchestrator receives one explicit effect that returns the existing summary object without reshaping it.

The background metric retains all existing fields:

- group and entry counts;
- reused, built, and pathless counts;
- cache-hit state;
- recovery quality;
- progressive state;
- deferred-full-cache readiness and scheduling;
- coarse-underlay identity.

Missing land remains a post-background, pre-worker-request result with:

```text
politicalDataStage: not-ready
fullPoliticalReady: false
finePoliticalCacheReady: false
reason: missing-land-data
```

## Progressive recovery and color-edit guard

The coarse-skip candidate remains true only when all four conditions hold:

1. the background summary is progressive;
2. the deferred full cache is not ready;
3. the coarse underlay is `admin0`;
4. no pending political color edit exists.

Visible political foreground overrides are queried only for an otherwise eligible candidate. Any visible override keeps the fine loop active. This preserves immediate editor feedback, newly visible feature overrides, and detail colors while the progressive background cache recovers.

The accepted coarse path records both `drawPoliticalFeatureFillLoop` and `drawPoliticalFeatureStrokeLoop` with `skipped: true`, `reason: progressive-coarse-underlay`, recovery quality, and the current visible-item count before returning the coarse result.

## Fine loop and state-effect ownership

The fine feature loop remains in `map_renderer.js`.

The following behavior also remains composition-root owned:

- island-neighbor graph lookup;
- `orderPoliticalShellUnderlayFirst` ordering;
- `drawPoliticalFeature` execution;
- path-cache, fill, stroke, outline, fragment, and camouflage algorithms;
- visible-item and full-land fallback iteration;
- fill/stroke metric collection;
- pending color-edit clearing and first-pixel accounting;
- political diagnostics writes;
- result construction through `createPoliticalPassDrawResult`.

The new owner may choose the top-level path and invoke these effects. A resolver may return one call-local opaque/read-only visible-items capsule so the owner can pass the same frame input to background, worker, foreground-override, and fine-loop effects. The owner never traverses feature geometry, writes the capsule, retains it across frames, or receives raw land features, feature metrics, cache objects, canvas contexts, or mutable state.

## P3.3b canonical owner contract

The canonical P3.3b owner path is `js/core/renderer/political_pass_orchestrator_owner.js`.

P3.3b adds one factory and one frozen API:

```js
createPoliticalPassOrchestratorOwner({
  getters,
  helpers,
  resolvers,
  effects,
}) -> Object.freeze({ drawPoliticalPass })
```

The owner receives explicit getters, helpers, resolvers, and effects; it never receives runtime state, RendererRuntimeContext, DOM, D3, canvas contexts, or an unbounded dependency bag.

The owner owns only top-level orchestration:

- HGO admission;
- identity/viewport/diagnostic sequencing;
- accepted worker-bitmap short circuit;
- background-before-missing-land sequencing;
- worker request sequencing;
- progressive coarse-skip decision and metric sequencing;
- delegation to the root-owned fine loop;
- selection among the four existing political draw-result paths.

`map_renderer.js` keeps a stable `drawPoliticalPass(k)` thin wrapper plus the singleton construction and all effect-bearing closures. P3.3b atomically upgrades this preflight contract from owner-absent to one canonical owner plus one thin wrapper.

## Protected boundaries

P3.3b keeps these surfaces unchanged:

- `render_pipeline_catalog.js` and `render_pass_catalog.js` pass names and order;
- `render_pipeline_passes.js` preparation, partial-repaint admission, cache signatures, and pass commit;
- `renderPassToCache()` and P51/P52 ownership;
- P2 draw-canvas and compositor owners;
- P3.1 visual-effects and P3.2 context-pass owners;
- `tryPartialPoliticalPassRepaint` and its fine-baseline checks;
- political background cache building and deferred-full-cache scheduling;
- political raster worker protocol/client/packet/bitmap algorithms;
- spatial collection, color resolution, shell ordering, feature drawing, and pending-edit clearing;
- public facade exports;
- RendererRuntimeContext schema;
- state-write allowlist entries.

No renamed political pass owner/helper/controller/adapter may coexist with the canonical owner.

## Verification lanes

Child-safe focused checks:

```text
npm run test:node:renderer-political-pass-orchestration-preflight
npm run test:node:scenario-chunk-contracts
npm run test:node:political-raster-worker-packet
npm run test:node:political-collection-fragment-camouflage
npm run test:node:render-pass-cache-host-owner-suite
npm run test:node:render-pass-commit-accounting-owner-suite
npm run test:node:render-pipeline-catalog
npm run test:python:map-renderer-render-pipeline-passes-boundary
npm run test:node:verification-metadata
npm run test:node:verify-core-runner
npm run verify:architecture-boundaries
npm run verify:state-write-allowlist
npm run verify:test-import-graph
npm run verify:supervisor-contracts
npm run verify:supervisor-plan
```

Main-thread lanes for the eventual P3.3b runtime change:

The dedicated political lane is `test:e2e:dev:political-progressive-recovery`; the standard performance gate is `npm run perf:gate`.

```text
npm run verify:core:main-thread
npm run test:e2e:dev:political-progressive-recovery
npm run test:e2e:scenario-resilience
npm run test:e2e:physical-layer-runtime-contract
npm run test:e2e:water-rendering
npm run test:e2e:tno-contracts
npm run perf:gate
```

P3.3a itself runs child-safe checks and proves a zero production/dist diff. P3.3b runs the full Pages, dist, core, main-thread, political browser, scenario browser, and standard performance acceptance sequence under one live-process owner.

## Stop rules

Stop when extraction requires moving the fine feature loop, worker packet builder, partial repaint, state writes, pass order, public facade, or RendererRuntimeContext.

Also stop on any of these conditions:

- the new owner needs raw runtime state, cache objects, DOM, D3, or canvas contexts;
- the coarse-skip predicate or result schema must change;
- pending edits or visible overrides would stop forcing the fine loop;
- the accepted worker callback order would change;
- the state-writer allowlist would grow;
- an adaptive route gap appears;
- browser output or standard performance regresses;
- unrelated parent-checkout WIP is touched.
