# Scenario Forge P2 Renderer Frame Orchestration Task Ledger

Date: 2026-07-10

Current status: P2.0 docs-only truth reconciliation complete at `6cd077bd3a732d3bebae0ba84c4dc09dbca462d4`; test-only repair is committed at `28bda618`; production disclosure repair is committed at `f5f27d3fe3dc2a928b6de453b2883a3c766daf21`, whose Lore trailer records post-commit browser/main-thread/perf baseline as `Not-tested`. Current work is a narrow Windows perf readiness fix for the `py.exe` / `python.exe` PID mismatch before perf measurement. Fresh clean-head `verify:core`, `verify:core:main-thread`, browser regressions, `perf:gate`, and P2.1 entry remain pending.

## P2.0 docs-only truth reconciliation

- [x] Read current registry and P1 plan/context/task.
- [x] Read the approved P2 plan title, execution topology, fixed owner topology, and stop conditions.
- [x] Update current truth surfaces for parent, release residue, P1 cleanup, and P2 startup.
- [x] Create P2 plan/context/task with fixed owner path, invariants, log root, single live-process owner, stop rules, and staged checklist.
- [x] Run stale-closeout grep on current truth files only.
- [x] Run `git diff --check`.
- [x] Run selector with `--changed-file` for all seven docs files and confirm `unmatchedChangedFiles=[]`.
- [x] Stage only the seven docs files and inspect staged diff.
- [x] Create the docs-only Lore commit `6cd077bd3a732d3bebae0ba84c4dc09dbca462d4`.

## Pre-P2 repair checklist

- [x] Record initial main-thread collection failure from missing Pages release URL.
- [x] Record the incorrect retry using `PLAYWRIGHT_TEST_BASE_URL` with `/dist` for every test.
- [x] Record the correct separated probe using `MAPCREATOR_BASE_URL=http://127.0.0.1:8892` plus `SCENARIO_FORGE_PAGES_URL=http://127.0.0.1:8892/dist/` and no `PLAYWRIGHT_TEST_BASE_URL`, producing four downloads.
- [x] Identify remaining test drift: hidden styled-select native control plus stale schema `21` versus production/unit schema `22`.
- [x] Keep scope to one E2E and existing P2 docs, with parent WIP untouched.
- [x] Record historical expected-red owner path `/root/p2_baseline_test_fix`.
- [x] `node --check tests/e2e/project_save_load_roundtrip.spec.js` exit 0.
- [x] `git diff --check` exit 0.
- [x] `npm run verify:test:e2e-layers` exit 0 with 47 manifest specs.
- [x] `npm run verify:test-import-graph` exit 0 with 51 specs.
- [x] Adaptive dry-run artifact `.runtime/reports/generated/test-adaptive-selection.json`: `changedFiles=4`, `recommendedCommands=7`, `mainThreadSerialVerification=1`, `unmatchedChangedFiles=[]`.
- [x] Create the pre-P2 repair Lore commit.
- [x] Record expected-red focused browser evidence after `28bda618`: 2/5 with Project/Legend/Diagnostics disclosures closed by `renderPresetTree -> updateScenarioInspectorLayout` under an active scenario.
- [x] Remove the production five-line forced-close block for global Project/Legend/Diagnostics disclosures in `updateScenarioInspectorLayout`, while preserving the `scenarioDefaultsKey` gate, `collapseScenarioManagedSections()`, secondary styling, selected action visibility, scenario-managed collapse behavior, and URL-sync behavior.
- [x] Update `project_save_load_roundtrip.spec.js` to open `#projectLegendSection` through a visible real `#lblProjectLegend` summary click, await `state.renderPresetTreeFn`, reassert open state, and assert URL `section` contains `projectLegendSection` with `expect.poll`.
- [x] Focused Python disclosure coverage is green 1/1.
- [x] Full UI mainline keeps the new disclosure contract green and has two existing out-of-scope HTML substring errors: project sidebar order and `transportProjectSection`.
- [x] Deterministic evidence is green: Node syntax; state-write allowlist 115; architecture boundaries; selector schema 282; E2E layers 47; import graph 51; supervisor contracts and plan.
- [x] Independent static review result is `APPROVE`.
- [x] Canonical Pages generation: `verify:pages-dist` exited 0 with total 927.16 MiB; startup shell 44/44; landing showcase 18/18; sample project 17/17.
- [x] Dist parity is green: generated tracked files are exactly `dist/app/js/ui/sidebar.js` and `dist/pages-dist-manifest.json`; source/dist sidebar hashes both equal `6a67865bc5d199c20b7cb639c99ca12cabca1932`.
- [x] Post-build sidebar/support boundary suite is green 19/19.
- [x] Adaptive result is `changedFiles=8`, `recommendedCommands=61`, `mainThreadSerialVerification=53`, `unmatchedChangedFiles=0`.
- Operational note: the Conductor hook prevented writing the requested Pages log file; full output remains in the sole live-owner Codex transcript.
- [x] Create the functional commit for the production disclosure race repair: `f5f27d3fe3dc2a928b6de453b2883a3c766daf21`.
- [ ] Record fresh clean-head `verify:core` and `verify:core:main-thread` after the Windows readiness fix is committed and one live-process owner runs them serially.
- [ ] Record browser regressions after the Windows readiness fix is committed and one live-process owner runs them serially.
- [ ] Record `perf:gate` after the Windows readiness fix is committed and one live-process owner runs it serially.
- [ ] Reach green baseline before P2.1.

