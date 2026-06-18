# HGO Preview Projection And Base Replacement Delivery Package

Last updated: 2026-06-18

## Summary

Status: ready-for-integration; final static re-review approved.

## Changed Files

Core files:
- `js/core/hgo_projection_model.js`
- `js/core/map_renderer.js`
- `js/core/renderer/render_pipeline_passes.js`
- `js/core/scenario_apply_pipeline.js`

Tests:
- `tests/hgo_projection_model.node.test.mjs`
- `tests/hgo_raster_renderer.node.test.mjs`
- `tests/scenario_lifecycle_runtime_behavior.test.mjs`
- `tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`
- `tests/test_pages_dist_startup_shell.py`

Tooling / metadata:
- `.gitattributes`
- `tools/build_pages_dist.py`

Docs:
- `docs/active/hgo-preview-projection-base-replace/plan.md`
- `docs/active/hgo-preview-projection-base-replace/context.md`
- `docs/active/hgo-preview-projection-base-replace/task.md`
- `docs/active/_worktree_registry.md`
- `lessons learned.md`

Generated / dist:
- `dist/app/js/core/hgo_projection_model.js`
- `dist/app/js/core/map_renderer.js`
- `dist/app/js/core/renderer/render_pipeline_passes.js`
- `dist/app/js/core/scenario_apply_pipeline.js`
- `landing/assets/work-*.json`
- `dist/assets/work-*.json`
- `dist/pages-dist-manifest.json`

## Diff Summary

- Adds HGO projection forward round-trip validation.
- Adds HGO-ready normal overlay pass signature invalidation and empty-pass early returns.
- Forces `contextScenario` cache refresh when the HGO ready token changes, so transform reuse cannot keep old scenario overlays above the HGO preview.
- Keeps political pass signatures color-revision-first so partial political repaint preserves its existing static-signature split.
- Tightens scenario apply commit state so bad non-blank runtime topology does not reuse stale live topology.
- Locks `work-*.json` LF normalization so Pages manifest byte counts match Git blob sizes on Windows.
- Adds red-first node/Python regression coverage for projection, raster inspect/transparency, renderer pass contracts, and scenario topology hardening.
- Regenerates Pages dist mirrors.

## Commit State

Committed on branch `codex/hgo-preview-projection-base-replace`. Final report names the pushed branch HEAD hash.

## Base / Main Divergence

- Base: `origin/main@1206eb43`
- Current main checkout has unrelated dirty WIP on `codex/tno-political-color-recovery`.
- Branch is not diverged from current `origin/main`; merge base equals `origin/main@1206eb43`.

## Overlap Risk

- Red path overlap with parent WIP: `js/core/map_renderer.js`, `dist/app/js/core/map_renderer.js`, and Pages dist manifest after generation.
- Integration owner should compare this branch against `codex/tno-political-color-recovery` before merging.

## Verification

- `node --test tests/hgo_projection_model.node.test.mjs tests/hgo_raster_renderer.node.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs` -> PASS, 39/39.
- `py -3 -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract` -> PASS, 5/5.
- `py -3 -m unittest tests.test_pages_dist_startup_shell -q` -> PASS, 37/37.
- `node --check js/core/hgo_projection_model.js` -> PASS.
- `node --check js/core/map_renderer.js` -> PASS.
- `node --check js/core/renderer/render_pipeline_passes.js` -> PASS.
- `node --check js/core/scenario_apply_pipeline.js` -> PASS.
- Source/dist normalized content compare for four changed core files -> PASS.
- Pages manifest work asset sizes -> PASS: `3660`, `1046`, `942`, matching `git cat-file -s` for the three `dist/assets/work-*.json` blobs.
- `git diff --check` -> PASS.
- `npm run verify:pages-dist` with `.runtime/tmp/python-shim/python.cmd` -> PASS: build, 37/37 Pages dist unittest, 8/8 landing node tests.
- Independent static re-review -> APPROVE after P1/P2 cache/signature fixes.

## Remaining Risks

- No browser visual smoke was run; deterministic unit/static contracts and Pages dist were used for this stage.
- Parent checkout remains dirty and has renderer WIP, so merging to main should wait for integration planning.

## Recommended Integration Action

Commit and push this branch as ready-for-integration. Integration owner should compare against `codex/tno-political-color-recovery` before merging to main.
