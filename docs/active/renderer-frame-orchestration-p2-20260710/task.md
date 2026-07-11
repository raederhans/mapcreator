# Scenario Forge P2 Renderer Frame Orchestration Task Ledger

Date: 2026-07-10

Current status: P2.1 post-acceptance code-review hardening is in progress from integrated clean HEAD `7b3a8fb4662c62a1ba7708da92ba2aa2f82ad9e3`. The previous HEAD passed browser/main-thread 65/65; the review fix must complete deterministic/dist closeout, then a fresh acceptance owner must rerun browser/performance evidence on the new clean HEAD.

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
- [x] Record carried clean-head `npm run verify:core` exit 0 from `.runtime/tests/renderer-frame-orchestration-p2-20260710/perf-readiness/post-commit/01-verify-core.log`; main-thread evidence remains the prior `f5f27d3f` evidence and was not rerun in this docs-only closeout.
- [ ] Record browser regressions later under one assigned live-process owner.
- [x] Record post-commit `perf:gate`: measurement completed, readiness green, exit 1 in `.runtime/tests/renderer-frame-orchestration-p2-20260710/perf-readiness/post-commit/02-perf-gate.log` on threshold failures against `docs/perf/baseline_2026-04-20.json`.
- [x] P2.1 starting gate admitted under scoped governance waiver; current gate evidence stays historical at `61e090388feb0c69887b9947b55b61968d5324de`.

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
- [x] Record metric table, run dispersion, baseline reference, readiness result, listener cleanup, and attribution boundary.
- [x] Record that `test:e2e:physical-layer-runtime-contract` and `test:e2e:scenario-resilience` were not run in this round.
- [x] Preserve `plan.md` unchanged.
- [x] Record P2.1 admitted under scoped governance waiver; old red perf-gate evidence stays historical only.
## Clean baseline

- [x] Carry existing clean-head `npm run verify:core` exit 0 evidence from `.runtime/tests/renderer-frame-orchestration-p2-20260710/perf-readiness/post-commit/01-verify-core.log`; this docs-only closeout did not rerun live-process lanes.
- [x] Record readiness success: the gate launched its managed server, completed three warmups and three runs for both scenarios, wrote `.runtime/output/perf/baseline_2026-04-20/perf-gate-current.json`, and had no PID/readiness timeout.
- [x] Record readiness cleanup: the interrupted typed owner had started dedicated port 8892 server PID 58444; active_server metadata matched this worktree/runtime root; cleanup terminated only PID 58444; ports 8000 and 8892 were clear afterward; worktree was clean before docs edits.
- [ ] Run later browser gates for focused project save/load, existing UI mainline contract, and clean-head baseline under the sole live owner.
- [ ] Record browser baseline.
- [x] Record perf threshold facts: baseline `docs/perf/baseline_2026-04-20.json` with `contractMismatches=[]`; TNO totalStartup current 8131.4ms, baseline 5805.3ms, limit 6676.1ms at 1.15x, ratio 1.401, run min 8049.5, max 8185, spread 135.5ms / 1.67%; HOI4 totalStartup current 7746.8ms, baseline 5205.7ms, limit 5986.6ms at 1.15x, ratio 1.488, run min 7160.4, max 7789.5, spread 629.1ms / 8.12%; HOI4 render median current 705.05ms, baseline 560.9ms, limit 701.125ms at 1.25x, ratio 1.257, exceeds by 3.925ms / 0.56%, run min 690.4, max 715.65, spread 25.25ms / 3.58%.
- [x] Classify historical perf outcome: both startup shifts are repeatable current-vs-April failures; current evidence cannot attribute them to this launcher-only patch; HOI4 render median is borderline and environment noise can explain it; April baseline/threshold frozen.

## Contemporary A/B admission run

