# Render Resource Authority Refactor Task

Last updated: 2026-06-20

## Checklist

- [x] Create isolated worktree from current `origin/main`.
- [x] Create durable Ultragoal artifacts and Codex goal.
- [x] Start active docs and registry tracking.
- [x] Map current refresh-plan, runtime, promotion, HGO/TNO/transport contracts.
- [x] Implement Phase 1 resource-first FrameGraph.
- [x] Add or extend Phase 1 tests.
- [x] Implement Phase 2 pure promotion delta.
- [x] Add purity and executor-boundary tests.
- [x] Leaf-ize `scenario_refresh_runtime` without changing public behavior.
- [x] Add first-frame allowlist only after descriptor chain is stable.
- [x] Run UltraQA scenario matrix.
- [x] Run independent code review and performance review.
- [ ] Commit, integrate to `main`, push, archive docs, and clean worktree.

## Delivery Package

### Changed Files

Core files:

- `js/core/map_renderer/scenario_refresh_plans.js`
- `js/core/map_renderer/scenario_refresh_runtime.js`
- `js/core/renderer/scenario_chunk_promotion_helpers.js`
- `js/core/scenario/chunk_runtime.js`
- `js/core/scenario/scenario_renderer_bridge.js`
- Matching `dist/app/js/core/...` mirrors after `verify:pages-dist`
- `data/scenarios/tno_1962/derived/atlantropa_donor_ledger.json`
- `data/scenarios/tno_1962/derived/geometry_drop_audit.json`
- `dist/pages-dist-manifest.json`

Test files:

- `tests/scenario_refresh_plans_behavior.test.mjs`
- `tests/scenario_chunk_promotion_helpers_behavior.test.mjs`
- `tests/scenario_chunk_contracts.test.mjs`
- `tests/test_tno_relief_overlay_contract.py`

Docs files:

- `docs/active/render-resource-authority/plan.md`
- `docs/active/render-resource-authority/context.md`
- `docs/active/render-resource-authority/task.md`
- `docs/active/_worktree_registry.md`

Temporary files:

- `.omx/ultragoal/brief.md`
- `.omx/ultragoal/goals.json`
- `.omx/ultragoal/ledger.jsonl`
- `.omx/state/ultrawork-state.json`
- `.omx/state/ultraqa-state.json`
- `.runtime/reports/generated/tno_1962.contracts.write-safe.json`

### Current Diff Summary

- FrameGraph invalidation now treats `targetResources` as the primary authority and derives legacy `targetPasses` only at compatibility edges.
- Scenario chunk promotion now has a pure value `PromotionDelta` with identity, resources, domain layers, payload refs, side-effect task names, and primitive metrics.
- `scenario_refresh_runtime` consumes a resolved renderer refresh descriptor and skips broad pass invalidation when an explicit empty resource set is supplied.
- Startup initial visual refresh passes `firstFrameOnly` through chunk runtime and bridge, limiting first-frame resources to background, physical, political, borders, interaction, and optional HGO preview.
- TNO coverage ledgers were re-materialized through the existing strict safe-repair path so Pages dist metadata hashes match source content.

### Verification

- `npm run test:node:scenario-refresh-plans` - pass, 11 tests.
- `npm run test:node:scenario-chunk-promotion-helpers` - pass, 9 tests.
- `npm run test:node:renderer-runtime-state-behavior` - pass, 10 tests.
- `npm run test:node:scenario-chunk-contracts` - pass, 54 tests.
- `npm run test:node:exact-after-settle-refresh-plans` - pass, 7 tests.
- `npm run test:node:startup-hydration-behavior` - pass, 12 tests.
- `npm run test:node:hgo-runtime-preview` - pass, 21 tests.
- `npm run test:node:canvas-layer-manager` - pass, 4 tests.
- `npm run test:node:transport-workbench-preview-lifecycle-owner` - pass, 27 tests.
- `npm run test:node:data-service-runtime` - pass, 8 tests.
- `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_render_pipeline_passes_boundary_contract -q` - pass, 40 tests.
- `npm run python -- -m unittest tests.test_tno_relief_overlay_contract -q` - pass, 3 tests.
- `npm run python -- tools/check_scenario_contracts.py --strict --write-safe --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962.contracts.write-safe.json` - pass, `tno_1962`.
- `npm run verify:architecture-boundaries` - pass.
- `npm run verify:test-import-graph` - pass, 48 specs.
- `npm run verify:pages-dist` - pass, Pages startup shell 38 tests and landing showcase 8 tests.
- `git diff --check` - pass with Windows line-ending warnings only.

### Integration Recommendation

- Status: ready-for-integration.
- Recommendation: merge this branch into clean, updated `main`, then run a short post-merge validation set: `verify:architecture-boundaries`, `test:node:scenario-refresh-plans`, `test:node:scenario-chunk-contracts`, and `verify:pages-dist`.
- Conflict risk: red for concurrent renderer refresh-chain work, yellow for future HGO/TNO/transport refresh contract work, green for unrelated UI/docs work.
