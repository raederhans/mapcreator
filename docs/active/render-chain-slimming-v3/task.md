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
- `docs/active/render-chain-slimming-v3/plan.md`
- `docs/active/render-chain-slimming-v3/context.md`
- `docs/active/render-chain-slimming-v3/task.md`
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
     `dist/pages-dist-manifest.json`, active V3 docs, and
     `docs/active/_worktree_registry.md`.
   - Temporary files: none staged; live validation artifacts stayed under
     `.runtime/`.
3. Diff summary:
   - Descriptor factory is resource-first.
   - Bridge remains the only pass compatibility reader.
   - Delta payloads drop the retired pass list.
   - Source scans reject retired descriptor fields.
4. Commit status:
   - Ready to commit after final static review.
5. Base/main divergence:
   - Base: `main@d272c09046bd42442bd0af32f834896c6dec559d`.
   - Re-check `main...origin/main` before final merge.
6. Conflict scan:
   - Current worktree list showed only main plus this V3 worktree.
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
   - Static review, commit, fast-forward merge, post-merge focused checks,
     archive, push, and remove worktree.
10. Integration verdict:
   - Integration-ready after final review.
