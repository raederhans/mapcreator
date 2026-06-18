# Module Boundary Continuation Task

## Current Status

Phase A and Phase C are integrated and verified on main. Phase B remains deferred because it overlaps the active HGO runtime preview worktree.

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

## Recommended Next Step

Return to Phase B after the HGO overlap is resolved, abandoned, rebased, or explicitly sequenced. Phase D guardrails stay after the remaining implementation phases.

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
- Potential conflicts: green vs active HGO runtime preview files by path; HGO worktree remains based on `9139c073` and needs rebase or explicit sequencing before Phase B.

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
