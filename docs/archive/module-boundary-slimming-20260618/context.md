# Module Boundary Slimming Context

## 2026-06-18

- Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` is dirty on `codex/tno-political-color-recovery`.
- Isolated worktree: `C:\Users\raede\.codex\worktrees\mapcreator-module-boundary-slimming`.
- Branch: `codex/module-boundary-slimming`.
- Base and current HEAD before commit: `5494431c8fb721f7492be5ca84e7b5dab57abdf9`.
- Main validation process owner: main Codex agent.
- Static subagent review: Ptolemy identified i18n/tool/test path changes and warned against moving DOM behavior into core.
- Static closeout review: Kepler identified a startup audit side effect in core i18n; main agent moved the URL/config read into bootstrap.

## Phase 1 Findings

- `js/ui/i18n.js` mixed pure translation lookup, tooltip model building, DOM text refresh, runtime hook calls, and language toggle side effects.
- Core modules imported UI i18n/toast directly, creating reverse dependencies from core to UI.
- `showToastFn` already existed as a runtime hook name in state config, so the shortest stable path was to register `showToast` in `main.js` and call the hook from core modules.
- `tools/i18n_audit.py` and `tools/translate_manager.py` treated `js/ui/i18n_catalog.js` as the runtime catalog owner; they now use the core catalog.

## Phase 1 Implementation Notes

- New core owner files:
  - `js/core/i18n.js`
  - `js/core/i18n_catalog.js`
- UI compatibility and DOM files:
  - `js/ui/i18n.js` imports pure functions from core and owns DOM/language-toggle behavior.
  - `js/ui/i18n_catalog.js` re-exports `UI_COPY_CATALOG` from core.
- Core toast calls now use `callRuntimeHook(..., "showToastFn", ...)`.
- `js/bootstrap/startup_bootstrap_support.js` owns startup support audit configuration and passes the boolean into core i18n.
- `dist/app/js` and `dist/pages-dist-manifest.json` were refreshed with the Pages dist builder.

## Verification Log

- `node --check` on changed JS files: passed.
- `node --check` on startup audit follow-up files: passed.
- `py -3 -m unittest ... -q` targeted Phase 1 suite after review fix: 104 tests passed.
- `npm run verify:test-import-graph`: first failed stale, then passed after `node tools/build_test_import_graph.mjs`.
- `npm run verify:state-write-allowlist`: failed on existing unrelated files: `js/core/renderer/ocean_render_owner.js`, `js/core/renderer/physical_layer_render_owner.js`, `js/core/renderer/strategic_overlay_render_owner.js`, `js/ui/scenario_controls.js`, and three node test files. No Phase 1 i18n/toast/bootstrap file was listed.
- `py -3 tools/build_pages_dist.py`: passed.
- `py -3 -m unittest tests.test_pages_dist_startup_shell -q`: 37 tests passed.
- `npm run test:node:landing-showcase-view`: 8 tests passed.
- `git diff --check`: passed.

## Static Review Closeout

- Kepler found one architectural risk: `js/core/i18n.js` still read URL/localStorage-like startup inputs through `globalThis.location`.
- Fix: core i18n now exposes `setStartupSupportKeyUsageAuditEnabled(enabled)` and bootstrap passes in the environment decision.
- Result: pure i18n/catalog logic stays core-owned, while browser startup inspection stays in bootstrap/UI territory.
- Final code-reviewer lane approved the diff with no issues.
- Final architect lane first returned WATCH because merge confidence depends on integration sequencing with the active TNO renderer WIP, preserving the catalog owner compatibility re-export, and keeping `showToastFn` registration before toast-emitting startup paths.
- Fix: added an assertion that `initToast()` stays before `registerRuntimeHook(state, "showToastFn", showToast);`.
- Architect re-review returned CLEAR and said G002 is resolved from boundary-design view. Integration sequencing risk remains tracked for the integration owner.
- Final Ultragoal checkpoint completed G002 with ai-slop-cleaner, verification, code-reviewer APPROVE, and architect CLEAR evidence.
- Codex aggregate goal completed with `tokensUsed=1143372` and `timeUsedSeconds=3504`.
- `omx ultragoal status --json` reports `artifactComplete=true`. `aggregateComplete=false` remains because G001 is preserved as `review_blocked` audit history after final review blocker recording; the completed G002 checkpoint is the accepted resolution story.

## Next Phase

After commit/integration sequencing, Phase 2 should inspect refresh/chunk/render scheduling boundaries. Start with read-only evidence around `js/core/map_renderer.js`, `js/core/render_boundary.js`, and scenario chunk promotion helpers, then decide whether any code movement is still worth the risk.

## Phase 2-3 Implementation Notes

- Phase 2 kept render execution in `map_renderer.js` and moved pure refresh plan ownership to `js/core/map_renderer/scenario_refresh_plans.js`.
- `scenario_renderer_bridge.js` now imports plan creators from the map renderer internal owner and remains a thin wrapper over renderer refresh entry points.
- `map_renderer.js` still owns runtimeState mutation, render calls, deferred infra handles, `scenarioChunkPromotionVersion`, exact-after-settle identity, and opening owner border execution.
- Phase 3 moved pure hit candidate logic to `js/core/map_renderer/interaction_hit_candidates.js`.
- `map_renderer.js` injects `globalThis.d3?.geoContains`, `recordInteractionDurationMetric`, country-code resolvers, and water-region policy into the pure hit helper wrappers.
- Paint/edit transactions stayed in `map_renderer.js` because they share history capture, dirty state, sidebar refresh, render request, dynamic border recompute, water/open-ocean selection, and double-click fill semantics.

## Phase 2-3 Verification Log

- `node --check js/core/map_renderer.js js/core/scenario/scenario_renderer_bridge.js js/core/map_renderer/scenario_refresh_plans.js`: passed.
- `node --check js/core/map_renderer/interaction_hit_candidates.js tests/interaction_hit_candidates_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs`: passed.
- `npm run test:node:scenario-refresh-plans`: 4/4 passed.
- `npm run test:node:interaction-hit-candidates`: 5/5 passed.
- `py -3 -m unittest tests.test_scenario_renderer_bridge_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_spatial_index_runtime_owner_boundary_contract -q`: 40 tests passed after updating stale transaction-name contract assertions.
- `py -3 -m unittest tests.test_map_renderer_spatial_index_runtime_orchestration_contract tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_map_renderer_public_contract -q`: 23 tests passed.
- `npm run test:node:scenario-chunk-promotion-helpers`: 2/2 passed.
- `npm run test:node:dev-workspace-selection-ownership`: 2/2 passed.
- `npm run test:node:renderer-runtime-state-behavior`: 9/9 passed.
- `py -3 -m unittest tests.test_map_renderer_public_api_import_contract tests.test_frontend_render_boundary_contract tests.test_runtime_hooks_boundary_contract tests.test_map_renderer_public_contract -q`: 19 tests passed.
- `npm run verify:test-import-graph`: passed.
- `npm run test:node:scenario-chunk-contracts`: 43/44 passed; remaining failure is the pre-existing `hoverFacilityAndCityProbeMetricsRemainNamed` registry item.
- `py -3 tools/build_pages_dist.py`: passed and refreshed `dist/app`.
- `py -3 -m unittest tests.test_pages_dist_startup_shell -q`: 37 tests passed.
- `npm run test:node:landing-showcase-view`: 8 tests passed.

## Phase 2-3 Final Review

- ai-slop-cleaner scan found no new masking fallback, temporary workaround, retry/degrade layer, or dependency. The two catch blocks in `interaction_hit_candidates.js` preserve the existing malformed-geometry behavior.
- Euclid found one stale contract assertion: `hover-first-containing` still checked `map_renderer.js` after the fast-path metric moved into `interaction_hit_candidates.js`.
- Fix: `tests/scenario_chunk_contracts.test.mjs` now checks fast-path metric ownership in `interaction_hit_candidates.js` and wrapper forwarding in `map_renderer.js`.
- Lovelace returned CLEAR: new owner modules remain pure, renderer wrappers inject runtime policies, and paint/edit transactions correctly stay in the renderer shell for this phase.
- `npm run test:node:scenario-chunk-contracts` after the review fix remained 43/44 with the same existing `hoverFacilityAndCityProbeMetricsRemainNamed` failure.
