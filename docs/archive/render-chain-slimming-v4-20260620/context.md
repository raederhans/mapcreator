# Render Chain Slimming V4 Context

## 2026-06-20 Start

- Initial base: `main@d2ef4854`.
- Rebased base: `main@861e79e5`.
- Branch: `codex/render-chain-slimming-v4`.
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-render-chain-slimming-v4`.
- Main checkout was clean and aligned with `origin/main` before worktree creation.
- Current owner of live tests/builds: main Codex agent only.
- Subagents may do static code mapping, test coverage review, and final review. They must not run or monitor live tests.

## Initial Findings

- V3 retired descriptor-level `legacyTargetPasses` and `targetPasses` fields from new FrameGraph descriptors.
- Remaining pass compatibility is inside `createFrameGraphInvalidation(...)`, which still accepts `targetPasses` input and translates it into `targetResources`.
- `resolveFrameGraphInvalidationExecutionPlan(...)` is the intended bridge for pass fallback.
- `createScenarioChunkPromotionRefreshPlan(...)` still has a dead `targetPasses` local derived from resources.

## Progress Log

- Initialized V4 active docs and registry row.
- Baseline passed: `npm run test:node:scenario-refresh-plans` (16/16).
- Baseline passed: `npm run test:node:scenario-chunk-promotion-helpers` (9/9).
- Static agents confirmed production `createFrameGraphInvalidation(...)` has one call site and it already passes `targetResources`.
- Updated `createFrameGraphInvalidation(...)` to resource-first only, removed the dead promotion `targetPasses` local, and strengthened behavior/static contracts.
- Validation passed after code changes: `npm run test:node:scenario-refresh-plans` (16/16).
- Validation passed after code changes: `npm run test:node:scenario-chunk-contracts` (54/54).
- Validation passed after code changes: `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_main_deferred_detail_promotion_boundary_contract -q` (46 tests).
- Validation passed after code changes: `npm run verify:architecture-boundaries`.
- Validation passed after code changes: `npm run test:node:scenario-chunk-promotion-helpers` (9/9).
- Validation passed after code changes: `npm run verify:test-import-graph` (48 specs).
- Validation passed after code changes: `npm run verify:pages-dist` (startup shell 38/38, landing showcase 8/8).
- Validation passed after code changes: `npm run test:node:exact-after-settle-refresh-plans` (8/8).
- Validation passed after code changes: `npm run test:node:renderer-runtime-state-behavior` (10/10).
- Validation passed after code changes: `git diff --check`.
- Source/dist mirror check passed for `scenario_refresh_plans.js`.
- Reviewer found one low-risk issue: pass-shaped factory inputs were silently ignored after the resource-first change.
- Fixed reviewer issue by making `createFrameGraphInvalidation(...)` fail fast on retired pass fields while keeping bridge fallback intact.
- Rebased V4 onto `main@861e79e5` after `Keep UI review contracts current` landed on `origin/main`.
- Rebase conflict was limited to generated `dist/pages-dist-manifest.json`; resolved by rerunning `npm run verify:pages-dist` on the final tree.
- Post-rebase validation passed: `npm run verify:pages-dist` (startup shell 38/38, landing showcase 8/8).
- Post-rebase validation passed: `npm run test:node:scenario-refresh-plans` (16/16), `npm run test:node:scenario-chunk-contracts` (54/54), `npm run test:node:scenario-chunk-promotion-helpers` (9/9), `npm run test:node:exact-after-settle-refresh-plans` (8/8), `npm run test:node:renderer-runtime-state-behavior` (10/10), full Python boundary set (46 tests), `npm run verify:test-import-graph`, `npm run verify:architecture-boundaries`, `git diff --check`, and source/dist mirror check.
- Final reviewer re-check returned no findings.
