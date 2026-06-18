# TNO + HGO Integration Task

## Current State

- Status: in-progress
- Current owner: main Codex agent
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-tno-hgo-integration`
- Branch: `codex/tno-hgo-integration`
- Base: `origin/main@1206eb43`

## Delivery Package Draft

### Changed Files

Integration scaffolding:

- `docs/active/_worktree_registry.md`
- `docs/active/tno-hgo-integration/plan.md`
- `docs/active/tno-hgo-integration/context.md`
- `docs/active/tno-hgo-integration/task.md`
- `.omx/context/tno-hgo-integration-20260618T032909Z.md`

TNO scoped code files are already present in `origin/main@1206eb43`; no parent dirty patch is imported.

HGO integration files came from cherry-pick `9494ca52`:

- `.gitattributes`
- `js/core/hgo_projection_model.js`
- `js/core/map_renderer.js`
- `js/core/renderer/render_pipeline_passes.js`
- `js/core/scenario_apply_pipeline.js`
- `dist/app/js/core/hgo_projection_model.js`
- `dist/app/js/core/map_renderer.js`
- `dist/app/js/core/renderer/render_pipeline_passes.js`
- `dist/app/js/core/scenario_apply_pipeline.js`
- `dist/pages-dist-manifest.json`
- HGO/scenario/render pipeline/Pages tests and HGO task docs

### Validation

Completed:

- `node --test tests/hgo_projection_model.node.test.mjs tests/hgo_raster_renderer.node.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs`: pass, 39/39.
- `npm run test:node:renderer-runtime-state-behavior`: pass, 9/9.
- `npm run test:node:scenario-chunk-contracts`: 43/44, known existing `hoverFacilityAndCityProbeMetricsRemainNamed` red point.
- `py -3 -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q`: pass, 5/5.
- `npm run test:e2e:dev:political-progressive-recovery`: pass, 3/3.
- `npm run verify:pages-dist`: pass, builder + 37 startup shell tests + 8 landing node tests.
- `node --check js/core/map_renderer.js`, `js/core/hgo_projection_model.js`, `js/core/renderer/render_pipeline_passes.js`, `js/core/scenario_apply_pipeline.js`: pass.
- `git diff --check`: pass.

### Remaining Risks

- `npm run test:node:scenario-chunk-contracts` retains the existing unrelated `hoverFacilityAndCityProbeMetricsRemainNamed` failure.
- Parent checkout contains unrelated landing/main drift, so it remains a read-only evidence source.
- Integration worktree uses ignored local `node_modules` from `npm ci` and `.runtime/tmp/python-shim/python.cmd` for verification only.
