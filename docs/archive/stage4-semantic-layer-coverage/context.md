# Stage 4 Semantic Layer Coverage Context

## 2026-06-21 Start

- Loaded skills: `ultragoal` and `code-review`.
- Parent checkout is `main@29c008f73348752ced55ebd56f916d734b86e37e`, behind `origin/main`, with unrelated docs/archive WIP and modified `lessons learned.md`.
- Created isolated worktree `C:\Users\raede\Desktop\dev\mapcreator-stage4-semantic-layer-coverage` from `origin/main@ee9ad5c8f23bf59abab3f995dd198e975c04775b`.
- Created Ultragoal aggregate plan under this worktree's `.omx/ultragoal/` and activated the aggregate Codex goal.
- Live process owner: main Codex agent only. Subagents are limited to static mapping, test planning, and final independent review.

## Stage 3 Evidence To Preserve

- Stage 3 final runtime sampling reported `stableCoreStage3WarningCount=0`.
- `resolved-colors-empty-with-land`, `political-visible-subset-empty-with-required-chunks`, and `pending-color-edit-cleared-without-render` were transient only.
- `render-reuse-across-data-generation=0`.
- `visible-required-layer-missing` stable remainder was `relief` at `visible-frame-committed`, with `stateFeatureCount=0` and `mergedPayloadState=empty`.
- `water` and `scenario_atlantropa` only appeared as transient `visible-required-layer-missing`.

## Working Hypothesis

- The first suspect is diagnostics classification: optional selected semantic chunks may be flowing into required detection.
- `required` must mean `manifestRequired || requiredByRequiredChunk`.
- `selected` may mean `requiredByRequiredChunk || selectedAsOptionalChunk`.
- Visible optional layers can be `optional-deferred` without becoming release-blocking required missing.

## 2026-06-21 Implementation Evidence

- `js/core/renderer/render_transaction_diagnostics.js` now separates manifest-required, required-chunk, optional-selected, selected, source ownership, chunk coverage, missing reason, and coverage status for semantic layers.
- `visible-required-layer-missing` is still emitted, but only for visible layers with `required=true` and `coverageStatus=required-missing`.
- `SCENARIO_OPTIONAL_LAYER_CONFIGS` is still the ownership map for `water`, `special`, `scenario_atlantropa`, `specialzonelayers`, `relief`, `cities`, and `strategicvalues`; diagnostics add a fallback mapping for `specialzonelayers`.
- No runtime loading, chunk selection, political/color readiness, render budget, worker/offscreen/webgl/vector tile, or performance threshold behavior was changed.

## Root Cause Classification

- The Stage 3 stable `relief` remainder was diagnostics/source-state classification drift.
- Evidence: runtime sampling now records the old relief shape as `coverageStatus=transient-loading`, `missingReason=not-yet-loaded`, `expectedChunkIds=["relief.coarse.r0c0"]`, and `missingChunkIds=["relief.coarse.r0c0"]`.
- The previous predicate treated empty state and empty merged payload as a required-missing condition before chunk load ownership was explicit.
- The corrected contract classifies required chunk selection with missing loaded chunks as loading coverage, then keeps stable required-missing for real loaded-but-empty required gaps.

## Runtime Sampling

- Output: `.runtime/output/render-diagnostics/stage4-semantic-layer-coverage.json`.
- `stableVisibleRequiredLayerMissingCount=0`.
- `stableVisibleRequiredLayerMissingByLayer={}`.
- `transientVisibleRequiredLayerMissingByLayer={}`.
- `optionalDeferredByLayer={}`.
- `coverageStatusByLayer`:
  - `water`: `present=29`, `explicit-empty=8`, `not-visible=5`.
  - `scenario_atlantropa`: `present=33`, `explicit-empty=9`.
  - `relief`: `present=5`, `explicit-empty=32`, `not-visible=5`.
  - `special`: `present=29`, `explicit-empty=8`, `not-visible=5`.
  - `cities`: `present=6`, `explicit-empty=36`.
  - `strategicvalues`: `not-visible=42`.
  - `specialzonelayers`: `not-visible=42`.
