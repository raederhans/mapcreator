# Render Chain Slimming V4 Task

## Checklist

- [x] Create isolated V4 worktree from current `main`.
- [x] Create active docs and registry row.
- [x] Run baseline targeted checks.
- [x] Dispatch read-only static review lanes.
- [x] Make descriptor factory resource-first.
- [x] Update behavior and static contracts.
- [x] Refresh Pages dist output.
- [x] Run final verification suite.
- [x] Run final review and first-principles bug check.
- [ ] Merge to `main`, commit, push, archive docs, and clean worktree.

## Delivery Package

1. What changed:
   - `createFrameGraphInvalidation(...)` now accepts resource inputs only.
   - Retired pass-shaped descriptor inputs now fail fast instead of producing silent empty fan-out.
   - FrameGraph pass fallback remains centralized in `resolveFrameGraphInvalidationExecutionPlan(...)`.
   - Removed a dead pass-derived local from chunk promotion refresh planning.
   - Strengthened behavior tests, Python contracts, Node static contracts, architecture boundary checks, and Pages dist mirrors.

2. Files changed:
   - Core: `js/core/map_renderer/scenario_refresh_plans.js`.
   - Tests/contracts: `tests/scenario_refresh_plans_behavior.test.mjs`, `tests/scenario_chunk_contracts.test.mjs`, `tests/test_scenario_chunk_refresh_contracts.py`.
   - Tools: `tools/check_architecture_boundaries.mjs`.
   - Dist: `dist/app/js/core/map_renderer/scenario_refresh_plans.js`, `dist/pages-dist-manifest.json`.
   - Docs: `docs/active/_worktree_registry.md`, `docs/active/render-chain-slimming-v4/{plan,context,task}.md`.

3. Diff summary versus rebased base:
   - 11 files changed.
   - `scenario_refresh_plans.js` source/dist changed by a small resource-first factory patch plus fail-fast validation.
   - Tests and tools changed only around FrameGraph descriptor factory and bridge contracts.
   - Pages manifest regenerated after rebase.

4. Commit status:
   - Functional V4 commit exists on `codex/render-chain-slimming-v4`: `7f15cf43` before this ready-for-integration docs update.
   - Branch is ready for integration after the docs update commit.

5. Base/main divergence:
   - Branch rebased onto `main@861e79e5`.
   - Before integration, branch is ahead of main by the V4 commits.

6. Potential worktree conflicts:
   - Direct conflict already resolved with `dist/pages-dist-manifest.json` from `main@861e79e5`.
   - Current worktree list shows only main and the V4 worktree.
   - Future overlap risk is yellow for render refresh-chain work touching `scenario_refresh_plans.js` or Pages dist.

7. Verification:
   - `npm run test:node:scenario-refresh-plans` -> 16/16.
   - `npm run test:node:scenario-chunk-promotion-helpers` -> 9/9.
   - `npm run test:node:scenario-chunk-contracts` -> 54/54.
   - `npm run test:node:exact-after-settle-refresh-plans` -> 8/8.
   - `npm run test:node:renderer-runtime-state-behavior` -> 10/10.
   - `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_main_deferred_detail_promotion_boundary_contract -q` -> 46 tests.
   - `npm run verify:architecture-boundaries` -> passed.
   - `npm run verify:test-import-graph` -> passed, 48 specs.
   - `npm run verify:pages-dist` -> passed after rebase, startup shell 38/38 and landing showcase 8/8.
   - `git diff --check` -> passed.
   - `git diff --no-index -- js/core/map_renderer/scenario_refresh_plans.js dist/app/js/core/map_renderer/scenario_refresh_plans.js` -> no diff.

8. Remaining risks:
   - Browser inspection was intentionally skipped; this phase changes internal refresh contracts and was covered by code-level and Pages dist gates.
   - Exact-after-settle still uses local pass language by design for this phase.

9. Recommended next step:
   - Fast-forward merge into `main`, run post-merge targeted validation, archive docs, update registry, commit closeout, push, and clean the V4 worktree.
