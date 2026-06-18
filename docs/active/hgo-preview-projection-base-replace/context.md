# HGO Preview Projection And Base Replacement Context

Last updated: 2026-06-18

## Current State

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-hgo-preview-projection-base-replace`
- Branch: `codex/hgo-preview-projection-base-replace`
- Base: `origin/main@1206eb43`
- Main checkout: `C:\Users\raede\Desktop\dev\mapcreator` is dirty on `codex/tno-political-color-recovery`.
- Integration risk: red against the dirty TNO checkout because both touch `js/core/map_renderer.js` and `dist/app/js/core/map_renderer.js`.

## Evidence Log

1. Previous analysis confirmed D3 `geoEqualEarth().invert()` can return valid lon/lat at the south pole for below-domain projected points; this explains the bottom stripe distortion.
2. `hgo_raster_renderer` already has correct null-hit behavior through `unprojectedPixelCount`, `unknownColor`, and point inspection null results.
3. Render pass order places `hgoPreview` before later context/border/marker/label passes, so HGO must suppress later normal overlay passes or those passes can cover it.
4. The HGO pass signature already contains `hgo:on/off`; normal pass signatures need the same visibility state when their draw behavior changes.
5. The scenario prepare path already rejects non-blank unrenderable topology, but commit state still needs to avoid stale live topology as a defensive invariant.

## Progress

- [x] Read task attachment, relevant skills, AGENTS rules, memory, and `lessons learned.md`.
- [x] Created isolated worktree from `origin/main`.
- [x] Created active task documentation.
- [x] Create red-first tests.
- [x] Implement source changes.
- [x] Sync dist/app.
- [x] Verify targeted tests and Pages dist.
- [x] Run UltraQA matrix.
- [x] Complete independent review findings pass.
- [x] Fix review blockers.
- [x] Complete final independent re-review.
- [x] Finalize delivery package and registry.

## Verification Log

- Red-first node run: `node --test tests/hgo_projection_model.node.test.mjs tests/hgo_raster_renderer.node.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs` failed on projection round-trip, raster off-globe projection counts, and stale topology reuse.
- Red-first renderer contract: `py -3 -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract` failed because HGO visibility signature/suppression did not exist.
- Targeted node verification: `node --test tests/hgo_projection_model.node.test.mjs tests/hgo_raster_renderer.node.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs` passed 39/39.
- Renderer boundary verification: `py -3 -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract` passed 5/5.
- Syntax checks: `node --check js/core/hgo_projection_model.js`, `node --check js/core/map_renderer.js`, and `node --check js/core/scenario_apply_pipeline.js` passed.
- Post-review renderer boundary verification: `py -3 -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q` passed 5/5 after adding `contextScenario` HGO token refresh and political signature order checks.
- Syntax checks: `node --check js/core/hgo_projection_model.js`, `node --check js/core/map_renderer.js`, `node --check js/core/renderer/render_pipeline_passes.js`, and `node --check js/core/scenario_apply_pipeline.js` passed.
- Source/dist normalized content check passed for `hgo_projection_model.js`, `map_renderer.js`, `render_pipeline_passes.js`, and `scenario_apply_pipeline.js`.
- `git diff --check` passed.
- Pages manifest work asset sizes now match Git LF blob sizes: `assets/work-alt-history-med.json` = `3660`, `assets/work-atlas-japan-corridor.json` = `1046`, `assets/work-scenario-switch-europe.json` = `942`.
- `py -3 -m unittest tests.test_pages_dist_startup_shell -q` passed 37/37 after adding root asset JSON LF coverage.
- `node --test tests/hgo_projection_model.node.test.mjs tests/hgo_raster_renderer.node.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs` passed 39/39 after review fixes.
- `npm run verify:pages-dist` passed after `.runtime/tmp/python-shim/python.cmd` routed the script's `python` command to system `py -3` with `shapely 2.1.2`: Pages dist build passed, `tests.test_pages_dist_startup_shell` passed 37/37, and landing showcase node tests passed 8/8.
- Review blocker fixes:
  - `contextScenario` HGO visibility token changes now use `hgo-runtime-preview` as the dirty reason, forcing the empty HGO-overridden pass into cache instead of taking the transform reuse skip.
  - Political pass signature keeps `colorRevision` as the first segment, with HGO visibility in the static segment used by partial political repaint.
- Independent final static re-review: APPROVE. No blocking finding in reviewed scope.

## UltraQA Scenario Matrix

| Scenario | Purpose | Validation |
| --- | --- | --- |
| Projection baseline | Valid projected pixels still map to the same source pixels through dpr/zoom transforms. | Existing and updated HGO projection tests pass. |
| Off-globe projection | Equal-Earth-like invert clamps to pole but forward projection does not round-trip. | New projection model test returns `null`. |
| Raster transparency | Bottom/off-domain HGO pixels become unknown/transparent and increment unprojected count. | New raster renderer test checks alpha and counts. |
| Point inspection | User hover/click inspection on off-domain pixels does not resolve a fake HGO province. | New raster renderer inspection test returns `null`. |
| HGO base replacement | HGO ready clears political/context/border/marker/label cached passes. | Renderer boundary contract checks signatures and early returns. |
| Context scenario cache reuse | HGO ready transition must clear old scenario overlay cache even under balanced transform reuse. | Renderer boundary contract checks HGO token change reason path. |
| Political partial repaint | Color-only political repaint keeps its color-revision-first signature split. | Renderer boundary contract checks political signature order. |
| Scenario topology hardening | Bad non-blank topology cannot reuse stale live topology in commit state. | Scenario apply test checks default-or-null topology and null scenario runtime data. |

## UltraQA Result

- Projection baseline: pass.
- Off-globe projection: pass.
- Raster transparency: pass.
- Point inspection: pass.
- HGO base replacement: pass.
- Context scenario cache reuse: pass.
- Political partial repaint: pass.
- Scenario topology hardening: pass.

## Open Risks

- `map_renderer.js` has active unrelated WIP in the parent checkout; this branch should end as ready-for-integration until integration owner resolves ordering.
- E2E browser coverage for visual HGO preview can be expensive. This pass prioritizes deterministic unit/static contracts plus Pages dist.