- Latest stable TNO water snapshot is `required=true`, `requiredReason=required-chunk`, `coverageStatus=present`, `sourceKind=runtime-state`, `expectedChunkIds=["water.coarse.r0c0"]`, `loadedChunkIds=["water.coarse.r0c0"]`, `stateFeatureCount=141`.
- Latest stable TNO `scenario_atlantropa` snapshot is `required=true`, `requiredReason=required-chunk`, `coverageStatus=present`, `sourceKind=runtime-state`, `expectedChunkIds=["scenario_atlantropa.coarse.r0c0"]`, `loadedChunkIds=["scenario_atlantropa.coarse.r0c0"]`, `stateFeatureCount=897`.
- Latest stable relief snapshot is `required=true`, `requiredReason=required-chunk`, `coverageStatus=present`, `sourceKind=runtime-state`, `expectedChunkIds=["relief.coarse.r0c0"]`, `loadedChunkIds=["relief.coarse.r0c0"]`, `stateFeatureCount=25`.

## Validation Evidence

- Passed: `node --check js/core/renderer/render_transaction_diagnostics.js`.
- Passed: `node --check js/core/scenario_resources.js`.
- Passed: `node --check js/core/scenario/chunk_runtime.js`.
- Passed: `node --check js/core/scenario_post_apply_effects.js`.
- Passed: `node --check js/core/renderer/scenario_relief_overlay_render_owner.js`.
- Passed: `npm run test:node:render-transaction-diagnostics` (`21/21`).
- Passed: `npm run test:node:scenario-apply-transaction-ownership` (`3/3`).
- Passed: `npm run test:node:scenario-runtime-state-behavior` (`6/6`).
- Passed: `npm run test:node:renderer-runtime-state-behavior` (`10/10`).
- Passed: `npm run test:node:scenario-chunk-contracts` (`55/55`).
- Passed: `node --test tests/scenario_optional_layers_behavior.test.mjs` (`7/7`).
- Passed: `npm run test:node:scenario-relief-overlay-owner` (`4/4`).
- Passed: `node .runtime/tmp/stage4_semantic_layer_coverage.cjs`.
- Passed: `npm run test:e2e:scenario-apply-concurrency`.
- Passed: `npm run test:e2e:dev:scenario-chunk-runtime`.
- Passed: `npm run verify:pages-dist`.
- Passed: `git diff --check` with existing CRLF warnings only.

## AI Slop Cleanup Pass

- Scope: changed diagnostics source, matching Pages dist mirror, focused diagnostics test, and active docs/registry.
- Behavior lock: render transaction diagnostics test and runtime sampling were rerun after cleanup.
- Findings: no masking fallback slop; source fallback classification is the intended contract under test.
- Cleanup made: removed an unused helper parameter and kept optional-deferred missing reason precedence after the regression test caught a too-aggressive simplification.
- Code-review follow-up: source present states now take precedence over explicit-empty, so a null runtime state plus present merged chunk reports `sourceKind=merged-chunk` and `coverageStatus=present`.
- Verification after cleanup: `node --check js/core/renderer/render_transaction_diagnostics.js`, `npm run test:node:render-transaction-diagnostics`, `node .runtime/tmp/stage4_semantic_layer_coverage.cjs`, and `git diff --check`.

## Independent Review Gate

- Code-reviewer found one medium source ownership contradiction: empty runtime state was classified before present merged chunk payload.
- Fix landed in `getLayerSourceInfo()` by resolving present runtime, merged, bundle, and topology sources before explicit-empty.
- Regression added for `customLayerPayload:null` plus present merged custom layer payload.
- Code-reviewer rerun result: CLEAR, remaining findings 0.
- Architect review result: CLEAR, architectural findings 0; Stage 4 remains scoped to diagnostics/source ownership, with visual acceptance deferred to Phase 5.

## Phase Five Boundary

- Phase 5 should perform full visual screenshot regression and acceptance.
- Evidence to collect there: Atlantropa visual completeness screenshot, water visual correctness screenshot, relief visual correctness screenshot, fill/zoom/pan screenshot, scenario switch screenshot, and performance smoke.
