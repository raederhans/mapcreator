# Scenario Forge P2 Renderer Frame Orchestration Context

Date: 2026-07-10

## Repository facts

- worktree path: `C:\Users\raede\.codex\worktrees\mapcreator-renderer-frame-orchestration-p2-20260710`
- base branch: `origin/main`
- base commit / clean baseline HEAD: `b14165c0e693a87872361b87ac78dc31cd7a0155`
- current task phase: pre-P2 production disclosure truth closeout after P2.0
- current worktree state at start: clean
- release residue worktree: `C:\Users\raede\.codex\worktrees\mapcreator-release-e102a70`, detached `HEAD=b14165c0e693a87872361b87ac78dc31cd7a0155`, clean
- P1 isolated worktree: removed
- P1 recovery branch: `origin/codex/renderer-runtime-context-p1-remaining-20260709@e102a70a`
- parent checkout: `C:\Users\raede\Desktop\dev\mapcreator`, `main@db8bd6c118d158aaed4dd6734ecdd981fe80f326`, `0 ahead / 16 behind origin/main`, with 43 `docs/archive/**` deletions and modified `README.zh-CN.md`, `dist/app.js`, `dist/pages-dist-manifest.json`, `landing/app.js`, `lessons learned.md`

## Approved hard invariants

- Owners stay fixed at `draw_canvas_orchestration_owner.js`, `cached_pass_compositor_owner.js`, and `transformed_frame_compositor_owner.js`.
- All owners are constructed by `map_renderer.js`.
- `RendererRuntimeContext` remains a read model.
- Clean baseline runs before production edits under one live-process owner.
- Browser/perf/focused/deterministic/selector/Pages/dist gates belong to the verification path at each functional checkpoint.

## Live-process ownership

- live-process owner: none active
- historical expected-red owner path: `/root/p2_baseline_test_fix`
- log root: `.runtime/tests/renderer-frame-orchestration-p2-20260710/`
- focused browser evidence: historical 2/5 after committed test-only repair `28bda618`, confirming a production disclosure race
- main-thread baseline: pending
- perf baseline: pending
- browser, main-thread, and perf lanes require root to assign a single live-process owner before they run

## Current phase ledger

- P2.0 docs-only truth reconciliation: complete at `6cd077bd3a732d3bebae0ba84c4dc09dbca462d4`
- Pre-P2 test-only repair: committed at `28bda618`; static checks complete; focused browser baseline refreshed at 2/5 and identified a production disclosure race
- Pre-P2 production disclosure race repair: source, E2E, contract, deterministic, static review, canonical Pages generation, dist parity, post-build boundary, and adaptive evidence are green; generated tracked files are exactly `dist/app/js/ui/sidebar.js` and `dist/pages-dist-manifest.json`; functional commit and clean-head `verify:dist-drift` / `verify:core` remain pending
- Clean baseline: waiting for green repair baseline
- P2.1 draw canvas orchestration owner: waits for green baseline
- P2.2a cached pass compositor owner: pending
- P2.2b transformed frame compositor owner: pending
- Review / UltraQA: pending
- Integration / push / cleanup: pending

## Pre-P2 baseline repair notes

- Initial main-thread collection failed because the Pages release URL was missing.
- The first retry was incorrect because `PLAYWRIGHT_TEST_BASE_URL` pointed at `/dist` for every test.
- The separated probe used `MAPCREATOR_BASE_URL=http://127.0.0.1:8892` plus `SCENARIO_FORGE_PAGES_URL=http://127.0.0.1:8892/dist/`, with no `PLAYWRIGHT_TEST_BASE_URL`, and produced four downloads.
- Remaining test drift is the hidden styled-select native control plus stale E2E schema expectation `21` while production/unit truth is `22`.
- Static repair results are complete: `node --check tests/e2e/project_save_load_roundtrip.spec.js` exit 0; `git diff --check` exit 0; `npm run verify:test:e2e-layers` exit 0 with 47 manifest specs; `npm run verify:test-import-graph` exit 0 with 51 specs.
- Adaptive dry-run artifact `.runtime/reports/generated/test-adaptive-selection.json` reports `changedFiles=4`, `recommendedCommands=7`, `mainThreadSerialVerification=1`, and `unmatchedChangedFiles=[]`.
- Committed test-only repair HEAD `28bda618` was followed by a fresh focused browser baseline of 2/5. The focused run confirmed a production disclosure race: `renderPresetTree` calls `updateScenarioInspectorLayout`, which forced global Project, Legend, and Diagnostics details closed while a scenario is active.
- Production source removed the five-line forced-close block for global Project, Legend, and Diagnostics disclosures in `updateScenarioInspectorLayout`; the `scenarioDefaultsKey` gate and `collapseScenarioManagedSections()` remain intact.
- `project_save_load_roundtrip.spec.js` now uses a real visible `#lblProjectLegend` summary click, awaits `state.renderPresetTreeFn`, reasserts open state, and uses `expect.poll` until URL `section` contains `projectLegendSection`.
- Focused Python disclosure coverage is green 1/1.
- Full UI mainline keeps the new disclosure contract green and has two existing out-of-scope HTML substring errors: project sidebar order and `transportProjectSection`.
- Deterministic evidence is green: Node syntax; state-write allowlist 115; architecture boundaries; selector schema 282; E2E layers 47; import graph 51; supervisor contracts and plan.
- Independent static review result is `APPROVE`.
- `verify:pages-dist` exited 0: total 927.16 MiB; startup shell 44/44; landing showcase 18/18; sample project 17/17.
- Generated tracked files are exactly `dist/app/js/ui/sidebar.js` and `dist/pages-dist-manifest.json`.
- Source/dist sidebar hashes both equal `6a67865bc5d199c20b7cb639c99ca12cabca1932`.
- Post-build sidebar/support boundary suite is green 19/19.
- Adaptive result is `changedFiles=8`, `recommendedCommands=61`, `mainThreadSerialVerification=53`, `unmatchedChangedFiles=0`.
- The Conductor hook prevented writing the requested Pages log file; full output remains in the sole live-owner Codex transcript.
- Functional commit, clean-head `verify:dist-drift`, and clean-head `verify:core` remain pending until the functional commit.
- Browser, main-thread, and perf baselines remain pending. There is currently no active live-process owner; root must assign one before those lanes run.
- Parent checkout WIP remains untouched.

## Notes

- P2.0 changed only active docs truth surfaces and completed at `6cd077bd3a732d3bebae0ba84c4dc09dbca462d4`.
- Selector/adaptive proof must end with `unmatchedChangedFiles=0` for the eight changed files.
- Browser, main-thread, and perf stay as later clean-head baseline evidence after the production disclosure race repair, with a root-assigned live-process owner.
- Cumulative extraction target is at least 150 lines, with P2.1 contributing at least 35 lines.

## Next action

Create the functional commit, then run clean-head `verify:dist-drift` and `verify:core`; after that, root assigns one live-process owner for browser, main-thread, and perf baselines before P2.1.
