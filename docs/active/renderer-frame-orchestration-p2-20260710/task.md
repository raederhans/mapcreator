# Scenario Forge P2 Renderer Frame Orchestration Task Ledger

Date: 2026-07-10

Current status: P2.2b implementation is committed at `9479e9e6`. Deterministic, Pages, browser matrix, and `perf:gate` acceptance are green. Rerun08 is explicitly authorized under `p2-williams-rerun08-harness-recovery-v1`; the tracked power helper self-test and complete live lifecycle preflight are green. Root owns the sole live lane. The rerun08 dry plan and execute remain unused, and main integration stays closed until `accepted / exit 0`.

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
- [x] Record browser regressions under one assigned live-process owner: main-thread 65/65, physical-layer runtime 1/1, scenario resilience 3/3.
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
- [x] Run browser gates under the sole live owner through `verify:core:main-thread`, physical-layer runtime, and scenario resilience.
- [x] Record browser baseline and cleanup artifacts.
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
- [x] P2.1 acceptance A/B completed with `failed/blocked` decision on TNO render `+147.65ms / +22.10%`.
- [x] P2.2 entry admitted through deterministic governed reanalysis of the complete frozen A/B evidence.
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
- [x] Run focused/shared deterministic gates, selector, Pages/dist parity, and clean-head full `verify:core` 61/61.
- [x] Commit the review fix with Lore trailers at `3efc43206d04616b82be576eb75ae105fc01dd05`.
- [x] Hand the new clean HEAD to browser acceptance; main-thread 65/65 and physical-layer runtime 1/1 passed on the same product runtime tree.
- [x] Repair the retired view-mode test-contract drift and pass scenario resilience 3/3 at test-contract commit `427e68398a67586ef4a330b5304dfde567da917e`.
- [x] Verify scenario-resilience selector routing: one changed file, two recommended commands, one main-thread lane, zero unmatched files.
- [x] Stop server PID 18364, remove matching stale metadata, and verify ports 8000/8892 clear.
- [x] Preserve the original legacy-metric A/B decision: all blocks valid, pooled TNO mixed-role render failed, and P2.2 was provisionally blocked before governed reanalysis.

## P2.2a cached pass compositor owner

- [x] Extract `js/core/renderer/cached_pass_compositor_owner.js`.
- [x] Preserve dynamic active target context, transform math, compose result schema, require-all preflight priority, export wrapper shape, and composition-root diagnostics writes.
- [x] Reduce `js/core/map_renderer.js` from 23,437 to 23,376 split lines, net reduction 61; keep the owner at 170 split lines.
- [x] Add named Node behavior and combined Python boundary suites; upgrade P53, scenario, Pages, architecture, metadata, and core-runner contracts.
- [x] Complete pre-commit Pages generation at 927.17 MiB with startup 47/47, landing 18/18, sample 17/17 and source/dist blob parity.
- [x] Create functional Lore commit `2f4ed71d8455bc16ad87ff361ac3f106360aa8c0`; clean-head `verify:dist-drift` exits 0 and `verify:core` passes 64/64 with seven explicit main-thread skips.
- [x] Record selector evidence: 19 changed files, 195 recommended commands, 7 main-thread lanes, and 0 unmatched files.
- [x] Record exact source/dist parity: renderer `9467d79806d1f418c89527ac6b1a560ff11a27c1`; cached compositor `bc84b5c34f060282b573b333ba14344e59483f73`.
- [x] Complete separate browser/main-thread/performance acceptance under the registered governed protocol; record the fail-closed P2.2a decision.

### P2.2a static-review fixes

- [x] Replace per-pass cache getters with one normalized `getRenderPassCacheSnapshot()` call per owner public method.
- [x] Prove snapshot call count `1` for transformed draw, non-required multi-pass compose, and require-all multi-pass compose.
- [x] Forward the original compose `options` object from `map_renderer.js`; parameter-destructure `{ requireAllPasses = false } = {}` inside the owner.
- [x] Restore DPR evaluation to the original draw site for transformed and direct cached composition.
- [x] Upgrade owner, P53, Python boundary, and architecture contracts to reject the retired per-pass wiring.
- [x] Create review-fix Lore commit `aa34b8b43ad52590f4c5fc553ff4b13d74fceab4`; keep `map_renderer.js` at 23,376 split lines and the hardened owner at 176 split lines.
- [x] Pass clean P51 26/26, P52 15/15, draw-owner and cached-owner suites, Pages startup 47/47, landing 18/18, sample 17/17, clean `verify:dist-drift`, and full `verify:core` 64/64.
- [x] Record review-fix selector evidence: 9 changed files, 27 recommended commands, 1 main-thread lane, and 0 unmatched files.
- [x] Record evidence-doc selector coverage: 4 changed files, 9 recommended commands, 0 main-thread lanes, and 0 unmatched files.
- [x] Record post-fix source/dist parity: renderer `b2df02b5be80702b6c50cd3bc572a100302e8f4b`; cached compositor `134a295605cd7081177f9af0ac5648c82c07be6b`.