## Pre-P2 Windows perf readiness fix

- [x] Confirm clean executor baseline `f5f27d3fe3dc2a928b6de453b2883a3c766daf21`.
- [x] Reproduce the contract gap with TDD: `npm run verify:perf-gate-contract` exited 1 after extending `tests/test_perf_gate_contract.py`; expected red was missing `import { spawn, spawnSync } from "node:child_process";` while runner still spawned raw `py -3 tools/dev_server.py`.
- [x] Keep strict readiness contracts unchanged: PID equality, cwd match, live process probe, external server reuse, metadata schema, cleanup API, timeout, product, renderer, and dist all stay as-is.
- [x] Minimal implementation decision: on Windows without setup-python env, run `spawnSync("py", ["-3", "-c", "import sys; print(sys.executable)"], { cwd: REPO_ROOT, encoding: "utf8", windowsHide: true })`; fail immediately on probe error, nonzero/null status, or blank stdout with `[perf-baseline]` plus truncated stderr; then spawn `tools/dev_server.py` through the resolved Python executable.
- [x] Focused green: `node --check tools/perf/run_baseline.mjs` exit 0; `npm run verify:perf-gate-contract` exit 0 with 22 tests.
- [x] Run final `git diff --check`: exit 0, with Windows LF-to-CRLF working-copy warnings only for the two edited code/test files.
- [x] Run adaptive selector dry-run for the five changed files: exit 0; `changedFiles=5`; `unmatchedChangedFiles=[]`; recommended child-safe checks plus one deferred main-thread `perf:gate`.
- [x] Run additional deterministic selector recommendations: `node tools/select_verification_targets.mjs --check` exit 0 with 282 routes; `npm run verify:supervisor-contracts` exit 0 with schemas 40 domains and Node 12/12 + 4/4; `npm run test:node:perf-probe-snapshot-behavior` exit 0 with 5/5; `npm run test:node:polyline-simplification-benchmark` exit 0 with 4/4; `npm run test:node:renderer-draw-canvas-orchestration-inventory` exit 0 with 6/6.
- [x] Leave changes unstaged and uncommitted for integration.

## Clean baseline

- [ ] Root assigns one live-process owner before any fresh clean-head core/main-thread/browser/perf baseline run.
- [ ] Run fresh clean-head `verify:core`, `verify:core:main-thread`, physical-layer regression, scenario resilience, and `perf:gate` under one live-process owner after the Windows readiness fix is committed.
- [ ] Run later browser gates for focused project save/load, existing UI mainline contract, and clean-head baseline under the sole live owner after the Windows readiness fix is committed.
- [ ] Record browser baseline.
- [ ] Record perf baseline.

## P2.1 draw canvas orchestration owner

- [ ] Start only after the green baseline is recorded.
- [ ] Extract `js/core/map_renderer/draw_canvas_orchestration_owner.js`.
- [ ] Preserve `drawCanvas()` undefined return, phase/defer double-read, and effect order.
- [ ] Reach at least 35 extracted lines.

## P2.2a cached pass compositor owner

- [ ] Extract `js/core/renderer/cached_pass_compositor_owner.js`.
- [ ] Preserve active target context, transform math, compose result schema, and wrapper shape.

## P2.2b transformed frame compositor owner

- [ ] Extract `js/core/map_renderer/transformed_frame_compositor_owner.js`.
- [ ] Preserve boolean return, HGO/dirty/reuse/order semantics, and composition-root global writes.

## Review / UltraQA / integration

- [ ] Reach cumulative extracted lines >=150.
- [ ] Run independent code review, first-principles review, and UltraQA.
- [ ] Recheck integration ancestry and overlap.
- [ ] Push verified result.
- [ ] Clean isolated worktree after recovery recording.
