# Module Boundary Continuation Task

## Current Status

Phase A, Phase B, Phase C, the HGO runtime preview overlap, and the HGO vector scene terrain follow-up are integrated and verified on main. Phase D guardrail implementation is in progress in `codex/module-boundary-phase-d-guardrails`.

## Phase D Delivery Package

1. Added a module budget contract for `js/ui/toolbar.js` so the shell stays below 3100 source lines.
2. Added a focused-owner budget for `js/ui/toolbar/scenario_context_bar_controller.js` so the Phase B owner stays below 240 source lines.
3. Kept the guardrail inside the existing `tests/test_toolbar_split_boundary_contract.py` entry instead of adding a new test system.
4. Left `package.json`, `dist/app`, and Pages manifest unchanged because this phase only changes a Python boundary contract.

## Phase D Files

Test files:
- `tests/test_toolbar_split_boundary_contract.py`

Docs:
- `docs/active/module-boundary-continuation-20260618/plan.md`
- `docs/active/module-boundary-continuation-20260618/context.md`
- `docs/active/module-boundary-continuation-20260618/task.md`
- `docs/active/_worktree_registry.md`

## Phase D Diff Summary

- Base commit: `main@e4b04c66`.
- Current branch: `codex/module-boundary-phase-d-guardrails`.
- Commit state: not committed yet; first verification is complete; commit, integration, post-merge verification, and cleanup are pending.
- Direct file overlap is limited to the toolbar boundary test and active docs.
- Overlap risk: green for production behavior because no source runtime or dist file changes are made.

## Phase D Verification

- Passed: `npm run verify:toolbar-split-boundary` (51 tests).
- Passed: `npm run verify:test-import-graph` (48 specs).
- Passed: `git diff --check`.
- Passed: ai-slop diff scan for risky added-line patterns.

## Phase B Delivery Package

1. Moved toolbar scenario context bar refresh, selection-chip updates, safe-width layout, collapse binding, resize refresh, and guide highlight timer into `js/ui/toolbar/scenario_context_bar_controller.js`.
2. Kept `toolbar.js` as the composition shell that wires DOM nodes, narrow facade dependencies, and existing runtime hook names.
3. Added a focused Node behavior suite and a named npm entry for the new controller.
4. Updated toolbar/UI boundary contracts to assert implementation ownership in the new controller and facade ownership in `toolbar.js`.
5. Rebuilt Pages dist so source and `dist/app` include the new browser module.

## Phase B Files

Core files:
- `js/ui/toolbar.js`
- `js/ui/toolbar/scenario_context_bar_controller.js`
- `dist/app/js/ui/toolbar.js`
- `dist/app/js/ui/toolbar/scenario_context_bar_controller.js`

Test files:
- `tests/scenario_context_bar_controller_behavior.test.mjs`
- `tests/test_toolbar_split_boundary_contract.py`
- `tests/test_ui_rework_plan01_foundation_contract.py`

Config and dist files:
- `package.json`
- `dist/pages-dist-manifest.json`

Docs:
- `docs/active/module-boundary-continuation-20260618/plan.md`
- `docs/active/module-boundary-continuation-20260618/context.md`
- `docs/active/module-boundary-continuation-20260618/task.md`
- `docs/active/_worktree_registry.md`

## Phase B Diff Summary

- Base commit: `main@84b9ef5b`.
- Current branch: `codex/module-boundary-phase-b-ui-shell`.
- Functional commit: `838b08fa16ca363ae4ed721c8fade6e42fc863fa`.
- Current commit state: committed, pushed as a recovery branch, fast-forward merged into main, post-merge verified, and worktree removed.
- `toolbar.js` is slimmer by removing the scenario context bar implementation while preserving hook names and shell orchestration.
- The new owner has no renderer, HGO preview, scenario apply, or transport-workbench side effects.
- Potential conflicts: yellow by semantics with future `scenario_controls.js` selector-shell work; direct file overlap is limited to toolbar, tests, package script, docs, and Pages dist manifest.

## Phase B Verification