### P2.2a final contract microfix

- [x] Restore compose parameter destructuring so `null` options throws `TypeError` before function-body effects.
- [x] Prove the cache snapshot getter remains uncalled on `null` options.
- [x] Prove getter-backed `requireAllPasses` evaluates exactly once before cache snapshot capture.
- [x] Preserve the existing one-snapshot-per-method and DPR draw-site order contracts.
- [x] Create functional Lore commit `76977207`; keep the root wrapper forwarding the exact options object.
- [x] Pass owner 13/13, P53 11/11, Python boundary 4/4, architecture, Pages 47/47 + 18/18 + 17/17, source/dist parity, clean `verify:dist-drift`, and clean `verify:core` 64/64.
- [x] Record functional selector evidence: 7 changed files, 13 recommended commands, 1 main-thread lane, and 0 unmatched files.
- [x] Record final evidence-doc selector coverage: 4 changed files, 9 recommended commands, 0 main-thread lanes, and 0 unmatched files.

## P2.2b transformed frame compositor owner

- [ ] Entry gate: obtain a separately approved governed acceptance result after the P2.2a `blocked` decision.
- [x] Extract `js/core/map_renderer/transformed_frame_compositor_owner.js`.

## P2.2a Williams crossover rerun prerequisite

- [x] Preserve the first JSON/Markdown/raw manifest and exact SHA256 evidence.
- [x] Classify the first report `invalid-environment-regime` for phase admission while retaining its original blocked decision.
- [x] Freeze the eight-block Williams sequence and four adjacent `B-A` pairs.
- [x] Freeze same-side/order drift pairs `A TH 1/6`, `A HT 4/7`, `B TH 2/5`, and `B HT 3/8`.
- [x] Freeze one warmup plus two measured runs, block medians, and the median of four pair deltas.
- [x] Freeze practical thresholds, symmetric direction veto, internal outliers, and 1/2/3+ pair-regression adjudication.
- [x] Require five one-second Windows telemetry samples before and after every block with structured tri-state capability handling.
- [x] Require exact detached clean worktrees, git blob/LF-normalized artifact identity, exact 32 raw files, evidence manifest, and cleanup evidence.
- [x] Add import-safe `--list`, `--plan`, `--dry-run`, `--analyze`, and explicit `--execute` CLI modes.
- [x] Add named child-safe policy/raw-analyzer tests and main-thread/heavy verification routing without adding perf to `verify:core`.
- [x] Harden telemetry admission with frozen CPU/frequency/memory/power thresholds, strict phase/time order, structured TCP/direct probes, and accurate performance-adjusted-frequency naming.
- [x] Bind full preregistration, canonical-role recomputation, workload identity, exact manifest/tool identity, task-owned process-tree cleanup, typed exits, and raw/report no-clobber behavior.
- [x] Keep docs/tests on the child-safe governance route; limit the heavy live route to execution/analyzer semantics and tracked workload inputs. Analyze writes `.runtime` under one owner.
- [x] Assign one live owner and start rerun01 from exact detached worktrees and a fresh raw root.
- [ ] Complete the full pre-registered sequence; rerun01 stopped in block-01 before the baseline runner started because the required Windows process-start watcher lacked permission.
- [ ] Accept P2.2a only when the raw analyzer returns `accepted` / exit `0`; keep P2.2b blocked for exit `2`, `3`, or `1`.
- [x] Preserve boolean return, HGO/dirty/reuse/order semantics, and composition-root global writes.

## P2.2a Williams rerun01 outcome 2026-07-11/12

