# Stage 4 Semantic Layer Coverage Plan

## Boundary

- Start from `origin/main@ee9ad5c8f23bf59abab3f995dd198e975c04775b` in `C:\Users\raede\Desktop\dev\mapcreator-stage4-semantic-layer-coverage`.
- Preserve the dirty parent checkout at `C:\Users\raede\Desktop\dev\mapcreator`.
- Fix semantic layer coverage and source ownership for `water`, `scenario_atlantropa`, `relief`, `special`, `cities`, `strategicvalues`, and `specialzonelayers`.
- Keep political/color readiness, scenario apply queue ownership, chunk selection strategy, render budget hints, worker/offscreen/webgl/vector tile defaults, and performance thresholds unchanged.

## Work Plan

- [x] Create isolated worktree and Ultragoal story.
- [x] Load project rules, lessons learned, Stage 3 evidence, and registry state.
- [x] Split semantic layer diagnostics into manifest-required, required-chunk, optional-selected, selected, source, and coverage fields.
- [x] Update `visible-required-layer-missing` to depend on accurate required status and stable coverage status.
- [x] Audit source ownership for `relief`, `scenario_atlantropa`, and `water`; patch runtime behavior only if evidence shows a real required payload or commit gap.
- [x] Extend focused Node tests for required/optional distinction, optional deferred status, source fallback trichotomy, and water/Atlantropa/relief coverage contracts.
- [x] Run targeted syntax, Node, E2E, Pages dist, and diff checks.
- [x] Run Stage 4 runtime sampling and save `.runtime/output/render-diagnostics/stage4-semantic-layer-coverage.json`.
- [x] Run ai-slop-cleaner on changed files and rerun verification.
- [x] Run independent `$code-review` lanes.
- [ ] Commit, integrate into `main`, push, update registry, and clean the worktree if all gates pass.

## Implementation Result

- `buildLayerSnapshot()` now records `manifestRequired`, `requiredByRequiredChunk`, `selectedAsOptionalChunk`, `selected`, `intentionallyDeferred`, source ownership, missing reason, and coverage status.
- `required` is derived from `manifestRequired || requiredByRequiredChunk`; optional chunk selection is tracked as selected coverage.
- `visible-required-layer-missing` now depends on `coverageStatus === "required-missing"` and no longer fires for optional deferred or not-yet-loaded required chunks.
- Stage 3 relief stable remainder classified as diagnostics/source-state classification drift: `relief.coarse.r0c0` was selected and missing from loaded chunks, so the correct status is `transient-loading` with `missingReason=not-yet-loaded`, not stable required missing.
- Runtime sampling at `.runtime/output/render-diagnostics/stage4-semantic-layer-coverage.json` reports `stableVisibleRequiredLayerMissingCount=0`.

## Validation Queue

- `node --check js/core/renderer/render_transaction_diagnostics.js`
- `node --check js/core/scenario_resources.js`
- `node --check js/core/scenario/chunk_runtime.js`
- `node --check js/core/scenario_post_apply_effects.js`
- `node --check js/core/renderer/scenario_relief_overlay_render_owner.js`
- `npm run test:node:render-transaction-diagnostics`
- `npm run test:node:scenario-apply-transaction-ownership`
- `npm run test:node:scenario-runtime-state-behavior`
- `npm run test:node:renderer-runtime-state-behavior`
- `npm run test:node:scenario-chunk-contracts`
- `node --test tests/scenario_optional_layers_behavior.test.mjs`
- `npm run test:e2e:scenario-apply-concurrency`
- `npm run test:e2e:dev:scenario-chunk-runtime`
- `npm run verify:pages-dist`
- `git diff --check`
