# Context

## 2026-06-21 Start

- Loaded skills: `ultragoal`, `systematic-debugging`, `code-review`.
- Created isolated worktree from `origin/main@b2f3a97ef073bf5cc4c7743ede3ea079f0530471`.
- Parent checkout is dirty on `main@29c008f73348752ced55ebd56f916d734b86e37e` with unrelated docs/archive WIP and modified `lessons learned.md`.
- Read project rules, lessons learned, and active worktree registry.
- Created Ultragoal aggregate plan under `.omx/ultragoal/` with 5 stories. Current story: G001 reproduce and classify render transaction warnings before behavior edits.
- Live process owner: main Codex agent only.
- Static mapping helper: `code-mapper` subagent `019eeb4e-2442-7693-b396-6a87ec2937b8`, read-only.

## Initial Evidence

- `git rev-parse HEAD` and `git rev-parse origin/main` both returned `b2f3a97ef073bf5cc4c7743ede3ea079f0530471` in the worktree.
- `docs/active/_worktree_registry.md` still describes stage 2 closeout and needs a current stage 3 row.
- `render_transaction_diagnostics.js` owns the four warning codes targeted in this phase.
- `scenario_refresh_runtime.js`, `chunk_runtime.js`, and `map_renderer.js` contain the hot paths for political payload readiness and resolved color readiness.

## Working Hypothesis

Warnings should be treated as symptoms until runtime sampling proves their phase. Stable-frame violations are likely to come from one of three sources: empty promoted political payload accepted as ready, color rebuild running before the political visual collection is complete, or visible-frame reuse accepting a stale data/color identity.

## 2026-06-21 Runtime Classification

- Final runtime/browser sample saved to `.runtime/output/render-diagnostics/stage3-political-color-readiness.json`.
- Covered paths: TNO startup, TNO zoom/exact settle, TNO fill, fill then zoom, HOI4 startup, modern_world startup, and rapid scenario switch final idle.
- Final counts:
  - `stableCoreStage3WarningCount`: 0.
  - `stableDeferredStage4WarningCount`: 2.
  - `resolved-colors-empty-with-land`: 7 total, all transient before stable visible frame.
  - `political-visible-subset-empty-with-required-chunks`: 17 total, all transient before promotion visual complete.
  - `render-reuse-across-data-generation`: 0.
  - `pending-color-edit-cleared-without-render`: 0.
  - `visible-required-layer-missing`: stable remaining entries are `relief` at `visible-frame-committed`, with `stateFeatureCount=0` and `mergedPayloadState=empty`; water and `scenario_atlantropa` appeared only as transient warnings in the final sample.

## Root Causes And Fixes

- Some scenario apply and render invalidation phases were early committed/transient boundaries, but diagnostics lacked a stable/transient classifier for them. Added `phaseKind` classification and tests so stable-frame checks are separable from startup/apply churn.
- Stable visible frames could reach draw with land features present and an empty resolved color map. Added a bounded `ensureResolvedColorsReadyForStableVisibleFrame()` rebuild before `drawCanvas()`, guarded by scene/data/topology/color/source/land signature to avoid rebuild loops and to retry when the resolved color source switches from `landData` to `landDataFull`.
- Scenario lifecycle resets such as `set-map-data`, `init-map`, and stale scenario color rebuilds could look like fill-path lost render proof. Added explicit reset reasons so lifecycle cleanup stays separate from `pending-color-edit-cleared-without-render`.
- The dev E2E exposed an exact-after-settle stranded state: `renderPhase=idle`, `deferExactAfterSettle=true`, `exactAfterSettleHandle=false`. Root cause was a pre-paint identity/phase mismatch path that reset the controller without a local recovery path. Added `abortInterruptedExactAfterSettleRefresh()` to record `settleExactRefreshAbortBeforePaint`, reset the stale controller, preserve/re-arm exact refresh when defer is still active, invalidate the political pass narrowly, and request a recovery render.
- The political core payload path did not need a runtime behavior change: final stable samples show visual-complete frames recover to non-empty political payloads; empty political payload warnings remain transient.
- Visible frame reuse did not need a key change: final sampling and diagnostics show `render-reuse-across-data-generation=0`.

## Validation Evidence

- Syntax checks passed for `js/core/map_renderer.js`, `js/core/map_renderer/exact_after_settle_scheduler.js`, `js/core/scenario/chunk_runtime.js`, `js/core/scenario_post_apply_effects.js`, `js/core/renderer/render_transaction_diagnostics.js`, and `js/core/scenario/scenario_renderer_bridge.js`.
- `npm run test:node:render-transaction-diagnostics`: 16/16 passed.
- `npm run test:node:scenario-apply-transaction-ownership`: 3/3 passed.
- `npm run test:node:scenario-runtime-state-behavior`: 6/6 passed.
- `npm run test:node:renderer-runtime-state-behavior`: 10/10 passed.
- `npm run test:node:scenario-chunk-contracts`: 55/55 passed.
- `npm run test:e2e:scenario-apply-concurrency`: 1/1 passed.
- `npm run test:e2e:dev:scenario-chunk-runtime`: 8/8 passed after fixing the exact-after-settle stranded defer path and re-running after the re-arm review fix.
- `npm run verify:pages-dist`: dist build, 38 startup shell tests, and 8 landing showcase tests passed.
- Independent code-review subagent returned approve-with-notes and no must-fix findings.
- Independent architecture subagent initially blocked on resolved color source identity and exact-after-settle re-arm; both blocker fixes landed, and the focused contract plus E2E checks passed afterward.

## Non-goals Preserved

- Scenario apply queue ownership/currentness logic was not expanded.
- Chunk selection strategy and render budget hints were not changed.
- Water, scenario_atlantropa, and relief semantic layer coverage were not fixed in this stage.
- Worker, OffscreenCanvas, WebGL, vector tile defaults, and performance thresholds were not changed.