- Passed: `node --check js/ui/toolbar.js js/ui/toolbar/scenario_context_bar_controller.js tests/scenario_context_bar_controller_behavior.test.mjs`.
- Passed: `npm run test:node:scenario-context-bar-controller` (6 tests).
- Passed: `npm run verify:toolbar-split-boundary` (50 tests).
- Passed: `npm run python -- -m unittest tests.test_ui_rework_plan01_foundation_contract -q` (6 tests).
- Passed: `npm run test:node:hgo-runtime-preview` (19 tests).
- Passed: `npm run verify:test-import-graph`.
- Passed: `npm run verify:pages-dist` (Pages startup shell 37 tests and landing showcase 8 tests).
- Passed: `git diff --check`.

## Phase B Review Gates

- Hypatia read-only candidate review recommended a future `scenario_controls.js` selector-shell split. Phase B stayed with toolbar scenario context bar extraction to match the active toolbar shell scope.
- Curie code review found one low-risk missing default-state edge; the controller constructor now handles empty dependencies and the behavior suite covers that construction path.
- Archimedes documentation review found stale Phase B/HGO wording; the active plan, context, task, and registry were corrected before commit.
- Post-merge verification passed on main: scenario context controller 6 tests, toolbar split boundary 50 tests, HGO runtime preview 19 tests, import graph, Pages dist startup shell 37 tests, landing showcase 8 tests, and diff check.
- The post-merge Pages dist run refreshed `dist/pages-dist-manifest.json` for the current main checkout's generated data byte counts.

## Phase A Delivery Package

1. Changed exact-after-settle pure plan policy ownership.
2. Added focused behavior tests and a named npm script.
3. Updated renderer/physical/chunk static contracts for the new owner.
4. Kept renderer execution side effects in `map_renderer.js`.
5. Ai-slop scan, ponytail review, independent behavior review, Pages dist verification, and diff check are complete.

## Files Touched So Far

Core files:
- `js/core/map_renderer.js`
- `js/core/map_renderer/exact_after_settle_refresh_plans.js`
- `dist/app/js/core/map_renderer.js`
- `dist/app/js/core/map_renderer/exact_after_settle_refresh_plans.js`

Test files:
- `tests/exact_after_settle_refresh_plans_behavior.test.mjs`
- `tests/physical_layer_contracts.test.mjs`
- `tests/scenario_chunk_contracts.test.mjs`
- `tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`

Config files:
- `package.json`
- `dist/pages-dist-manifest.json`

Docs:
- `docs/active/module-boundary-continuation-20260618/plan.md`
- `docs/active/module-boundary-continuation-20260618/context.md`
- `docs/active/module-boundary-continuation-20260618/task.md`
- `docs/active/_worktree_registry.md`

## Diff Summary

- Tracked files before staging: renderer and dist mirrors each slim by moving exact-after-settle pass policy into a pure module; contracts update string anchors to the new owner; `package.json` adds one named Node test entry.
- New files before staging: exact-after-settle plan module, matching Pages dist module, behavior test, and active continuation docs.
- Base commit: `main@4ea5252ed68f80773c0ca5f390ac218656edceb2`.
- Main integration: fast-forwarded to `9139c0737461650e79177ded24fdecf2867c4028` and pushed to `origin/main`.
- Feature branch: `codex/module-boundary-phase-a-renderer-shell` pushed for recovery.
- Conflict risk after integration: yellow against active `codex/hgo-runtime-preview-fix`, which also touches `js/core/map_renderer.js` and renderer boundary tests.

## Verification

- Passed: `npm run test:node:exact-after-settle-refresh-plans` (5 tests).
- Passed: `npm run test:node:scenario-refresh-plans` (4 tests).
- Passed: `npm run test:node:interaction-hit-candidates` (5 tests).
- Passed: `node --test tests/physical_layer_contracts.test.mjs` (2 tests).
- Passed: `py -3 -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q` (5 tests).
- Passed: `npm run verify:test-import-graph`.
- Passed: `npm run verify:pages-dist` after the review cleanup.
- Passed: `git diff --check`.
- Post-merge clean worktree gate passed from `C:\Users\raede\.codex\worktrees\mapcreator-phase-a-postmerge-verify` before cleanup: exact-after-settle 5 tests, scenario refresh 4 tests, hit candidates 5 tests, physical layer 2 tests, renderer boundary 5 tests, import graph, Pages dist startup shell 37 tests, landing showcase 8 tests, and diff check.
- Known existing failure: `tests/scenario_chunk_contracts.test.mjs` remains 43/44 because `hoverFacilityAndCityProbeMetricsRemainNamed` fails in the existing large contract block.

