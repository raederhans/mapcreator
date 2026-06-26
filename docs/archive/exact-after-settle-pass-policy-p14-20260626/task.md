# P14 Task

## Delivery Package Draft

### Intended Changes

1. Add a renderer-owned exact-after-settle pass policy catalog.
2. Keep refresh-plan imports compatible through re-exports.
3. Let the render pipeline owner use the catalog default and keep the constants override seam.
4. Remove the pass-policy bridge from `map_renderer.js`.
5. Lock the new boundary with node and architecture tests.

### Files To Touch

- Core: `js/core/renderer/exact_after_settle_pass_catalog.js`, `js/core/map_renderer/exact_after_settle_refresh_plans.js`, `js/core/renderer/render_pipeline_passes.js`, `js/core/map_renderer.js`.
- Tests: `tests/exact_after_settle_pass_catalog_behavior.test.mjs`, `tests/render_pipeline_catalog_behavior.test.mjs`, `tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`.
- Tooling: `tools/check_architecture_boundaries.mjs`, `package.json`.
- Docs: `docs/active/_worktree_registry.md`, this task folder.

### Validation Checklist

- [x] `node --check js/core/renderer/exact_after_settle_pass_catalog.js`
- [x] `node --check js/core/map_renderer/exact_after_settle_refresh_plans.js`
- [x] `node --check js/core/renderer/render_pipeline_passes.js`
- [x] `node --check js/core/map_renderer.js`
- [x] `node --check tests/exact_after_settle_pass_catalog_behavior.test.mjs`
- [x] `node --check tools/check_architecture_boundaries.mjs`
- [x] `npm run test:node:exact-after-settle-pass-catalog`
- [x] `npm run test:node:render-pass-catalog`
- [x] `npm run test:node:render-invalidation-catalog`
- [x] `npm run test:node:render-pipeline-catalog`
- [x] `npm run test:node:render-cache-owner`
- [x] `npm run test:node:exact-after-settle-refresh-plans`
- [x] `npm run test:node:renderer-host-inventory`
- [x] `npm run test:node:renderer-runtime-state-behavior`
- [x] `npm run test:node:render-transaction-diagnostics`
- [x] `npm run test:node:scenario-refresh-plans`
- [x] `npm run test:node:scenario-chunk-contracts`
- [x] `npm run verify:architecture-boundaries`
- [x] `npm run verify:state-write-allowlist`
- [x] `npm run verify:test-import-graph`
- [x] `npm run test:e2e:dev:tno-ready-state`
- [x] `npm run test:e2e:smoke`

## Delivery Package

1. Changed exact-after-settle pass policy ownership from refresh-plan/host bridge to `js/core/renderer/exact_after_settle_pass_catalog.js`.
2. Preserved `exact_after_settle_refresh_plans.js` compatibility exports for existing scheduler imports.
3. Let `render_pipeline_passes.js` use the catalog default while keeping the constants override for tests and future owner injection.
4. Removed `EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES` import and constants bridge from `map_renderer.js`.
5. Added node/Python/architecture contracts for the new ownership boundary.

Core files: `js/core/renderer/exact_after_settle_pass_catalog.js`, `js/core/map_renderer/exact_after_settle_refresh_plans.js`, `js/core/renderer/render_pipeline_passes.js`, `js/core/map_renderer.js`.

Test files: `tests/exact_after_settle_pass_catalog_behavior.test.mjs`, `tests/exact_after_settle_refresh_plans_behavior.test.mjs`, `tests/scenario_chunk_contracts.test.mjs`, `tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`.

Tooling/docs files: `tools/check_architecture_boundaries.mjs`, `package.json`, `docs/active/_worktree_registry.md`, this task folder.

Diff summary: one new pure renderer catalog, one new catalog behavior test, refresh plans now import/re-export catalog policy, render pipeline owner default changed from empty Set to catalog Set, host bridge removed from `map_renderer.js`, boundary tooling and contracts updated.

Commit status: not committed yet; ready for functional commit after final code-review pass.

Base/main divergence: worktree is based on `origin/main@df3f54670ae9afb11dbc6455d6fe5e19e727b5a5`; parent local `main@383a626a` remains behind and dirty with unrelated docs/archive cleanup WIP.

Conflict risk: yellow for renderer extraction hot files and package/tooling contracts; green against parent docs/archive cleanup WIP and forbidden paths.

Recommended integration: commit this worktree, push branch, push fast-forward-equivalent commit to `origin/main`, then archive docs and registry closeout in a second commit.
