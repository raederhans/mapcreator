# Module Boundary Slimming Task

## Delivery Package: Phase 1

1. Changed pure translation/catalog ownership: moved runtime catalog and pure i18n/tooltip helpers into `js/core`.
2. Preserved UI behavior: `js/ui/i18n.js` still owns DOM refresh, language toggle, and runtime hook calls.
3. Removed direct core imports of UI i18n/toast from renderer, file manager, and scenario runtime modules.
4. Added toast hook wiring: `main.js` registers `showToastFn`, and core modules call it through runtime hooks.
5. Moved startup audit environment reads into bootstrap, then updated tools, tests, import graph, and Pages dist output.

## Changed Files

Core files:
- `js/core/i18n.js`
- `js/core/i18n_catalog.js`
- `js/core/map_renderer.js`
- `js/core/file_manager.js`
- `js/core/scenario_data_health.js`
- `js/core/scenario_manager.js`
- `js/core/scenario_recovery.js`
- `js/core/scenario_resources.js`
- `js/bootstrap/startup_bootstrap_support.js`
- `js/main.js`

UI compatibility files:
- `js/ui/i18n.js`
- `js/ui/i18n_catalog.js`

Tools and tests:
- `tools/i18n_audit.py`
- `tools/translate_manager.py`
- `tests/e2e/test-import-graph.json`
- targeted i18n/runtime/startup/sidebar/transport contract tests

Dist:
- `dist/app/js/...`
- `dist/pages-dist-manifest.json`

Docs:
- `docs/active/module-boundary-slimming/*`
- `docs/active/_worktree_registry.md`

## Diff Summary

- Added new core i18n source files and matching dist files.
- Reduced UI i18n catalog to a compatibility re-export.
- Replaced core-to-UI imports with core imports plus runtime hook calls.
- Kept startup audit URL/config reading in bootstrap and passed only a boolean into core i18n.
- Regenerated checked-in import graph and Pages dist manifest.

## Commit State

- Current worktree is committed locally on `codex/module-boundary-slimming` after the final checkpoint.
- Recommended state: ready-for-integration; independent static review risk has been fixed.
- Ultragoal G002 is complete after the ordering assertion and architect CLEAR. Codex aggregate goal is complete. Ultragoal status reports `artifactComplete=true`; G001 remains `review_blocked` as audit-visible pre-fix review evidence.

## Base / Main Divergence

- Base commit: `origin/main@5494431c8fb721f7492be5ca84e7b5dab57abdf9`.
- Branch HEAD before Phase 1 commit: `5494431c8fb721f7492be5ca84e7b5dab57abdf9`.
- Current main and origin/main were equal when the worktree was created.

## Conflict Risk

- Red overlap with active parent WIP: `js/core/map_renderer.js`, `dist/app/js/core/map_renderer.js`, `dist/pages-dist-manifest.json`.
- Yellow overlap with future i18n/localization work: `js/ui/i18n.js`, `js/core/i18n.js`, catalog tools/tests.
- Green for unrelated landing-only or data-only work.

## Verification

- `node --check` on changed JS: passed.
- `node --check` on startup audit follow-up files: passed.
- Targeted contract suite after review fix: 104 tests passed.
- `npm run verify:test-import-graph`: passed.
- Equivalent Pages dist gate using `py -3`: builder passed, startup shell 37 tests passed, landing showcase 8 node tests passed.
- `git diff --check`: passed.
- ai-slop-cleaner changed-file scan: passed with no masking fallback or temporary workaround findings.
- Final code-reviewer lane: APPROVE with no issues.
- Final architect lane after ordering assertion: CLEAR. Integration sequencing against the parent TNO renderer WIP remains an integration-owner task.
- Final Ultragoal gate: ai-slop-cleaner passed, verification passed, code-reviewer APPROVE, architect CLEAR, G002 checkpoint complete.

## Remaining Risk

- Full `npm run verify:state-write-allowlist` has existing unrelated failures outside this phase.
- Full toolbar/transport module suite has unrelated existing text-contract failures; affected methods passed.
- Main integration should happen after comparing against the active parent renderer WIP.
- Integration must still account for red overlap with the parent TNO renderer WIP.

## Recommended Next Step

Integrate this Phase 1 branch after sequencing against the current TNO renderer WIP. Use rebase or cherry-pick only after comparing `map_renderer.js`, the matching dist file, and `dist/pages-dist-manifest.json`.

## Delivery Package: Phase 2-3

1. Moved scenario refresh plan creation and chunk-promotion target-pass policy into `js/core/map_renderer/scenario_refresh_plans.js`.
2. Kept `scenario_renderer_bridge.js` as a thin wrapper that imports plan creators and forwards renderer refresh calls.
3. Moved pure hit result/candidate collection/ranking/first-containing/water preference logic into `js/core/map_renderer/interaction_hit_candidates.js`.
4. Kept paint/edit transactions in `map_renderer.js` because they still own history, dirty state, sidebar refresh, render request, and border recompute side effects.
5. Added named Node behavior tests and refreshed `dist/app` output.

## Changed Files: Phase 2-3