## Review Gates

- Ai-slop scan: clear for new production code.
- Ponytail review: CLEAR; one duplicate-normalize cleanup applied.
- Independent behavior review: PASS; 0 blocking findings.

## Current Recommended Next Step

Start Phase D guardrails from clean current main. Recommended first guardrail: add a source module budget assertion to `tests/test_toolbar_split_boundary_contract.py`, then expand import-graph or Pages dist budgets only if the source budget proves stable.

## Phase C Delivery Package

1. Moved backend console static text, locale translation, document metadata helpers, sample project payload creation, date formatting, and HTML escaping into `backend/backend_console_helpers.js`.
2. Kept DOM rendering, state, backend API calls, dialogs, downloads, refresh orchestration, and event binding in `backend/app.js`.
3. Added focused helper behavior tests and connected them to backend npm verification entries.
4. Added a small `tools/run_python.mjs` wrapper so backend preview npm entries can find Python on Windows and common POSIX shells.
5. Recorded HGO overlap risk so Phase B waits behind the active HGO worktree.

## Phase C Files

Core files:
- `backend/app.js`
- `backend/backend_console_helpers.js`

Test files:
- `tests/backend_console_helpers.test.mjs`

Config files:
- `package.json`

Tooling files:
- `tools/run_python.mjs`

Docs:
- `docs/active/module-boundary-continuation-20260618/plan.md`
- `docs/active/module-boundary-continuation-20260618/context.md`
- `docs/active/module-boundary-continuation-20260618/task.md`
- `docs/active/_worktree_registry.md`

Temporary files:
- `.runtime/tmp/extract_backend_i18n.mjs` was used for one mechanical extraction attempt and removed before validation.

## Phase C Diff Summary

- Base commit: `main@5fc3dc3d0897ee402b086058fb81fd51bd06c743`.
- Current branch: `codex/module-boundary-phase-c-backend-shell`.
- Functional commit: `8964266868f1f675d0076d93f55172a4ec9910fa`.
- `backend/app.js` is slimmer by removing pure text/helper logic and importing a pure helper module.
- `backend/backend_console_helpers.js` owns backend console i18n data, key-list access, locale resolution, metadata text, sample payload shape, date formatting, and escaping.
- `tests/backend_console_helpers.test.mjs` covers key parity, page key coverage, locale resolution, unknown-key interpolation, metadata text, sample payload schema, date tolerance, and escaping.
- `package.json` adds a named helper test, a Python wrapper script, and extended backend verification scripts.
- Current commit state: committed, pushed as a recovery branch, fast-forward merged into main, and post-merge verified.
- Base/main divergence: Phase C was based on `origin/main@5fc3dc3d` and merged cleanly.
- Historical Phase C conflict risk: resolved by integrating HGO runtime preview before Phase B. No active HGO worktree remains for Phase B sequencing.

## Phase C Verification

- Passed: `node --check tools/run_python.mjs`, `backend/app.js`, `backend/backend_console_helpers.js`, and `tests/backend_console_helpers.test.mjs`.
- Passed: `npm run python -- --version` (Python 3.12.10).
- Passed: `npm run test:node:backend-console-helpers` (6 tests).
- Passed: `npm run verify:backend-preview` (Python 25 tests, Node 13 tests, syntax checks).
- Passed: `npm run test:node:backend-cloud-support` (36 tests).
- Passed: `git diff --check`.
- Passed: ai-slop diff scan for risky added-line patterns.
- Post-merge passed: `npm run verify:backend-preview` (Python 25 tests, Node 13 tests, syntax checks).
- Post-merge passed: `npm run test:node:backend-cloud-support` (36 tests).
- Post-merge passed: `git diff --check`.

## Phase C Review Gates

- Ptolemy boundary review: clear after replacing Windows-only `py -3` scripts, using shared title translation, and narrowing test key access.
- Helmholtz coverage review: static page i18n key coverage added, and untracked files will be staged explicitly.
- Duplicate HGO WIP from the parent main checkout was preserved in stash `preserve-main-hgo-runtime-preview-duplicate-wip-before-phase-c-integration-20260618T182321` and patch backup `.runtime/cleanup-backups/phase-c-main-hgo-duplicate-preserve-20260618T182321/`.
- Phase C worktree was removed after merge and verification.

