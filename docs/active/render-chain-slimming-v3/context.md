# Render Chain Slimming V3 Context

## Starting State

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-render-chain-slimming-v3`
- Branch: `codex/render-chain-slimming-v3`
- Base: `main@d272c09046bd42442bd0af32f834896c6dec559d`
- Main checkout was clean and synced with `origin/main` when this worktree was
  created.
- Live tests/builds owner: main Codex agent only.
- Subagents: read-only code mapping and test-design lanes only.

## Grounding Notes

- V2 moved visual invalidation execution out of `scenario_refresh_runtime.js`.
- V2 kept legacy FrameGraph pass fields for one compatibility phase.
- This phase retires only FrameGraph invalidation descriptor pass fields.
- The bridge output still contains `targetPasses` because downstream executor
  code and tests use it as resolved execution data.
- `rendererRefreshPlan.targetPasses` remains a normal renderer refresh plan
  field and is outside this retirement.

## Progress Log

- 2026-06-20: Created isolated V3 worktree.
- 2026-06-20: Created active task docs.
- 2026-06-20: Started read-only subagents for legacy field mapping and test
  coverage planning.
- 2026-06-20: Baseline checks passed:
  `npm run test:node:scenario-refresh-plans`,
  `npm run test:node:scenario-chunk-promotion-helpers`, and
  `npm run test:node:exact-after-settle-refresh-plans`.
- 2026-06-20: Retired `legacyTargetPasses` and descriptor-level
  `targetPasses` from newly-created FrameGraph invalidation descriptors.
  Bridge output still returns `targetPasses` as resolved execution data.
- 2026-06-20: Removed `resources.legacyTargetPasses` from promotion deltas and
  renamed the runtime metric to `targetPassCount`.
- 2026-06-20: Regenerated Pages dist with `npm run verify:pages-dist`.
- 2026-06-20: Validation passed:
  `npm run test:node:scenario-refresh-plans`,
  `npm run test:node:scenario-chunk-promotion-helpers`,
  `npm run test:node:scenario-chunk-contracts`,
  `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_main_deferred_detail_promotion_boundary_contract -q`,
  `npm run verify:architecture-boundaries`,
  `npm run verify:pages-dist`,
  `npm run test:node:exact-after-settle-refresh-plans`,
  `npm run test:node:renderer-runtime-state-behavior`,
  `npm run verify:test-import-graph`, and `git diff --check`.

## Review Notes

- Mendel confirmed the minimum retirement surface is `legacyTargetPasses` plus
  FrameGraph invalidation descriptor pass fields. Normal renderer plan
  `targetPasses`, bridge output `targetPasses`, and `invalidationTargetPasses`
  remain valid execution fields.
- Wegener confirmed the smallest behavior locks belong in existing refresh plan,
  executor, scenario chunk contract, Python source-scan, and architecture
  boundary checks.
- Main agent owns all live validation. Subagents stayed read-only.

## Integration State

- Status: ready for review, then integration.
- Base: `main@d272c09046bd42442bd0af32f834896c6dec559d`.
- Overlap risk: yellow for renderer refresh-chain and Pages dist mirrors.
- Recommended integration: commit, fast-forward merge into `main`, run
  post-merge focused checks, archive this task folder, push, and remove the
  isolated worktree.