Core files:
- `js/core/map_renderer.js`
- `js/core/scenario/scenario_renderer_bridge.js`
- `js/core/map_renderer/scenario_refresh_plans.js`
- `js/core/map_renderer/interaction_hit_candidates.js`

Tests and tooling:
- `package.json`
- `tests/scenario_refresh_plans_behavior.test.mjs`
- `tests/interaction_hit_candidates_behavior.test.mjs`
- `tests/scenario_chunk_contracts.test.mjs`
- `tests/test_scenario_renderer_bridge_boundary_contract.py`
- `tests/test_map_renderer_spatial_index_runtime_owner_boundary_contract.py`
- `tests/test_map_renderer_spatial_index_runtime_orchestration_contract.py`

Dist:
- `dist/app/js/core/map_renderer.js`
- `dist/app/js/core/scenario/scenario_renderer_bridge.js`
- `dist/app/js/core/map_renderer/scenario_refresh_plans.js`
- `dist/app/js/core/map_renderer/interaction_hit_candidates.js`
- `dist/pages-dist-manifest.json`

Docs:
- `docs/active/module-boundary-slimming/plan.md`
- `docs/active/module-boundary-slimming/context.md`
- `docs/active/module-boundary-slimming/task.md`
- `docs/active/_worktree_registry.md`

## Diff Summary: Phase 2-3

- Reduced `map_renderer.js` by moving pure refresh and interaction-hit policy code into internal map renderer owner modules.
- Removed refresh-plan creator logic from `scenario_renderer_bridge.js`.
- Replaced repeated land/water/special grid candidate loops with one pure grid candidate helper.
- Added behavior tests for both pure modules and updated existing static contracts to check the new ownership boundary.
- Rebuilt Pages dist so source and checked-in release output stay aligned.

## Commit State: Phase 2-3

- Current worktree is not committed yet; final review is complete and integration validation is pending.
- Recommended state: commit on `codex/module-boundary-slimming`, then integrate through a clean main worktree.

## Base / Main Divergence: Phase 2-3

- Current branch base remains `origin/main@5494431c8fb721f7492be5ca84e7b5dab57abdf9`.
- Branch includes Phase 1 commit `c415033026af6041bbce5d984bbf30eb19c34314` plus uncommitted Phase 2-3 changes.
- Local `main` and `origin/main` were still `5494431c8fb721f7492be5ca84e7b5dab57abdf9` when Phase 2-3 started.

## Conflict Risk: Phase 2-3

- Red overlap with active parent WIP remains: `js/core/map_renderer.js`, `dist/app/js/core/map_renderer.js`, `dist/pages-dist-manifest.json`.
- Yellow semantic overlap with future renderer interaction/refactor work: `js/core/map_renderer/interaction_hit_candidates.js`, `js/core/map_renderer/scenario_refresh_plans.js`, `scenario_renderer_bridge.js`.
- Green for unrelated landing-only and data-only work.

## Verification: Phase 2-3

- `npm run test:node:scenario-refresh-plans`: 4/4 passed.
- `npm run test:node:interaction-hit-candidates`: 5/5 passed.
- Targeted Python bridge/refresh/spatial owner suite: 40 tests passed.
- Targeted Python interaction/render/public/import/runtime-hook suites: 42 tests passed.
- `npm run test:node:scenario-chunk-promotion-helpers`: 2/2 passed.
- `npm run test:node:dev-workspace-selection-ownership`: 2/2 passed.
- `npm run test:node:renderer-runtime-state-behavior`: 9/9 passed.
- `npm run verify:test-import-graph`: passed.
- `npm run test:node:scenario-chunk-contracts`: 43/44 passed with the existing `hoverFacilityAndCityProbeMetricsRemainNamed` failure.
- `py -3 tools/build_pages_dist.py`: passed.
- `py -3 -m unittest tests.test_pages_dist_startup_shell -q`: 37 tests passed.
- `npm run test:node:landing-showcase-view`: 8 tests passed.
- ai-slop-cleaner changed-scope scan: passed; no new masking fallback, temporary workaround, retry/degrade layer, or dependency.
- Code-reviewer lane: found one stale `hover-first-containing` contract assertion in `tests/scenario_chunk_contracts.test.mjs`; fixed by checking `interaction_hit_candidates.js` for fast-path metric ownership and renderer for wrapper forwarding.
- Architecture lane: CLEAR; new owner modules remain pure and paint/edit transactions correctly stay in `map_renderer.js`.
- `npm run test:node:scenario-chunk-contracts` after the review fix: 43/44 passed with the same existing `hoverFacilityAndCityProbeMetricsRemainNamed` failure.

## Remaining Risk: Phase 2-3

- The pre-existing `scenario-chunk-contracts` hover metric failure remains outside this Phase 2-3 change.
- Main integration still needs clean-worktree sequencing because the parent checkout carries overlapping renderer WIP.

## Recommended Next Step: Phase 2-3

Run final review gates, commit the branch, merge through a clean main worktree, rerun the focused post-merge validation, push feature branch and main, then update this package to integrated.
