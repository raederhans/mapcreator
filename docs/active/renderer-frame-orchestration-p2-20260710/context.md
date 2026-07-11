# Scenario Forge P2 Renderer Frame Orchestration Context

Date: 2026-07-10

## Repository facts

- worktree path: `C:\Users\raede\.codex\worktrees\mapcreator-renderer-frame-orchestration-p2-20260710`
- base branch: `origin/main`
- base commit / clean baseline HEAD: `b14165c0e693a87872361b87ac78dc31cd7a0155`
- current pre-P2 Windows perf readiness functional commit: `61e090388feb0c69887b9947b55b61968d5324de`
- current task phase: perf readiness cleanup classification and docs-only evidence closeout
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
- main-thread baseline: pending; `f5f27d3f` records post-commit browser/main-thread/perf baseline as `Not-tested`
- perf baseline: red at `61e090388feb0c69887b9947b55b61968d5324de`; readiness green, threshold acceptance blocked
- clean-head `npm run verify:core` exited 0 from existing post-commit evidence; main-thread evidence is carried from `f5f27d3f`; browser regressions, physical-layer runtime contract, scenario resilience, and any further perf investigation remain separate lanes

## Current phase ledger

- P2.0 docs-only truth reconciliation: complete at `6cd077bd3a732d3bebae0ba84c4dc09dbca462d4`
- Pre-P2 test-only repair: committed at `28bda618`; static checks complete; focused browser baseline refreshed at 2/5 and identified a production disclosure race
- Pre-P2 production disclosure race repair: committed at `f5f27d3fe3dc2a928b6de453b2883a3c766daf21`; its Lore trailer records post-commit browser/main-thread/perf baseline as `Not-tested`
- Pre-P2 Windows perf readiness fix: complete at `61e090388feb0c69887b9947b55b61968d5324de`; readiness/PID ownership is green and perf gate reached measurement
- Clean baseline: perf measurement completed and gate is red on April-baseline thresholds
- P2.1 draw canvas orchestration owner: blocked by red perf gate pending separate perf investigation or governed baseline decision
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
- Functional commit is `f5f27d3fe3dc2a928b6de453b2883a3c766daf21`; its Lore trailer records post-commit browser/main-thread/perf baseline as `Not-tested`.
- Perf gate pre-measurement readiness exposed a Windows-only launcher PID mismatch: Node saw `py.exe` as `child.pid`, while the server metadata recorded `python.exe` from `os.getpid()`.
- Minimal decision: resolve `sys.executable` once with `py -3 -c "import sys; print(sys.executable)"`, then spawn `tools/dev_server.py` with the real interpreter so strict PID/cwd/live/probe/external-reuse contracts stay unchanged.
- Focused verification is green: TDD red captured `npm run verify:perf-gate-contract` exit 1 on the missing `spawnSync`/raw `py` fallback; final `node --check tools/perf/run_baseline.mjs`, `npm run verify:perf-gate-contract`, direct `py -3 -c "import sys; print(sys.executable)"`, `git diff --check`, selector dry-run for the five changed files with `unmatchedChangedFiles=[]`, selector route check, supervisor contracts, perf probe snapshot, polyline simplification benchmark, and draw-canvas inventory all exited 0.
- Fresh clean-head `verify:core`, `verify:core:main-thread`, browser regressions, and `perf:gate` remain pending until the Windows readiness fix is committed and one live-process owner runs them serially.
- Parent checkout WIP remains untouched.

## Post-commit perf readiness classification

- Functional commit `61e090388feb0c69887b9947b55b61968d5324de` was ahead 4 from `origin/main`; the worktree was clean before this docs-only closeout.
- Clean-head `npm run verify:core` exited 0 in existing post-commit evidence. This docs-only closeout inspected existing artifacts and did not rerun core, main-thread, browser, server, Playwright, or perf commands.
- Windows readiness is green: the perf runner completed measurement and wrote `.runtime/output/perf/baseline_2026-04-20/perf-gate-current.json`; `.runtime/tests/renderer-frame-orchestration-p2-20260710/perf-readiness/post-commit/02-perf-gate.exit-code.txt` records `exit_code=1` because the threshold gate is red.
- Baseline reference is `docs/perf/baseline_2026-04-20.json` via `DEFAULT_BASELINE_JSON`; `contractMismatches` is empty; current and baseline share `win32 10.0.26200`, Node major 22, `chromium-headless`, `warmups=3`, and the same URL query.
- Threshold failures: `tno_1962.totalStartupMs` 8131.4 vs 5805.3, limit 6676.095; `hoi4_1939.totalStartupMs` 7746.8 vs 5205.7, limit 5986.555; `hoi4_1939.renderSampleMedianMs` 705.05 vs 560.9, limit 701.125, only 3.925 ms / 0.56% over the allowed limit.
- Attribution boundary: totalStartup failures are repeatable current-vs-April-baseline shifts; scenarioApplied and applyBundle are faster than baseline; the HOI render miss is close enough for short-run / machine noise to remain plausible; the functional patch only changed perf launcher/readiness and does not attribute threshold failures to renderer or scenario runtime code.
- Cleanup: before cleanup port 8000 was clear; port 8892 belonged to PID 58444 (`python.exe tools/dev_server.py --port 8892`) with matching worktree metadata; only PID 58444 was terminated; parent PID 67120 had exited; ports 8000 and 8892 were clear afterward; worktree status was clean before docs edits.
- P2.1 remains blocked by the red perf gate. Next acceptable path is a separate perf investigation or a governed baseline decision before visible-frame production edits. `test:e2e:physical-layer-runtime-contract` and `test:e2e:scenario-resilience` were not run in this round.
- Runtime classification report: `.runtime/tests/renderer-frame-orchestration-p2-20260710/perf-readiness/post-commit/cleanup-classification.md`.
## Notes

- P2.0 changed only active docs truth surfaces and completed at `6cd077bd3a732d3bebae0ba84c4dc09dbca462d4`.
- Selector/adaptive proof must end with `unmatchedChangedFiles=0` for the eight changed files.
- Fresh clean-head core/main-thread/browser/perf evidence stays as later clean-head baseline evidence after this readiness fix, with a root-assigned live-process owner.
- Cumulative extraction target is at least 150 lines, with P2.1 contributing at least 35 lines.

## Next action

Commit this docs-only evidence closeout without push. Keep P2.1 blocked until a separate perf investigation or governed baseline decision turns the perf acceptance boundary green.