## HGO Integration Delivery Package

1. Integrated `codex/hgo-runtime-preview-fix` into main at `db2e40d1`.
2. Preserved HGO projected preview rendering through the renderer lifecycle, current projection, and zoom state.
3. Updated HGO preview restore/reset behavior from `scenario_controls.js`.
4. Kept Python npm scripts on the cross-platform `tools/run_python.mjs` wrapper.
5. Landed the border/ocean/river HGO vector scene follow-up as commit `deba2034`, with earlier stashes retained as recovery backups.

## HGO Files

Core files:
- `js/core/map_renderer.js`
- `js/ui/scenario_controls.js`
- `js/ui/toolbar/hgo_runtime_preview_controller.js`
- `tools/run_python.mjs`

Test files:
- `tests/hgo_runtime_preview_behavior.test.mjs`
- `tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`
- `tests/test_toolbar_split_boundary_contract.py`
- `tests/test_pages_dist_startup_shell.py`

Config and dist files:
- `package.json`
- `dist/app/js/core/map_renderer.js`
- `dist/app/js/ui/scenario_controls.js`
- `dist/app/js/ui/toolbar/hgo_runtime_preview_controller.js`
- `dist/pages-dist-manifest.json`

Docs:
- `docs/active/module-boundary-continuation-20260618/plan.md`
- `docs/active/module-boundary-continuation-20260618/context.md`
- `docs/active/module-boundary-continuation-20260618/task.md`
- `docs/active/_worktree_registry.md`

Temporary and recovery files:
- Old HGO worktree path still has locked zero-byte `.runtime/dev/hgo-fix-server.err.log` and `.runtime/dev/hgo-fix-server.out.log` files after Git worktree removal.
- Follow-up stash: `preserve-hgo-worktree-followups-before-cleanup-20260618T1935`.
- Duplicate parent follow-up stash: `preserve-main-border-ocean-river-followup-before-phase-b-20260618T191148`.
- Patch backups: `.runtime/cleanup-backups/hgo-worktree-followups-before-cleanup-20260618T1935/` and `.runtime/cleanup-backups/main-border-ocean-river-followup-before-phase-b-20260618T191148/`.
- Follow-up commit replacing the active work: `deba20346b4d90cc9649136bbf9374095511c8ce`.

## HGO Diff Summary

- Base commit: `main@ea9fd52a0842f675dc61e14cbb40e7e2d675dafb`.
- Integrated commit: `db2e40d1`.
- Feature branch: `codex/hgo-runtime-preview-fix`, pushed for recovery.
- Current commit state: HGO runtime preview and HGO vector terrain suppression are integrated into main; closeout docs are pending commit.
- Base/main divergence: HGO was fast-forwarded into main after Phase C.
- Conflict risk: Phase B is yellow by semantics because it will touch UI shell files that now contain HGO preview wiring; vector terrain suppression is renderer-owner work and should stay separate from Phase B UI extraction.

## HGO Verification

- Passed: `npm run test:node:hgo-runtime-preview` (19 tests).
- Passed: `npm run verify:scenario-contracts:hgo`.
- Passed: `npm run verify:test-import-graph`.
- Passed: `npm run verify:pages-dist`.
- Passed: `npm run python -- -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_toolbar_split_boundary_contract tests.test_pages_dist_startup_shell -q` (92 tests after Pages manifest refresh).
- Passed: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`.
- Passed: `git diff --check`.
- Passed for vector terrain suppression: `node --test tests/border_draw_owner_behavior.test.mjs tests/ocean_render_owner_behavior.test.mjs tests/river_layer_render_owner_behavior.test.mjs` (18 tests).
- Passed after vector terrain suppression: `npm run verify:pages-dist` (Pages startup shell 37 tests, landing showcase 8 tests).
- Passed after vector terrain suppression: `npm run verify:test-import-graph`.

## HGO Review Gates

- Integration planning completed before merge: HGO was sequenced ahead of Phase B because it owned `scenario_controls.js`, renderer lifecycle hooks, HGO runtime preview tests, toolbar boundary tests, and Pages dist mirrors.
- Worktree cleanup completed at the Git registration level; locked zero-byte runtime logs remain on disk.
- Border/ocean/river follow-up edits were committed as `deba2034`; the old stashes and patch backups are recovery references.
