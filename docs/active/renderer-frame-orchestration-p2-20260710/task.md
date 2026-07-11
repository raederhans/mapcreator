# Scenario Forge P2 Renderer Frame Orchestration Task Ledger

Date: 2026-07-10

Current status: P2.0 docs-only truth reconciliation complete at `6cd077bd3a732d3bebae0ba84c4dc09dbca462d4`; test-only repair is committed at `28bda618`; production disclosure repair is committed at `f5f27d3fe3dc2a928b6de453b2883a3c766daf21`; Windows perf readiness fix is committed at `61e090388feb0c69887b9947b55b61968d5324de`. Readiness/PID ownership is green, perf threshold gate is red, and P2.1 remains blocked pending separate perf investigation or governed baseline decision.

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
- [x] Record carried clean-head `npm run verify:core` exit 0 from existing post-commit evidence; main-thread evidence remains carried from `f5f27d3f` and was not rerun in this docs-only closeout.
- [ ] Record browser regressions after the Windows readiness fix is committed and one live-process owner runs them serially.
- [x] Record post-commit `perf:gate`: measurement completed, readiness green, exit 1 on threshold failures against `docs/perf/baseline_2026-04-20.json`.
- [ ] Reach green perf acceptance boundary before P2.1; current gate is red at `61e090388feb0c69887b9947b55b61968d5324de`.

## Pre-P2 Windows perf readiness fix

- [x] Confirm clean executor baseline `f5f27d3fe3dc2a928b6de453b2883a3c766daf21`.
- [x] Reproduce the contract gap with TDD: `npm run verify:perf-gate-contract` exited 1 after extending `tests/test_perf_gate_contract.py`; expected red was missing `import { spawn, spawnSync } from "node:child_process";` while runner still spawned raw `py -3 tools/dev_server.py`.
- [x] Keep strict readiness contracts unchanged: PID equality, cwd match, live process probe, external server reuse, metadata schema, cleanup API, timeout, product, renderer, and dist all stay as-is.
- [x] Minimal implementation decision: on Windows without setup-python env, run `spawnSync("py", ["-3", "-c", "import sys; print(sys.executable)"], { cwd: REPO_ROOT, encoding: "utf8", windowsHide: true })`; fail immediately on probe error, nonzero/null status, or blank stdout with `[perf-baseline]` plus truncated stderr; then spawn `tools/dev_server.py` through the resolved Python executable.
- [x] Focused green: `node --check tools/perf/run_baseline.mjs` exit 0; `npm run verify:perf-gate-contract` exit 0 with 22 tests.
- [x] Run final `git diff --check`: exit 0, with Windows LF-to-CRLF working-copy warnings only for the two edited code/test files.
- [x] Run adaptive selector dry-run for the five changed files: exit 0; `changedFiles=5`; `unmatchedChangedFiles=[]`; recommended child-safe checks plus one deferred main-thread `perf:gate`.
- [x] Run additional deterministic selector recommendations: `node tools/select_verification_targets.mjs --check` exit 0 with 282 routes; `npm run verify:supervisor-contracts` exit 0 with schemas 40 domains and Node 12/12 + 4/4; `npm run test:node:perf-probe-snapshot-behavior` exit 0 with 5/5; `npm run test:node:polyline-simplification-benchmark` exit 0 with 4/4; `npm run test:node:renderer-draw-canvas-orchestration-inventory` exit 0 with 6/6.
- [x] Create functional Windows perf readiness commit `61e090388feb0c69887b9947b55b61968d5324de`; branch was ahead 4 from `origin/main` and worktree was clean before this docs-only closeout.

## Docs-only perf readiness cleanup classification

- [x] Create ignored runtime report `.runtime/tests/renderer-frame-orchestration-p2-20260710/perf-readiness/post-commit/cleanup-classification.md`.
- [x] Record metric table, run dispersion, baseline dispersion, readiness result, listener cleanup, and attribution boundary.
- [x] Record that `test:e2e:physical-layer-runtime-contract` and `test:e2e:scenario-resilience` were not run in this round.
- [x] Preserve `plan.md` unchanged.
- [x] Keep P2.1 blocked by red perf gate.
## Clean baseline

- [x] Carry existing clean-head `npm run verify:core` exit 0 evidence; this docs-only closeout did not rerun live-process lanes.
- [x] Record readiness cleanup: before cleanup port 8000 was clear; port 8892 was PID 58444 `python.exe tools/dev_server.py --port 8892`; metadata matched PID/port/cwd/runtime root; only PID 58444 was terminated; parent PID 67120 had exited; ports 8000 and 8892 were clear afterward; worktree was clean before docs edits.
- [ ] Run later browser gates for focused project save/load, existing UI mainline contract, and clean-head baseline under the sole live owner.
- [ ] Record browser baseline.
- [x] Record perf threshold facts: TNO totalStartup 8131.4/5805.3 over 6676.095; HOI totalStartup 7746.8/5205.7 over 5986.555; HOI render median 705.05/560.9 over 701.125 by 3.925 ms / 0.56%.

## P2.1 draw canvas orchestration owner

- [ ] Start only after the red perf gate is resolved by separate perf investigation or governed baseline decision.
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
