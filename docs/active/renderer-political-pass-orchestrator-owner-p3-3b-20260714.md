# P3.3b Political Pass Orchestrator Owner

## Objective

Extract the political pass top-level state machine into one canonical, import-free owner while preserving every worker, cache, drawing, scheduling, diagnostic, and runtime-state effect in the `map_renderer.js` composition root.

## Canonical boundary

- Owner: `js/core/renderer/political_pass_orchestrator_owner.js`
- Stable entry host: `js/core/map_renderer.js`
- Stable entry: `drawPoliticalPass(k)`
- Owner factory: `createPoliticalPassOrchestratorOwner({ getters, effects })`
- Owner method: `drawPoliticalPass(k)`

The owner receives narrow getters and effects. It never imports `map_renderer.js`, global state, `RendererRuntimeContext`, D3, DOM, canvas, worker, cache, or political drawing implementations. Its frozen API returns the four existing committed result shapes for bitmap, missing-land, progressive-coarse, and fine paths. The HGO skip retains the existing `undefined` result.

## Preserved order

1. HGO preview admission.
2. Political identity resolution.
3. Initial worker snapshot.
4. Viewport and visible-item resolution.
5. Visible-item metrics and diagnostics.
6. Ready worker bitmap consumption.
7. Political background drawing.
8. Missing-land termination.
9. Worker packet construction and optional request.
10. Post-request worker snapshot.
11. Progressive-coarse recovery decision and draw.
12. Fine political feature loop and final result.

The accepted worker callback remains composition-root code and keeps invalidate → render-request boundary → direct-render fallback order. `tryPartialPoliticalPassRepaint` remains upstream and owns its existing admission, spatial selection, path-cache, drawing, edit-state, and metric behavior.

## State and effect ownership

The owner has no direct runtime-state write. Recovery-quality resolution is injected as an explicit effect because the existing resolver can update diagnostics/state. Visible political items are forwarded as one opaque call-local value to composition-root effects; the owner does not inspect, mutate, copy, or retain feature geometry.

## Protected surfaces

- Render pass order and catalogs stay unchanged.
- P2 frame owners, P3 visual-effects/context owners, and `renderPassToCache()` stay unchanged.
- The public facade exports stay unchanged.
- `RendererRuntimeContext` receives no political/effects section.
- The state-writer allowlist receives no political owner entry.
- Worker, packet, cache, collection, color, spatial-index, partial-repaint, progressive-recovery, and fine-drawing algorithms remain in existing modules or the composition root.

## Verification contract

Named deterministic entries:

- `test:node:political-pass-orchestrator-owner`
- `test:node:renderer-political-pass-orchestration-preflight`
- `test:python:map-renderer-political-pass-orchestrator-boundary`
- `test:python:map-renderer-render-pipeline-passes-boundary`
- `test:node:scenario-chunk-contracts`
- `test:node:political-raster-worker-packet`
- `test:node:political-collection-fragment-camouflage`

Main-thread acceptance lanes:

- `test:e2e:dev:political-progressive-recovery`
- `test:e2e:dev:scenario-chunk-runtime`
- `test:e2e:scenario-resilience`
- `test:e2e:physical-layer-runtime-contract`
- `test:e2e:water-rendering`
- `test:e2e:tno-contracts`
- `perf:gate`

Final results and exact candidate SHA are recorded in the P3 context, registry delivery package, and generated verification reports after clean-head acceptance.