- [x] Run mandatory clean-candidate `npm run verify:core` at `f53a44f483403edbd7286db226380f0f0e4664be`; exit `0`.
- [x] Validate `--plan` at control `ab86b1e24d161edbe6bcc80acb0b316e4bf81942` and candidate `f53a44f4`; fixed eight-block order, one warmup plus two measured runs, 32 raw files, and frozen thresholds match the preregistration.
- [x] Start the single governed `--execute` once. Block-01 watcher setup failed with `Register-CimIndicationEvent` permission denied / `HRESULT 0x80041003`; `runnerPid=null`, baseline never started, and measured raw count is `0`.
- [x] Preserve the fail-closed block result (`status=invalid`, block exit `3`, `cleanupValid=false`) and the outer harness fault (`exit=1`).
- [x] Record the secondary analyzer fault: incomplete telemetry produced `summary=null`, then cross-window ordering read `post.summary.firstAtMs` and prevented a typed invalid report.
- [x] Add TDD regression coverage in the existing Williams governance suite: focused RED reproduces the exact TypeError; minimal GREEN returns `invalid-experiment`, exit `3`, and `block-01.telemetry.post.missing` without inventing telemetry values.
- [x] Preserve raw root `.runtime/output/perf/p2-2a-williams-live-20260711-rerun01/experiment-20260712T010243Z-raw`; raw manifest SHA256 `65ab4e89a77d40f4a7e8c1361d69be21ca9df5db625ce6f924b1037bf9667727`; cleanup evidence SHA256 `b20617025622387118537543ff474f0ac53c3d90a410a637d0c78f898f14beb9`.
- [x] Complete cleanup: task processes `0`, ports 8000/8892 clear, both temporary junctions/worktrees removed, candidate clean/stable, and parent status exactly matches the preflight baseline.
- [x] Complete static validation: focused GREEN 1/1, Williams governance 27/27, verification metadata 16/16, core runner 8/8, perf-gate contract 23/23, render-role policy 17/17, selector schema 295, supervisor contracts/routing 12/12 + 4/4, syntax, and diff check all pass.
- [x] Run SF-ATS dry-run: 5 changed files, 14 recommended commands, 12 child-safe suggestions, 2 main-thread perf lanes, and 0 unmatched files; live perf lanes remain intentionally unrun.
- [x] Keep P2.2b blocked. Rerun01 remains immutable and is not selectively resumed; the later Job Object containment section records the replacement capability path for a new fresh evidence root.

## Windows Job Object containment repair 2026-07-12

- [x] Reproduce the WMI provider limitation under the normal-user lane and retain rerun01 as immutable failed capability evidence.
- [x] Add protocol RED coverage for exact empty/spaced/quoted/trailing-backslash argv and for removal of watcher/polling/taskkill measurement paths.
- [x] Add tracked `tools/perf/williams_crossover_windows_job_runner.cs` with `CREATE_SUSPENDED | CREATE_NO_WINDOW`, assign-before-resume, nested Job, kill-on-close, disabled breakaway, and restricted inherited handles.
- [x] Make cleanup fail closed on Job close failure, root termination uncertainty, surviving descendants, and unverified PIDs; terminate and wait for an unassigned suspended root.
- [x] Compile once before pre telemetry, run a short capability probe, reuse one compiled binary across blocks, and clean the temporary binary after execution.
- [x] Replace `runLoggedCommand()` containment with `runWindowsJobCommand()` while keeping pre/post environment snapshots outside measurement.
- [x] Bind tracked source and compiled binary identity in preregistration, block identity, raw manifest, and cross-block validation.
- [x] Require per-block Job evidence in cleanup policy and preserve typed invalid exit `3` for compile/readiness/capability failures.
- [x] Pass the final Job package `10/10`, Williams governance `29/29`, verification metadata `16/16`, core runner `8/8`, perf-gate contract `23/23`, render-role policy `17/17`, five compile/integration attempts with zero compile failures, and detached-child Windows integration.
- [x] Close evidence-chain TDD: RED `30/33` proves missing/tampered raw EXE, ignored preparation/direct Job evidence, and missing runtime schema/transport contracts; GREEN `33/33` plus the expanded suites bind the immutable raw PE and semantic evidence. One new preparation test initially exposed a shared fixture reference, then passed after fixture isolation; no focused test reached the three-failure stop rule.
- [x] Complete current-snapshot independent P/Invoke and evidence-chain re-reviews. Both return `APPROVE / CLEAR`; the earlier `2 HIGH + 1 MEDIUM` verdict is a preserved pre-fix snapshot.
- [x] Run selector/import/supervisor/core-list/diff static closeout: `16 changed / 197 recommended / 7 main-thread / 0 unmatched`, import graph `51`, route schema `297`, supervisor `12 + 4 + 15`, core list `66`, architecture/state-write, and diff check all pass.
- [x] Hand off the uncommitted ready-for-integration package to the integration owner; commit/push remain integration-owner operations.
- [x] Run one fresh governed Williams experiment under a separately assigned live owner at candidate `6a2fad24`; terminal result `invalid-experiment` / exit `3`, so P2.2b remains closed.

