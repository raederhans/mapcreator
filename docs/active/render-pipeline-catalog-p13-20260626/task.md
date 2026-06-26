# P13 Render Pipeline Catalog Extraction Task

## Delivery Package Draft

1. Changed idle render pipeline pass definition ownership: definitions now live in `js/core/renderer/render_pipeline_catalog.js`.
2. `render_pipeline_passes.js` still owns prepare/render behavior and maps catalog `drawKey` entries to injected draw callbacks.
3. Added behavior tests that lock the P13 pass order, confirm every pass is known to `RENDER_PASS_NAMES`, prove draw callback mapping, and verify `ensureIdleRenderPasses(timings, ["political"])` only renders `political`.
4. Updated architecture and Python boundary checks so future edits keep idle pipeline order in the catalog.
5. Added the named script `test:node:render-pipeline-catalog`.

## Files

Core files:
- `js/core/renderer/render_pipeline_catalog.js`
- `js/core/renderer/render_pipeline_passes.js`

Test files:
- `tests/render_pipeline_catalog_behavior.test.mjs`
- `tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`

Tool/package files:
- `tools/check_architecture_boundaries.mjs`
- `package.json`

Documentation files:
- `docs/active/render-pipeline-catalog-p13-20260626/plan.md`
- `docs/active/render-pipeline-catalog-p13-20260626/context.md`
- `docs/active/render-pipeline-catalog-p13-20260626/task.md`
- `docs/active/_worktree_registry.md`

Temporary files:
- None.

## Diff Summary

- Added one pure idle pipeline catalog.
- Replaced hard-coded owner array body with catalog mapping.
- Added targeted node behavior coverage.
- Extended existing boundary contracts.
- Added one package script.

## Verification

Completed so far:
- `node --check js/core/renderer/render_pipeline_catalog.js`
- `node --check js/core/renderer/render_pipeline_passes.js`
- `node --check tests/render_pipeline_catalog_behavior.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `npm run test:node:render-pipeline-catalog`
- `npm run test:node:render-pass-catalog`
- `npm run test:node:render-invalidation-catalog`
- `npm run test:node:render-cache-owner`
- `npm run test:node:renderer-host-inventory`
- `npm run test:node:renderer-runtime-state-behavior`
- `npm run test:node:render-transaction-diagnostics`
- `npm run test:node:scenario-refresh-plans`
- `npm run test:node:exact-after-settle-refresh-plans`
- `npm run test:node:canvas-layer-manager`
- `npm run test:node:scenario-chunk-contracts`
- `npm run verify:architecture-boundaries`
- `npm run verify:state-write-allowlist`
- `npm run verify:test-import-graph`
- `npm run python -- -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q`
- `npm run test:e2e:dev:tno-ready-state`
- `npm run test:e2e:smoke`
- `git diff --check`

Remaining:
- Review and first-principles self-check.
- Functional commit, push, archive closeout, registry closeout, and worktree cleanup.

## Integration Recommendation

Current status: ready-for-integration.

Recommended next step: fast-forward integrate because P13 starts from latest `origin/main` and touches a narrow renderer catalog/test/tool surface.

## Review Notes

- Architect static review flagged dist mirror drift and filename ambiguity. P13 explicitly forbids `dist/app/**` edits and explicitly names `render_pipeline_catalog.js`, so the implementation keeps the requested boundary and records this as an intentional scope constraint.
- Code review returned CLEAR. Self-check found no simpler implementation that preserves the explicit catalog extraction goal.
