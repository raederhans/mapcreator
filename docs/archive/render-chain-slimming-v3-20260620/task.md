# Render Chain Slimming V3 Task

## Checklist

- [x] Create isolated worktree.
- [x] Create active task documentation.
- [x] Update worktree registry.
- [x] Run baseline targeted tests.
- [x] Remove FrameGraph invalidation legacy pass fields.
- [x] Retire public legacy pass reader export.
- [x] Update behavior/static contracts.
- [x] Regenerate Pages dist.
- [x] Run full validation set.
- [x] Run final review / bug check / first-principles self-audit.
- [x] Prepare integration-ready delivery package.
- [x] Fast-forward merge into main.
- [x] Run post-merge focused validation.
- [x] Archive task docs.
- [x] Remove isolated worktree.

## Expected Changed Files

Core:
- `js/core/map_renderer/scenario_refresh_plans.js`
- `js/core/map_renderer/scenario_refresh_runtime.js`
- `js/core/renderer/scenario_chunk_promotion_helpers.js`

Tests and contracts:
- `tests/scenario_refresh_plans_behavior.test.mjs`
- `tests/scenario_chunk_promotion_helpers_behavior.test.mjs`
- `tests/scenario_chunk_contracts.test.mjs`
- `tests/test_scenario_chunk_refresh_contracts.py`
- `tools/check_architecture_boundaries.mjs`

Docs and delivery:
- `docs/archive/render-chain-slimming-v3-20260620/plan.md`
- `docs/archive/render-chain-slimming-v3-20260620/context.md`
- `docs/archive/render-chain-slimming-v3-20260620/task.md`
- `docs/active/_worktree_registry.md`
- `dist/app/js/core/map_renderer/*`
- `dist/pages-dist-manifest.json`

## Delivery Package

1. Changes made:
   - Removed `legacyTargetPasses` and descriptor-level `targetPasses` from new
     FrameGraph invalidation descriptors.
   - Kept bridge output `{ targetResources, targetPasses, invalidationTargetPasses, hasExplicitTargetResources }`.
   - Removed promotion delta `resources.legacyTargetPasses`.
   - Renamed chunk promotion metric `legacyTargetPassCount` to `targetPassCount`.
   - Updated behavior/static contracts and regenerated Pages dist.
2. File groups:
   - Core files: `js/core/map_renderer/scenario_refresh_plans.js`,
     `js/core/map_renderer/scenario_refresh_runtime.js`,
     `js/core/renderer/scenario_chunk_promotion_helpers.js`.
   - Tests/contracts: `tests/scenario_refresh_plans_behavior.test.mjs`,
     `tests/scenario_chunk_promotion_helpers_behavior.test.mjs`,
     `tests/scenario_chunk_contracts.test.mjs`,
     `tests/test_scenario_chunk_refresh_contracts.py`,
     `tools/check_architecture_boundaries.mjs`.
   - Delivery/docs: matching `dist/app/js/core/*` mirrors,
     `dist/pages-dist-manifest.json`, archived V3 docs, and
     `docs/active/_worktree_registry.md`.
   - Temporary files: none staged; live validation artifacts stayed under
     `.runtime/`.
3. Diff summary:
   - Descriptor factory is resource-first.
   - Bridge remains the only pass compatibility reader.
   - Delta payloads drop the retired pass list.
   - Source scans reject retired descriptor fields.
4. Commit status:
   - Functional commits `35f81376` and `3eefa80e` were fast-forwarded into
     `main`.
5. Base/main divergence:
   - Rebasing completed on top of `main@7c8b375f2dfe0e8a159be00b9e1de626cd8b6c75`.
   - At archive time, `main` still needed the closeout commit and push to
     `origin/main`.
6. Conflict scan:
   - Current worktree list shows only the main checkout.
   - Hot files overlap future renderer refresh-chain work and Pages dist.
7. Validation:
   - Passed all commands listed in `context.md`.
8. Remaining risks:
   - Existing external payloads containing retired fields will fall back through
     the renderer plan path or resource bridge. No current source/dist producer
     emits those fields.
   - Full legacy pass-field deletion outside FrameGraph invalidation remains a
     later contract-unification task.
9. Recommended next step:
   - Push closeout commit to `origin/main`.
10. Integration verdict:
   - Integrated and cleaned.