## P2.2a Williams rerun02 outcome 2026-07-12

- [x] Run mandatory clean-head `npm run verify:core` at candidate `6a2fad24`; 66/66 commands passed.
- [x] Create exact detached clean candidate/control worktrees at `6a2fad24` and `ab86b1e2`; confirm matching package-lock Git blob `df70020f2f930d5692a1ff9febebf86dbb0e0db1`.
- [x] Run dry plan once; exit `0`, eight blocks, four adjacent pairs, and 32 expected measured raw files.
- [x] Run exactly one governed `--execute`; no retry.
- [x] Complete block-01 control/TH baseline with runner exit `0`, valid quiet window, 4 measured raw files, and valid Job Object cleanup.
- [x] Preserve fail-closed invalidation from external Edge extension renderer PIDs `99504` and `106292`, children of pre-existing Edge PID `32132` that appeared only in the post snapshot.
- [x] Preserve the additional telemetry invalidators `block-01.telemetry.pre.samples.interval` and `block-01.telemetry.post.samples.interval`; rounded intervals were pre `[1666, 1628, 1655, 1618]ms` and post `[1628, 1635, 1617, 1631]ms` against the 1000±250ms contract.
- [x] Record block `cleanupValid=false`, harness decision `invalid-experiment`, exit `3`, and stop before block-02.
- [x] Preserve immutable hashes: raw manifest `d9f4c89f...74b60`, analysis JSON `0c6c229b...e799`, analysis Markdown `f3a41608...b31e`, execute log `3920a243...757d`, cleanup `36a6a103...191`, and Job evidence `f0a99b36...586`.
- [x] Remove both temporary junctions/worktrees, prune registrations, verify ports 8000/8892 clear, and verify zero rerun02 task processes.
- [x] Preserve parent `main@db8bd6c` without P2 writes. `cleanup-final.json` captured 48 entries at experiment cleanup; a later read-only snapshot contains 57 entries from unrelated parent work.
- [x] Keep P2.2b blocked; rerun02 supplies no four-pair performance verdict and no acceptance/regression conclusion.

## Williams telemetry-v2 repair and rerun03 prerequisite 2026-07-12

- [x] Preserve rerun02 byte-for-byte and classify its old 1.63s capture-start intervals as a fixed-delay collector defect.
- [x] Rotate the policy ID to `p2-williams-crossover-v2` and telemetry window schema to 2.
- [x] Schedule five samples against monotonic absolute targets and timestamp each actual capture start before both CIM queries.
- [x] Record `completedAt`, `captureDurationMs`, and `scheduleLagMs`; keep interval admission at 1000 +/- 250ms and lag diagnostic-only.
- [x] Keep Windows Job Object containment authoritative for task-owned cleanup; retain ambient browser PID churn as diagnostic evidence.
- [x] Add TDD coverage for policy/schema rotation, cadence validation, valid and invalid quiet-window admission, source scheduling formulas, ambient PID diagnostics, and Job cleanup failure.
- [x] Separate the real WMI cadence probe from default `verify:core` through named main-thread route `test:node:williams-crossover-telemetry-live`.
- [x] Pass focused/static validation at functional commit `89dfe15e`: governance 32/32; default Job runner 10 pass + 1 skip; explicit live telemetry 2/2; metadata 16/16; core runner 8/8; perf gate 23/23; render role 17/17; route schema 299; architecture/state/import/supervisor gates; adaptive 9/198/8/0.
- [x] Complete independent code, architecture, and test-contract review; current verdicts CLEAR / APPROVE with interval-gate and ambient-environment WATCH notes documented.
- [x] Run clean-head full `verify:core` at evidence checkpoint `2e05d5a8e7beae2c2200f6d4f3ffdc19e8df16a9`; 66/66 commands passed with zero failures. Log: `.runtime/tests/renderer-frame-orchestration-p2-20260710/williams-telemetry-v2/01-clean-head-verify-core.log`.
- [x] Create exact detached candidate/control worktrees with matching lock identity and a fresh rerun03 raw/report root.
- [x] Run one dry plan and exactly one governed `--execute`; no automatic retry.
- [x] Record rerun03 as terminal `invalid-experiment / exit 3` after block-02 candidate pre-telemetry failed `telemetry.samples.interval`; preserve all artifacts and hashes.
- [x] Record rerun03 as terminal `invalid-experiment / exit 3`; it did not admit P2.2b, and rerun04 now owns the next acceptance decision.