- [x] Read handoff `C:\Users\raede\Desktop\dev\mapcreator\.omx\handoff\perf-ab-owner-20260710.md` completely and execute as sole live-process owner.
- [x] Record preflight: P2 clean at `3c54d9298c393a3401fd7279b180eac136c9ae85`, origin/main/control commit `b14165c0e693a87872361b87ac78dc31cd7a0155`, ports 8000/8892 clear, control path absent, parent WIP preserved.
- [x] Create detached control worktree at `C:\Users\raede\.codex\worktrees\mapcreator-perf-control-b14165c-20260710` from exact SHA `b14165c0e693a87872361b87ac78dc31cd7a0155`.
- [x] Verify package-lock SHA match: `fa60a74b517568ffedd1bcdad5414e5ab3a36380ec1ea511411a267a52766385`; create ignored control `node_modules` junction to P2 `node_modules`.
- [x] Use same Node/npm/Python/Chromium identity: Node `v22.23.0`, npm `11.18.0`, Python `C:\Users\raede\AppData\Local\Programs\Python\Python312\python.exe`, Chromium `145.0.7632.6`.
- [x] Run A1 control `tno_1962,hoi4_1939` exit 0.
- [x] Run B1 P2 `tno_1962,hoi4_1939` exit 0.
- [x] Run B2 P2 `hoi4_1939,tno_1962` exit 0.
- [x] Run A2 control `hoi4_1939,tno_1962` exit 0.
- [x] Generate combined reports `.runtime/reports/generated/p2-perf-ab-20260710.json` and `.runtime/reports/generated/p2-perf-ab-20260710.md`.
- [x] Copy A-side control runtime artifacts into P2 `.runtime/output/perf/p2-ab/20260710/A/` before cleanup.
- [x] Remove only the control `node_modules` junction with non-recursive operation, then remove the detached control worktree and prune.
- [x] Confirm control path gone, P2 clean before docs edits, release residue untouched, and parent checkout WIP unchanged.
- [x] Admission result: P2.1 admitted under scoped governance waiver; readiness and workload identity pass; B/A startup and render thresholds pass; old block drift on `hoi4_1939.totalStartupMs` (`A2/A1=-7.2%`, `B2/B1=11.1%`) is historical evidence only.
- [x] Historical April baseline/threshold frozen; checked-in baseline files were not modified.
- [x] Run docs closeout validation: `git diff --check` exit 0; adaptive dry-run exit 0 with `changedFiles=3`, `recommendedCommands=5`, `mainThreadSerialVerification=0`, `unmatchedChangedFiles=[]`.

## P2 upstream integration

- [x] Run `git worktree list`, inspect every registered worktree status/HEAD/branch/base, and preserve parent WIP.
- [x] Classify overlap: green renderer implementation; yellow selector/Pages-policy surfaces; red registry, Pages startup test, and verification metadata.
- [x] Merge latest `origin/main@17aeedf5b295d08fe08965fa5d6f89b0dfb6426c` without rebasing the ten-commit P2 history.
- [x] Resolve the registry text conflict manually while retaining upstream release-audit truth and P2 acceptance truth.
- [x] Confirm auto-merged Pages startup and verification metadata retain upstream release guards plus P2 owner contracts.
- [x] Create merge Lore commit `aebb9efd492db711e24f43c39c51b4ef94f59097` with parents `a777d17b` and `17aeedf5`.
- [x] Run upstream focused Python tests: 80/80.
- [x] Run P2 owner 14/14, P53 8/8, and Python boundary 5/5.
- [x] Run metadata/core-runner/architecture/state/import/E2E-layer/selector/supervisor gates with zero failures.
- [x] Run canonical `verify:pages-dist`: startup 46/46, landing 18/18, sample 17/17, total 927.17 MiB.
- [x] Confirm renderer, draw-canvas owner, and sidebar source/dist blob parity.
- [x] Run clean merge HEAD `verify:dist-drift`: exit 0.
- [x] Run clean merge HEAD `verify:core`: 61/61, zero failures, seven skipped main-thread lanes.
- [x] Record logs under `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-upstream-integration/` and report `.runtime/reports/generated/verify-core.json`.
- [x] Mark the upstream-integrated branch `ready-for-P2.1-acceptance`; browser, main-thread, and performance stay with their separate owner.

## P2.1 draw canvas orchestration owner

