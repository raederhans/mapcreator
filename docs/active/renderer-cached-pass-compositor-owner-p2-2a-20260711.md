# Renderer Cached Pass Compositor Owner P2.2a

Date: 2026-07-11

Canonical owner: `js/core/renderer/cached_pass_compositor_owner.js`

Status: implementation and deterministic gates are complete; exact-head browser gates pass; governed A/B acceptance is `blocked` by startup/canonical regression, block drift, and direction checks

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

Browser, Playwright, perf, and main-thread acceptance were assigned to the separate acceptance lane and are recorded below.

## Exact-head browser and governed performance acceptance — 2026-07-11

Acceptance candidate `8eda8c5ce19f54fd839e72e3031a2424a4e658f3` was compared with immediate governed ancestor `ab86b1e24d161edbe6bcc80acb0b316e4bf81942`.

Browser evidence is green on one dedicated port-8892 server:

- `verify:core:main-thread` exited 0 with 68 commands; smoke 4/4, scenario-apply concurrency 1/1, project save/load 5/5, and interaction funnel 3/3 passed.
- `test:e2e:physical-layer-runtime-contract` passed 1/1.
- `test:e2e:scenario-resilience` passed 3/3.
- Cleanup removed matching server metadata, closed ports 8000/8892, and left zero task-owned Chromium processes.

The governed performance sequence used `A1 -> B1 -> B2 -> A2`; every block used `tno_1962,hoi4_1939`, three warmups, five measured runs, the same schema-2 runner and role policy, the same lockfile/environment/query/workload identity, and a passing quiet-window attempt. All four blocks exited 0 and produced 40/40 matched `last-post-promotion-idle-scenario-frame-v1` samples with zero role mismatches.

Pooled adjudicative results:

| Scenario | Startup A | Startup B | Delta | Canonical render A | Canonical render B | Delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `tno_1962` | 7378.10ms | 7237.50ms | -140.60ms / -1.91% PASS | 1393.60ms | 1355.50ms | -38.10ms / -2.73% PASS |
| `hoi4_1939` | 6589.45ms | 7172.80ms | +583.35ms / +8.85% FAIL | 804.45ms | 883.00ms | +78.55ms / +9.76% FAIL |

Block drift also fails closed. TNO A/B startup drift is 30.37%/31.75% and canonical drift is 32.93%/35.87%. HOI4 A/B startup drift is 31.44%/9.30% and canonical drift is 44.15%/17.73%. HOI4 block-pair deltas reverse beyond the registered deadbands. Outlier rules pass.

`renderSampleMedianMs` remains diagnostic. TNO legacy A/B is 840.45/832.75ms; HOI4 is 646.08/698.45ms. First-role composition is TNO A blank/scenario 9/1 and B 8/2; HOI4 is scenario 10/10 on each side.

Decision: `blocked`. Failed checks are `startup_regression`, `canonical_render_regression`, `block_drift`, and `opposite_direction_beyond_deadband`. P2.2b entry stays closed until a separately approved fresh governed experiment produces admissible evidence.

Evidence:

- Browser root: `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-2a-acceptance/browser/`.
- Performance artifacts: `.runtime/output/perf/p2-2a-acceptance/20260711/`.
- Report: `.runtime/reports/generated/p2-2a-performance-ab-20260711.json` SHA256 `277dba80fafb796b1d96ee0793e18a4eab1281e790908a778c617857a0dc7ddc` and companion Markdown SHA256 `15359b93c75a36d1f5f0a442710f248517eaaa40b995d421b0b4e5e554edec45`.
- Raw manifest: `.runtime/output/perf/p2-2a-acceptance/20260711/raw-sha256-manifest.json` SHA256 `c832d438cef94962ac2fb88623fca6464f3e8d11f94732aa09ffb4a2f1279246`, covering 40 files.
- The temporary control worktree and node_modules junction were removed after original control runner/policy bytes were restored. Parent checkout WIP remained untouched.
- Earlier harness-only attempts are retained under the acceptance artifact root. They contain preflight/validation or quiet-gate process evidence and contribute no samples to the adjudicative A/B report.

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
- The isolated lane completed static/deterministic closeout before the separately owned browser/main-thread/performance acceptance recorded above. The deterministic core report retained seven explicit main-thread skips; the acceptance owner ran the required browser set directly.