## Williams telemetry-v3 repair and rerun04 prerequisite 2026-07-12

- [x] Preserve rerun03 byte-for-byte and identify the direct failure chain: first governed CIM capture `3617.4604ms`, then fixed-rate catch-up intervals `[3621,629,637,654]ms` and schedule lag up to `2652.9ms`.
- [x] Complete three independent static root-cause/test/architecture analyses; all approve one fixed same-counter priming capture before the sampling stopwatch with explicit excluded-warmup evidence.
- [x] Rotate the policy ID to `p2-williams-crossover-v3` and telemetry window schema to 3.
- [x] Add exactly one priming capture per pre/post window, reuse the same validated counter reader, record priming timing/status/duration, and keep five governed samples.
- [x] Keep capture-start interval admission at 1000 +/- 250ms and add measured `captureDurationMs <= 1250` plus `abs(scheduleLagMs) <= 250` admission.
- [x] Add deterministic regressions for missing/invalid priming, long excluded prime, measured cold spike, final-sample capture duration, final-sample schedule lag, source order, and one-reader reuse.
- [x] Extend the explicit Windows live lane to two successive fresh windows; root-owned run passed 2/2 in 18.903 seconds.
- [x] Complete focused/shared checks and three independent final implementation reviews; architecture and code reviews are CLEAR, and the evidence review is CLEAR after correcting the historical telemetry-v2 lane wording and rerun03 terminal task record.
- [x] Commit the telemetry-v3 functional checkpoint at `26b1115cc3fe1e66200661e195a4c5abbf4d4c05` and run clean-head `npm run verify:core`; 66/66 commands passed with exit 0.
- [x] Remove and prune terminal rerun03 detached worktrees after verifying their clean status, commit identities, junction targets, and immutable evidence root.
- [x] Create fresh exact detached candidate/control worktrees with matching lock identity, shared dependency junctions, and a reserved unique rerun04 evidence root; both sides are clean and the transient control initialization lock cleared normally.
- [x] Run exactly one governed rerun04 `--execute` with no automatic retry; all eight blocks, 32 measured raw files, 115 manifest entries, and eight valid Job cleanup records completed before the analyzer returned terminal `invalid-experiment / exit 3`.
- [ ] Permit main integration and P2 closeout only after a fresh complete Williams experiment returns `accepted / exit 0`; rerun04 remains terminal invalid evidence and cannot satisfy this gate.

## P2.2b-G conditional isolated implementation entry 2026-07-12

- [x] Preserve rerun04 as canonical terminal evidence with zero retry and no selective block/sample exclusion or post-hoc threshold change.
- [x] Record canonical hashes for execute, analysis, raw manifest, preregistration, dry plan, pre-execute snapshot, and final cleanup index.
- [x] Remove both clean detached rerun04 worktrees and their verified dependency junctions; prune worktree metadata; confirm zero task process and clear ports 8000/8892.
- [x] Complete three independent read-only reviews: evidence integrity `BLOCK` for performance admission, statistics/governance `BLOCK` for inference, and architecture `APPROVE` for reversible isolated implementation only.
- [x] Implement only `composeTransformedFrameToBuffer` and `drawTransformedFrameFromCaches` in the canonical transformed-frame compositor owner, retaining all composition-root writes/effects and existing public/context/state boundaries.
- [ ] Run focused, shared, Pages/dist, browser, and review gates on the isolated implementation.
- [ ] Run a fresh post-change Williams experiment under a new preregistration/evidence root; only `accepted / exit 0` permits main integration and P2 closeout.

## P2.2a exact-head acceptance 2026-07-11

