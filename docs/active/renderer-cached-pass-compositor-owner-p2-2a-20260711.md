# Renderer Cached Pass Compositor Owner P2.2a

Date: 2026-07-11

Canonical owner: `js/core/renderer/cached_pass_compositor_owner.js`

## Purpose

P2.2a moves the two cached-pass canvas composition algorithms behind one import-free owner while keeping `js/core/map_renderer.js` as the composition root. `drawTransformedPass()` and `composeRenderPassesToTarget()` own cached-pass canvas composition. Their existing names remain as thin private wrappers in `map_renderer.js`, so export and transformed-frame callers retain their current call shape.

## Owner contract

- Factory: `createCachedPassCompositorOwner({ constants, getters, helpers, effects })`.
- Frozen API: `drawTransformedPass()` and `composeRenderPassesToTarget()`.
- `getActiveTargetContext()` is resolved on every transformed-pass draw.
- The owner receives pass canvas, reference transform, layout, DPR, phase, dirty state, transform helpers, and diagnostics publication through narrow direct-call dependencies.
- The owner receives no raw runtime state, render cache, surface host, RendererRuntimeContext, D3, DOM, or global object.
- Diagnostics writes stay in the `map_renderer.js` composition-root effect.

## Preserved behavior

- Transformed-pass math keeps the original `scaleRatio`, `dx`, `dy`, layout-offset, DPR, translate, scale, and draw order.
- Explicit reference transforms bypass the reference getter.
- `requireAllPasses` completes the canvas preflight before the reference-transform preflight and returns the full missing-name list with the original reason schema.
- Non-required missing canvases are skipped; non-required missing references use the direct draw path.
- Equivalent transforms keep rounded negative layout offsets.
- Successful composition returns `{ ok: true }`; a missing target returns `{ ok: false, reason: "missing-target-context" }`.
- `renderExportPassesToCanvas()` continues to call the stable `composeRenderPassesToTarget()` wrapper.

## Protected adjacent boundaries

`composeTransformedFrameToBuffer()` and `drawTransformedFrameFromCaches()` remain in `js/core/map_renderer.js` for P2.2b. Interaction-composite build/draw, border composition, last-good/base-visible fallback, concrete pass drawing, `renderPassToCache()`, exact scheduling, scenario refresh, hit-canvas work, strategic overlays, and click effects remain at their established boundaries.

Public facade, RendererRuntimeContext, and state-write allowlist remain unchanged.

## Size and verification

- `map_renderer.js` baseline: 23,437 split lines.
- P2.2a implementation: 23,376 split lines, net reduction 61.
- Cached-pass owner: 170 split lines, within the 320-line owner ceiling.
- Named Node behavior and combined Python boundary tests lock the dependency surface, transform math, dynamic target lookup, compose schema, thin wrappers, protected adjacent algorithms, and owner uniqueness.
- P53, scenario, Pages startup, architecture, verification metadata, selector, dist, and full-core contracts are upgraded in the same functional slice.

Browser, Playwright, perf, and main-thread acceptance remain assigned to the separate acceptance lane.

## Clean-head deterministic closeout

- Functional Lore commit: `2f4ed71d8455bc16ad87ff361ac3f106360aa8c0`.
- The first clean-head core run exposed one stale source-scan boundary: the render-cache receiver test still sliced through the next historical owner. The boundary now ends at `getCachedPassCompositorOwner()`, so the test inspects only `getRenderCacheOwner()`; the focused receiver suite passes 10/10. Production code was unchanged by this repair.
- Clean-head `npm run verify:dist-drift` exits 0. Log: `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-2a-cached-compositor/clean-head/20-verify-dist-drift.log`.
- Clean-head `npm run verify:core` exits 0 with 64/64 commands, zero failures, zero omitted commands, and zero duplicate commands. Report: `.runtime/reports/generated/verify-core.json`. Log: `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-2a-cached-compositor/clean-head/22-verify-core-rerun.log`.
- Adaptive selection records 19 changed files, 195 recommended commands, 7 main-thread lanes, and 0 unmatched files in `.runtime/reports/generated/test-adaptive-selection.json`.
- Source/dist blob parity is exact: renderer `9467d79806d1f418c89527ac6b1a560ff11a27c1`; cached compositor `bc84b5c34f060282b573b333ba14344e59483f73`.
- The isolated lane is ready for static review plus the separately owned browser/main-thread/performance acceptance. The seven E2E main-thread commands remain explicitly skipped by the deterministic core lane.