- [x] P2.1 starting gate admitted: P2.1 admitted under scoped governance waiver.
- [x] Extract `js/core/map_renderer/draw_canvas_orchestration_owner.js`.
- [ ] P2.1 acceptance A/B.
- [ ] P2.2 entry A/B.
- [ ] P2 closeout A/B.
- [x] Preserve `drawCanvas()` undefined return, phase/defer double-read, and effect order.
- [x] Reach at least 35 extracted lines: baseline 23472 to current source/dist 23437, net reduction 35.
- [x] Complete focused owner, P53, Python boundary, render-pipeline, scenario chunk/refresh, metadata, core-runner, architecture, state, import, route schema 286, and supervisor checks.
- [x] Complete Pages/dist parity: startup 44/44, landing 18/18, sample 17/17, total 927.17 MiB; renderer blob `a78767ade0dd2f416fab95b02d67f007e0a9f79c`; owner blob `85eb8cc125b3438fd63805fca7c5be371e64076c`.
- [x] Create the P2.1 functional Lore commit `cc6477e0111568091a8665f76fa13d1083c67426`.
- [x] Run clean-head dist/core verification after the functional commit: `verify:dist-drift` exit 0 with log `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-1-recovery/clean-head-verify-dist-drift.log`; `verify:core` exit 0 with 61/61, report `.runtime/reports/generated/verify-core.json`, and log `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-1-recovery/clean-head-verify-core.log`.
- Acceptance ownership: browser, Playwright, main-thread, and performance lanes belong to the separate acceptance owner.

## P2.1 post-acceptance review fix

- [x] Read fresh render phase after transformed-cache and last-good fallback effects before previous-pixel continuity.
- [x] Make frame summaries explicit opt-in and keep the production no-options path free of summary serialization/timing copies.
- [x] Lock original mutable commit timings versus independent frozen summary timings.
- [x] Replace P53 working-tree diff evidence with direct public-facade and state-write semantic assertions.
- [x] Generate canonical Pages dist mirrors and manifest; source/dist owner and main-renderer blobs match.
- [ ] Run focused/shared deterministic gates, selector, Pages/dist parity, and clean-head full `verify:core`.
- [ ] Commit the review fix with Lore trailers.
- [ ] Hand the new clean HEAD to browser/performance acceptance.

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
## Current admission note

State: P2.1 admitted under scoped governance waiver.

Governance basis: primary contemporary A/B readiness PASS, workload/runner identity PASS, B/A startup thresholds PASS, B/A render thresholds PASS. HOI4 promotion short-path A/B counts 3/3 and long-path A/B counts 6/6, all stratified deltas inside declared deadband. Old block-drift data is preserved as historical evidence only. April baseline/threshold frozen. Control SHA: `b14165c0e693a87872361b87ac78dc31cd7a0155`. P2 starting HEAD: `1c58d5dbe1a42794074beb792b64b5e8ab26e153`.

Waiver scope: authorizes P2.1 implementation entry only.

- [x] P2.1 starting gate admitted: P2.1 admitted under scoped governance waiver.
- [x] P2.1 implementation extraction and deterministic behavior preservation.
- [ ] P2.1 acceptance A/B.
- [ ] P2.2 entry A/B.
- [ ] P2 closeout A/B.

Cleanup: runner restored; junction removed; control worktree removed/pruned; ports 8000/8892 clear; task-owned runner/server/Chromium 0; parent/release untouched; artifact `.runtime/tmp/p2-supplement-control-cleanup.json`.

Deterministic completion note: owner 14/14, P53 8/8, Python boundary 5/5, render-pipeline 5/5, scenario chunk 57/57, scenario refresh 36/36, metadata 14/14, core-runner 8/8, architecture/state/import/route schema 286/supervisor, and `verify:pages-dist` passed. Functional commit `cc6477e0111568091a8665f76fa13d1083c67426` is committed; clean-head `verify:dist-drift` exited 0 and clean-head `verify:core` exited 0 with 61/61. `origin/main@17aeedf` moved one commit; preserve this clean worktree without rebase because direct red overlaps exist in the registry, Pages startup test, and verification domains metadata.
