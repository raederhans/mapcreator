# TNO + HGO Integration Task

## Current State

- Status: in-progress
- Current owner: main Codex agent
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-tno-hgo-integration`
- Branch: `codex/tno-hgo-integration`
- Base: `origin/main@1206eb43`

## Delivery Package Draft

### Changed Files

Current integration scaffolding:

- `docs/active/_worktree_registry.md`
- `docs/active/tno-hgo-integration/plan.md`
- `docs/active/tno-hgo-integration/context.md`
- `docs/active/tno-hgo-integration/task.md`
- `.omx/context/tno-hgo-integration-20260618T032909Z.md`

TNO scoped code files are already present in `origin/main@1206eb43`; no parent dirty patch is imported.

### Validation

Planned:

- `npm run test:node:renderer-runtime-state-behavior`
- `npm run test:node:scenario-chunk-contracts`
- `npm run test:e2e:dev:political-progressive-recovery`
- `node --test tests/hgo_projection_model.node.test.mjs tests/hgo_raster_renderer.node.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs`
- `py -3 -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q`
- `npm run verify:pages-dist`
- `git diff --check`

### Remaining Risks

- Text conflicts are possible in `js/core/map_renderer.js`, `dist/app/js/core/map_renderer.js`, registry, and lessons docs when cherry-picking HGO.
- Parent checkout contains unrelated landing/main drift, so it remains a read-only evidence source.
- Pages dist verification may require the local Python shim if `python` resolves to an environment without `shapely`.