- [x] Run `verify:core:main-thread` on exact candidate `8eda8c5c`: 68 commands, smoke 4/4, scenario concurrency 1/1, project save/load 5/5, interaction funnel 3/3.
- [x] Run exact physical-layer runtime 1/1 and scenario resilience 3/3 on the same dedicated port-8892 server.
- [x] Clean the browser lane: ports 8000/8892 clear, active-server metadata removed, zero task-owned Chromium.
- [x] Run governed `A1 -> B1 -> B2 -> A2` against control `ab86b1e2`; every block uses TNO then HOI4, three warmups, five measured runs, matching runner/policy/lock/environment/query/workload identity.
- [x] Validate 40/40 canonical role matches, zero mismatches, four block exits 0, and 40 raw SHA256 entries.
- [x] Record pooled TNO startup/canonical PASS at -1.91%/-2.73%.
- [x] Record pooled HOI4 startup FAIL at +583.35ms/+8.85% and canonical FAIL at +78.55ms/+9.76%.
- [x] Record block-drift FAIL for both scenarios and opposite-direction FAIL for HOI4; outlier rules PASS.
- [x] Keep legacy render medians diagnostic: TNO -0.92%; HOI4 +8.11%.
- [x] Generate `.runtime/reports/generated/p2-2a-performance-ab-20260711.{json,md}` and the 40-file raw hash manifest.
- [x] Remove the temporary control worktree/junction after restoring original control tooling; preserve parent WIP.
- [x] Mark P2.2b blocked by P2.2a acceptance.

## Review / UltraQA / integration

## Williams rerun05 and role-policy v2 repair 2026-07-12

- [x] Preserve rerun05 as terminal `invalid-experiment / exit 3` evidence with exactly one dry plan, one execute, and zero retry.
- [x] Record the direct failure: the valid TNO lifecycle emitted three contiguous samples and the frozen v1 policy hardcoded exactly two.
- [x] Keep the rerun05 performance verdict empty; candidate produced zero measurements.
- [x] Implement `render-sample-role-v2`: declared/actual count equality, at least two samples, contiguous `1..N`, unique final canonical sample, and every earlier sample recorded before chunk promotion.
- [x] Rotate Williams governance to `p2-williams-crossover-v4` and reject stale v1/v3 evidence.
- [x] Preserve the historical governed companion through a v2 report ID/output path while retaining the earlier v1 files.
- [x] Complete focused TDD and reviews: render-role 23/23, Williams governance 34/34, Python perf contract 23/23; independent code and governance reviews CLEAR.
- [x] Commit the candidate v2/v4 checkpoint and pass clean-head deterministic gates at `9479e9e6`.
- [x] Create a one-file control overlay with matching lock, baseline-runner, and role-policy blobs at `bd98c580`.
- [x] Remove terminal rerun05 and rerun06 detached measurement worktrees after verifying exact HEADs, clean status, dependency junction targets, and immutable evidence roots.
- [x] Run one fresh rerun06 dry plan and exactly one execute under a unique evidence root with zero retry.
- [x] Apply the final rerun07 terminal mapping: `exit 1 / harness fault`; performance acceptance stopped and main integration remains closed.

## Williams rerun06 terminal outcome and rerun07 final authorization 2026-07-12

- [x] Preserve rerun06 as immutable terminal `invalid-experiment / exit 3`.
- [x] Record 8/8 blocks, 32/32 measured raw files, 115/115 manifest entries,
      valid Job cleanup, one dry plan, one execute, and zero retry.
- [x] Record all five preregistered invalid reasons and keep the four primary
      estimates diagnostic-only.
- [x] Complete independent evidence, calculation, and governance reviews.
- [x] Approve exactly one final rerun07 under
      `p2-williams-rerun07-final-repeat-v1`.
- [x] Create fresh exact detached rerun07 worktrees and a unique evidence root; both measurement worktrees were later removed after identity, status, and junction checks.
- [x] Record original Balanced GUID and request one temporary standard High performance scheme. Windows returned GUID `5b998c51-6f90-428d-870c-cb8d8d279b05`, while the immediate scheme list exposed zero new entries and triggered the pre-execute harness fault. Activation, AC admission, and the fixed quiet interval were never reached.
- [x] Run the sole rerun07 dry plan. Execute count is `0`, retry count is `0`, and no execute log, preregistration, raw root, or analysis report exists.
- [x] Restore original Balanced GUID `381b4222-f694-41f0-9685-ff5bb260df2e`, delete the returned temporary GUID, and verify `cleanup.valid=true` with no errors.
- [x] Apply the terminal exit mapping and stop all further Williams repetitions.
- [x] Record the terminal result: P2 implementation remains verified; performance acceptance is unresolved; main integration, completion, and archival stay closed.

Terminal evidence:

