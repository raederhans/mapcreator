# Renderer Cached Pass Compositor Owner P2.2a

Date: 2026-07-11

Canonical owner: `js/core/renderer/cached_pass_compositor_owner.js`

## Purpose

P2.2a moves the two cached-pass canvas composition algorithms behind one import-free owner while keeping `js/core/map_renderer.js` as the composition root. `drawTransformedPass()` and `composeRenderPassesToTarget()` own cached-pass canvas composition. Their existing names remain as thin private wrappers in `map_renderer.js`, so export and transformed-frame callers retain their current call shape.

## Owner contract

- Factory: `createCachedPassCompositorOwner({ constants, getters, helpers, effects })`.
- Frozen API: `drawTransformedPass()` and `composeRenderPassesToTarget()`.
- `getActiveTargetContext()` is resolved on every transformed-pass draw.
- Each public method captures one normalized render-pass cache snapshot through `getRenderPassCacheSnapshot()` and reads every pass canvas plus dirty diagnostic from that method-local view.
- The owner receives reference transforms, layouts, DPR, phase, transform helpers, and diagnostics publication through narrow direct-call dependencies.
- The owner receives no raw runtime state, mutable render-cache owner, surface host, RendererRuntimeContext, D3, DOM, or global object.
- Diagnostics writes stay in the `map_renderer.js` composition-root effect.

## Preserved behavior

- Transformed-pass math keeps the original `scaleRatio`, `dx`, `dy`, layout-offset, DPR, translate, scale, and draw order.
- Explicit reference transforms bypass the reference getter.
- `requireAllPasses` completes the canvas preflight before the reference-transform preflight and returns the full missing-name list with the original reason schema.
- Non-required missing canvases are skipped; non-required missing references use the direct draw path.
- Equivalent transforms keep rounded negative layout offsets.
- The root compose wrapper forwards the caller's `options` object unchanged; the owner parameter destructures `{ requireAllPasses = false } = {}` before entering the function body.
- A caller-supplied `null` options value preserves the historical `TypeError` before any cache snapshot read. Getter-backed `requireAllPasses` is evaluated exactly once and before `getRenderPassCacheSnapshot()`.
- DPR evaluation stays at the original canvas draw site: after `save()` and `setTransform()` for transformed draws, and after layout resolution for direct draws.
- Successful composition returns `{ ok: true }`; a missing target returns `{ ok: false, reason: "missing-target-context" }`.
- `renderExportPassesToCanvas()` continues to call the stable `composeRenderPassesToTarget()` wrapper.

## Protected adjacent boundaries

`composeTransformedFrameToBuffer()` and `drawTransformedFrameFromCaches()` remain in `js/core/map_renderer.js` for P2.2b. Interaction-composite build/draw, border composition, last-good/base-visible fallback, concrete pass drawing, `renderPassToCache()`, exact scheduling, scenario refresh, hit-canvas work, strategic overlays, and click effects remain at their established boundaries.

Public facade, RendererRuntimeContext, and state-write allowlist remain unchanged.

## Size and verification

- `map_renderer.js` baseline: 23,437 split lines.
- P2.2a implementation: 23,376 split lines, net reduction 61.
- Cached-pass owner after the final contract microfix: 175 split lines, within the 320-line owner ceiling.
- Named Node behavior and combined Python boundary tests lock the dependency surface, transform math, dynamic target lookup, compose schema, thin wrappers, protected adjacent algorithms, and owner uniqueness.
- P53, scenario, Pages startup, architecture, verification metadata, selector, dist, and full-core contracts are upgraded in the same functional slice.

Browser, Playwright, perf, and main-thread acceptance remain assigned to the separate acceptance lane.

## Clean-head deterministic closeout

- Initial extraction Lore commit: `2f4ed71d8455bc16ad87ff361ac3f106360aa8c0`.
- Review-fix Lore commit: `aa34b8b43ad52590f4c5fc553ff4b13d74fceab4`.
- The review fix replaces per-pass cache getters with one normalized snapshot per public method. Behavior tests prove snapshot call count `1` for transformed draw, non-required multi-pass compose, and require-all multi-pass compose. They also lock exact `options` forwarding and the original DPR evaluation order.
- Final contract microfix Lore commit: `76977207`. It restores parameter-destructuring semantics while retaining exact root-wrapper forwarding and the one-snapshot contract.
- Owner behavior now passes 13/13, including `null` options rejection before snapshot capture and getter order `requireAllPasses` then cache snapshot.
- The first clean-head core run exposed one stale source-scan boundary: the render-cache receiver test still sliced through the next historical owner. The boundary now ends at `getCachedPassCompositorOwner()`, so the test inspects only `getRenderCacheOwner()`; the focused receiver suite passes 10/10. Production code was unchanged by this repair.
- Clean review-fix `npm run verify:dist-drift` exits 0. Log: `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-2a-review-fix/43-clean-verify-dist-drift.log`.
- Clean review-fix `npm run verify:core` exits 0 with 64/64 commands, zero failures, zero omitted commands, and zero duplicate commands. Report: `.runtime/reports/generated/verify-core.json`. Log: `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-2a-review-fix/44-clean-verify-core.log`.
- Functional review-fix adaptive selection records 9 changed files, 27 recommended commands, 1 main-thread lane, and 0 unmatched files in `.runtime/reports/generated/p2-2a-review-fix-adaptive.json`.
- Evidence-doc selection records 4 changed files, 9 recommended commands, 0 main-thread lanes, and 0 unmatched files in `.runtime/reports/generated/p2-2a-review-fix-docs-adaptive.json`.
- Final microfix adaptive selection records 7 changed files, 13 recommended commands, 1 main-thread lane, and 0 unmatched files in `.runtime/reports/generated/p2-2a-contract-microfix-adaptive.json`.
- Final evidence-doc selection records 4 changed files, 9 recommended commands, 0 main-thread lanes, and 0 unmatched files in `.runtime/reports/generated/p2-2a-contract-microfix-docs-adaptive.json`.
- Source/dist blob parity is exact after the final microfix: cached compositor `55c3f02bdf6da3f57ba1a7266a4954cd51bed249`; `map_renderer.js` remains byte-identical to the prior review-fix source and mirror.
- Final clean-head `npm run verify:dist-drift` exits 0. Log: `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-2a-contract-microfix/10-clean-verify-dist-drift.log`.
- Final clean-head `npm run verify:core` exits 0 with 64/64 commands, zero failures, zero omitted commands, and zero duplicate commands. Report: `.runtime/reports/generated/verify-core.json`. Log: `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-2a-contract-microfix/11-clean-verify-core.log`.
- The historical P51 inventory initially reported the expected dirty-tree failure while generated `dist/**` changes were uncommitted. The same clean-head P51 suite passes 26/26 after the functional commit, confirming that the failure was its intentional clean-worktree diff guard.
- The isolated lane is ready for static review plus the separately owned browser/main-thread/performance acceptance. The seven E2E main-thread commands remain explicitly skipped by the deterministic core lane.
