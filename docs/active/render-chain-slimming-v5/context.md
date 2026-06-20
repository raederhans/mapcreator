# Render Chain Slimming V5 Context

## 2026-06-20 Start

- Base: `main@f7501edf33faef94111e0e9e5d93e908be9fea68`.
- Branch: `codex/render-chain-slimming-v5`.
- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-render-chain-slimming-v5`.
- Main checkout was clean before worktree creation.
- Current owner of live tests/builds: main Codex agent only.
- Subagents may do static code mapping, test coverage suggestions, and final review. They must not run or monitor live tests.

## Initial Findings

- V4 already made `createFrameGraphInvalidation(...)` resource-first and fail-fast for `targetPasses` / `legacyTargetPasses`.
- `resolveFrameGraphInvalidationExecutionPlan(...)` is the remaining bridge from resource language to render-pass execution language.
- `scenario_visual_invalidation_executor.js` still accepts `executionPlan.targetPasses`, which keeps a generic pass-shaped field in the bridge-to-executor contract.
- Renderer refresh plan pass arrays remain normal language at renderer plan and scenario apply boundaries.

## Progress Log

- Created V5 worktree and active docs.
- Started a read-only `code-mapper` subagent for static field classification.
- Implemented bridge/executor narrowing: `resolveFrameGraphInvalidationExecutionPlan(...)` no longer returns generic `targetPasses`; runtime passes only `targetResources`, `invalidationTargetPasses`, and `hasExplicitTargetResources` to the executor.
- Added executor fail-fast behavior for retired `executionPlan.targetPasses`.
- Corrected an initial patch-location mistake by moving the diff into the V5 worktree and restoring the main checkout to clean state.
- Validation passed: `npm run test:node:scenario-refresh-plans` (17/17).
- Validation passed: `npm run test:node:scenario-chunk-promotion-helpers` (9/9).
- Validation passed: `npm run test:node:scenario-chunk-contracts` (54/54).
- Validation passed: `npm run test:node:exact-after-settle-refresh-plans` (8/8).
- Validation passed: `npm run test:node:renderer-runtime-state-behavior` (10/10).
- Validation passed: `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_main_deferred_detail_promotion_boundary_contract -q` (46 tests).
- Validation passed: `npm run verify:architecture-boundaries`.
- Validation passed: `npm run verify:test-import-graph` (48 specs).
- Validation passed: `npm run verify:pages-dist` (startup shell 38/38, landing showcase 8/8).
- Validation passed: `git diff --check`.
- Source/dist mirror checks passed for `scenario_refresh_plans.js`, `scenario_refresh_runtime.js`, and `scenario_visual_invalidation_executor.js`.
- Final static review passed: code-reviewer returned approve/no findings after checking the 13 modified diff files, the resource-first bridge contract, no-FrameGraph fallback behavior, explicit empty-resource skip, executor side-effect order, source/dist mirrors, and retired `executionPlan.targetPasses` static locks.
- First-principles bug check: the simplest stable boundary is to keep renderer pass names at renderer refresh-plan and legacy direct-call boundaries, while the FrameGraph bridge exposes only resource/execution fields. The implementation follows that boundary without adding a new abstraction layer.