- candidate `9479e9e6ff8d4b2fa8ba969fdc7b7e2f341d2d40`; control `bd98c5800ac5cca2a93d7f55ac1b0a254ca5028f`; governance `233ff550157de0a5e0e3b09ea6ff00c6bd0fa8c0`
- plan log SHA256 `43d9151f25717b609686621535aebcdf28a26872b107990f99856aec545dacd0`
- operator finalization SHA256 `55f9810ac2a5456b9a87aadc9df343a472852237e7430542c2731098c0ae8d6f`
- failure `expected exactly one temporary power scheme; found 0`
- cleanup: original Balanced active; temporary GUID absent; both detached measurement worktrees and dependency junctions removed and pruned

- [x] Reach cumulative extracted lines >=150: the current `origin/main` baseline and architecture counting move `map_renderer.js` from 23,473 to 23,269 lines, a cumulative reduction of 204 lines.
- [x] Run independent code review, first-principles review, and UltraQA: code `APPROVE`, architecture implementation `CLEAR`, evidence implementation `APPROVE`, formal integration `BLOCK` under rerun07 governance.
- [x] Recheck integration ancestry and overlap: `origin/main@17aeedf5` is an ancestor of terminal-truth checkpoint `72ccbc3a`; checkpoint state is `0 behind / 47 ahead`; renderer/metadata/docs remain red-overlap surfaces for future integration.
- [x] Push verified recovery result: `origin/codex/renderer-frame-orchestration-p2-20260710@d508e00698cec84b707b589ec0163a07014ebf61`.
- [ ] Clean isolated worktree after recovery recording.

Final recovery-branch gate evidence:

- [x] Clean-head `verify:pages-dist -> verify:dist-drift -> verify:core` exited `0` at `72ccbc3a`.
- [x] `verify:core` recorded 67/67 exit-zero results; report SHA256 `70947a928c08fa6f0735b321ef2cfcd5f7cf23cfe25bc973b161fdcb5b661f2b`.
- [x] Combined clean-head stdout SHA256 `bb853b56e460c574a1f28fff713f921f33852fae9a16153b73fea6d9d73310dd`; post-run P2 worktree tracked-clean.
- [x] Preserve browser supersession truth: the matrix summary retains the first city failure; `p2-2b-city-rendering-final.stdout.log` is authoritative at 8/8.
- [x] Preserve exact perf evidence strength: the final log reports PASS and hashes to `98796574bd75ed3647cd4d42d7da654556031769bd4e4f626917d4cb1908507e`; no standalone exit-code artifact exists.
- [x] Keep the P2 worktree and active docs because formal integration and archival remain blocked.
## Current admission note

State: P2.1 admitted under scoped governance waiver.

Governance basis: primary contemporary A/B readiness PASS, workload/runner identity PASS, B/A startup thresholds PASS, B/A render thresholds PASS. HOI4 promotion short-path A/B counts 3/3 and long-path A/B counts 6/6, all stratified deltas inside declared deadband. Old block-drift data is preserved as historical evidence only. April baseline/threshold frozen. Control SHA: `b14165c0e693a87872361b87ac78dc31cd7a0155`. P2 starting HEAD: `1c58d5dbe1a42794074beb792b64b5e8ab26e153`.

Waiver scope: authorizes P2.1 implementation entry only.

- [x] P2.1 starting gate admitted: P2.1 admitted under scoped governance waiver.
- [x] P2.1 implementation extraction and deterministic behavior preservation.
- [x] P2.1 acceptance A/B completed; report decision `failed/blocked`.
- [ ] P2.2 entry A/B.
- [ ] P2 closeout A/B.

Cleanup: runner restored; junction removed; control worktree removed/pruned; ports 8000/8892 clear; task-owned runner/server/Chromium 0; parent/release untouched; artifact `.runtime/tmp/p2-supplement-control-cleanup.json`.

Deterministic completion note: owner 14/14, P53 8/8, Python boundary 5/5, render-pipeline 5/5, scenario chunk 57/57, scenario refresh 36/36, metadata 14/14, core-runner 8/8, architecture/state/import/route schema 286/supervisor, and `verify:pages-dist` passed. Functional commit `cc6477e0111568091a8665f76fa13d1083c67426` is committed; clean-head `verify:dist-drift` exited 0 and clean-head `verify:core` exited 0 with 61/61. `origin/main@17aeedf` moved one commit; preserve this clean worktree without rebase because direct red overlaps exist in the registry, Pages startup test, and verification domains metadata.

## P2.1 final acceptance checklist 2026-07-11

- [x] `verify:core:main-thread` passed 65/65.
- [x] `test:e2e:physical-layer-runtime-contract` passed 1/1.
- [x] `test:e2e:scenario-resilience` passed 3/3 after test-contract commit `427e68398a67586ef4a330b5304dfde567da917e`.
- [x] Run exact `A1 -> B1 -> B2 -> A2` with fixed scenario order, three warmups, five measured runs per scenario/block, and 10 pooled samples per side/scenario.
- [x] Confirm all blocks exited 0, matched HEAD, passed first quiet window, retained clear ports, and left zero task-owned Chromium.
- [x] Confirm runner, package lock, environment, URL query, scenario order, and workload identity match.
- [x] Confirm pooled startup PASS for TNO and HOI4.
- [x] Confirm pooled HOI4 render PASS.
- [x] Record pooled TNO render FAIL: control `668.10ms`, candidate `815.75ms`, `+147.65ms / +22.10%`.
- [x] Confirm outlier rules and opposite-direction veto PASS.
- [x] Record HOI4 promotion gap/long-stratum result as ancillary inconclusive; long-rate difference remains within limit.
- [x] Preserve the April historical baseline and thresholds.
- [x] Generate `.runtime/reports/generated/p2-1-performance-ab-20260711.{json,md}`.
- [x] Restore runner, remove junction/control worktree, prune registrations, verify clear ports and zero task processes, and preserve parent WIP.
- [x] Preserve the original legacy report and its `failed/blocked` decision unchanged.
- [x] Explain the apparent TNO regression as legacy median role mixing: TNO first-sample composition A blank/scenario `6/4`, B `3/7`.
- [x] Validate all 40 canonical samples against `last-post-promotion-idle-scenario-frame-v1` with zero mismatches.
- [x] Generate `.runtime/reports/generated/p2-1-performance-ab-governed-20260711.{json,md}` without modifying the original report or raw evidence.
- [x] Admit P2.2a from canonical medians: TNO A/B `1197.90/1195.35ms`; HOI4 A/B `694.55/694.80ms`; startup, block drift, outlier, direction, identity, and quiet-window checks pass.
- [x] Record the historical P2.2a/P2.2b preregistration with A1/B1/B2/A2, three warmups, five measured runs, startup `3% + 75ms`, render `5% + 35ms`, and block drift `5%/10%`; the Williams prerequisite section governs the replacement rerun.
- [x] Commit the reusable governed role tooling in Lore commit `14878c78937f36f9ddee53a876521494a2214cbb`.
- [x] Run clean-head `verify:dist-drift` and full `verify:core` 62/62 from the governed tooling commit.
- [x] Re-run the offline analyzer and confirm stable governed JSON/Markdown hashes while preserving the original legacy report hash.
- [x] Mark the isolated lane `ready-for-P2.2a`; browser/dev-server/Playwright/live-perf execution remains assigned to the later single-owner acceptance lane.
- [x] Repair the stale P53 acceptance-lane sentence exposed by the first clean-head `verify:core` attempt; keep the current P2.2a document and production runtime unchanged.

## Williams rerun08 harness-recovery authorization 2026-07-13

- [x] Preserve rerun07 as immutable terminal `harness fault / exit 1` evidence.
- [x] Complete three independent static reviews of governance, harness root cause, and integration readiness.
- [x] Confirm repository governance permits a new integration-owner decision while measurement and acceptance contracts stay frozen.
- [x] Reproduce the host power lifecycle under S0 Low Power Idle: generated GUID duplicate, query, activate, active-GUID match, restore, delete, expected-failure deletion query, original-scheme query, and valid cleanup.
- [x] Add a tracked power helper and deterministic governance regression that remove `/list` from identity ownership and lock the complete 11-event lifecycle.
- [x] Approve `p2-williams-rerun08-harness-recovery-v1` with frozen candidate/control/policy/role/workload/order/sample/threshold/estimator/quiet/terminal contracts.
- [x] Commit and push the rerun08 governance checkpoint at `c1671a95466e8801e32eaa4d193f4d0264d6a6b9`.
- [ ] Create fresh exact detached candidate/control worktrees and verify clean identities plus dependency junctions.
- [ ] Validate the rerun08 operator and its expected-failure deletion proof.
- [ ] Run exactly one dry plan and one Williams execute with zero retry.
- [ ] Record terminal analyzer, cleanup, hashes, power evidence, and worktree cleanup.
- [ ] Open main integration only if rerun08 returns `accepted / exit 0`.
