# Scenario Forge P2 Renderer Frame Orchestration Context

Date: 2026-07-10

## Repository facts

- worktree path: `C:\Users\raede\.codex\worktrees\mapcreator-renderer-frame-orchestration-p2-20260710`
- base branch: `origin/main`
- base commit / clean baseline HEAD: `b14165c0e693a87872361b87ac78dc31cd7a0155`
- current pre-P2 Windows perf readiness functional commit: `61e090388feb0c69887b9947b55b61968d5324de`
- current P2.1 functional Lore commit: `cc6477e0111568091a8665f76fa13d1083c67426`
- current P2.2a functional Lore commit: `2f4ed71d8455bc16ad87ff361ac3f106360aa8c0`
- current runtime source anchor: `8eda8c5ce19f54fd839e72e3031a2424a4e658f3`
- prior Williams telemetry-v2 functional commit: `89dfe15e1b28536687e258634bb92324336ff81c`
- rerun03 exact measurement candidate: `2e05d5a8e7beae2c2200f6d4f3ffdc19e8df16a9`; control: `ab86b1e24d161edbe6bcc80acb0b316e4bf81942`; package-lock Git blob on both sides: `df70020f2f930d5692a1ff9febebf86dbb0e0db1`
- current telemetry-v3 functional checkpoint: `26b1115cc3fe1e66200661e195a4c5abbf4d4c05`; policy/runtime/tests and their review evidence are committed
- current P2.2b production checkpoint: `9479e9e6ff8d4b2fa8ba969fdc7b7e2f341d2d40`; production, deterministic, Pages, browser matrix, and `perf:gate` acceptance are green
- current Williams control overlay: `bd98c5800ac5cca2a93d7f55ac1b0a254ca5028f`; candidate/control share the frozen package-lock, baseline-runner, and role-policy-v2 blobs
- current task phase: rerun06 is immutable terminal `invalid-experiment / exit 3` evidence after 8/8 blocks, 32/32 measured raw files, and 115/115 manifest entries; three frequency-admission checks, one TNO startup internal outlier, and one same-side startup drift check failed; one final capped rerun07 is authorized under `p2-williams-rerun07-final-repeat-v1`
- current acceptance test-contract commit: `427e68398a67586ef4a330b5304dfde567da917e`
- current worktree state: isolated P2 branch is clean at `9479e9e6`; rerun06 detached candidate/control worktrees and dependency junctions were removed and pruned after exact identities, clean status, Job cleanup, ports, and immutable evidence hashes were verified; the control overlay recovery worktree remains registered at `bd98c580`; parent WIP remains untouched
- release residue worktree: removed/no longer registered on 2026-07-11; recovery evidence remains commit `b14165c0e693a87872361b87ac78dc31cd7a0155`
- P1 isolated worktree: removed
- P1 recovery branch: `origin/codex/renderer-runtime-context-p1-remaining-20260709@e102a70a`
- parent checkout: `C:\Users\raede\Desktop\dev\mapcreator`, `main@db8bd6c118d158aaed4dd6734ecdd981fe80f326`, `0 ahead / 17 behind origin/main@17aeedf`, with 52 `docs/archive/**` deletions and modified `README.zh-CN.md`, `dist/app.js`, `dist/pages-dist-manifest.json`, `landing/app.js`, `lessons learned.md` (57 entries total)

## Approved hard invariants

- Owners stay fixed at `draw_canvas_orchestration_owner.js`, `cached_pass_compositor_owner.js`, and `transformed_frame_compositor_owner.js`.
- All owners are constructed by `map_renderer.js`.
- `RendererRuntimeContext` remains a read model.
- Clean baseline runs before production edits under one live-process owner.
- Browser/perf/focused/deterministic/selector/Pages/dist gates belong to the verification path at each functional checkpoint.

## Live-process ownership

- live-process owner: none; rerun06 completed exactly one execute with zero retry, all task processes are gone, ports 8000/8892 are clear, and rerun07 is the sole remaining live lane under a fresh explicit owner and unique evidence root
- historical expected-red owner path: `/root/p2_baseline_test_fix`
- log root: `.runtime/tests/renderer-frame-orchestration-p2-20260710/`
- focused browser evidence: historical 2/5 after committed test-only repair `28bda618`, confirming a production disclosure race
- main-thread evidence: remains the prior `f5f27d3f` evidence; this closeout did not rerun main-thread
- perf baseline: red at `61e090388feb0c69887b9947b55b61968d5324de`; readiness green, threshold acceptance blocked
- clean-head `npm run verify:core` exited 0 with 66/66 at candidate `6a2fad24`; log `.runtime/output/perf/p2-2a-williams-live-20260712-rerun02/preflight/verify-core.log`, SHA256 `c21f6e97aff7d9a5c0a6cfc0a84459991db172bed72653a3870af35b81a686de`; rerun02 then used exactly one governed execute invocation and no retry
- telemetry-v2 focused evidence at `89dfe15e`: governance 32/32; default Job runner 10 pass plus one explicit live skip; explicit live telemetry lane 2/2; metadata 16/16; core-runner 8/8; perf-gate contract 23/23; render-role 17/17; route schema 299; architecture/state/import/supervisor gates green; adaptive dry-run 9 changed files, 198 recommendations, 8 main-thread lanes, 0 unmatched
- telemetry-v2 clean-head evidence at `2e05d5a8`: `npm run verify:core` passed 66/66 with zero failures; the explicit live Windows cadence lane passed 2/2 in 9.28 seconds. Logs: `.runtime/tests/renderer-frame-orchestration-p2-20260710/williams-telemetry-v2/01-clean-head-verify-core.log` and `02-live-telemetry.log`.
- rerun03 terminal evidence: exactly one dry plan and one execute were used. Block-01/control completed with valid Job cleanup. Block-02/candidate pre-telemetry recorded capture durations `[3617.4604, 628-653...]ms`, capture-start intervals `[3621,629,637,654]ms`, and schedule lags up to `2652.9ms`; quiet admission failed on `telemetry.samples.interval`, workload execution stopped, and analysis returned `invalid-experiment / exit 3`. Canonical root: `.runtime/output/perf/p2-2a-williams-live-20260712-rerun03/`.
- telemetry-v3 checkpoint evidence at `26b1115c`: governance 33/33; default Job runner 10 pass plus one explicit live skip; the root-owned explicit live lane passed 2/2 while collecting two successive fresh telemetry windows in 18.903 seconds. Clean-head `npm run verify:core` then passed 66/66 with exit 0. Logs: `.runtime/tests/renderer-frame-orchestration-p2-20260710/williams-telemetry-v3/01-live-telemetry.log`, `01-live-telemetry.exit.txt`, `02-clean-head-verify-core.log` (SHA256 `ad4222338c9b14b5369c4e2c85accbc185a2a2597f001be8465286fa2b2ac73b`), and `02-clean-head-verify-core.exit.txt`.

## Current phase ledger

- P2.0 docs-only truth reconciliation: complete at `6cd077bd3a732d3bebae0ba84c4dc09dbca462d4`
- Pre-P2 test-only repair: committed at `28bda618`; static checks complete; focused browser baseline refreshed at 2/5 and identified a production disclosure race
- Pre-P2 production disclosure race repair: committed at `f5f27d3fe3dc2a928b6de453b2883a3c766daf21`; its Lore trailer records post-commit browser/main-thread/perf baseline as `Not-tested`
- Pre-P2 Windows perf readiness fix: complete at `61e090388feb0c69887b9947b55b61968d5324de`; readiness/PID ownership is green and perf gate reached measurement
- Clean baseline: perf measurement completed and gate is red on April-baseline thresholds
- P2.1 draw canvas orchestration owner: committed at `cc6477e0111568091a8665f76fa13d1083c67426`; clean-head dist/core verification is green; waiver authorizes separate P2.1 acceptance only
- P2.2a cached pass compositor owner: accepted-test candidate `8eda8c5ce19f54fd839e72e3031a2424a4e658f3`; focused/Pages/dist/core and browser gates complete; first performance evidence classified `invalid-environment-regime`; replacement rerun02 classified `invalid-experiment / multiple-admission-failures`
- P2.2b transformed frame compositor owner: committed at `9479e9e6`; deterministic, Pages, browser matrix, and `perf:gate` acceptance are green; rerun06 is terminal invalid and rerun07 owns the final performance disposition
- Review / UltraQA: final implementation review pending after rerun07 terminal disposition
- Integration / push / cleanup: pending

## P2 upstream integration 2026-07-11

- Integration owner merged P2 acceptance HEAD `a777d17b9d22a5f1d8dde7aac515ab39d8f69b2a` with latest `origin/main@17aeedf5b295d08fe08965fa5d6f89b0dfb6426c` using a non-rebase merge. Merge commit: `aebb9efd492db711e24f43c39c51b4ef94f59097`.
- Worktree planning: dirty parent `main@db8bd6c` remains read-only and behind 17; the P2 worktree was clean at `a777d17b`; the release residue path was already absent.
- Direct overlap: registry, Pages startup shell test, and verification metadata. Only the registry produced a text conflict. Manual resolution kept both P2 integration truth and the upstream release packaging audit record. Pages and metadata auto-merged with both assertion families present.
- Semantic overlap: `.gitignore`, Pages builder, route registry, structural tooling test, and lessons record retain upstream authority. Renderer source/dist, owner, package, and P2 contracts had no upstream overlap.
- Focused integration results: upstream Python 80/80; owner 14/14; P53 8/8; Python boundary 5/5; metadata 14/14; core runner 8/8; architecture/state/import/E2E-layer/selector/supervisor all green.
- Canonical Pages result: startup 46/46, landing 18/18, sample 17/17, total 927.17 MiB. Renderer, owner, and sidebar source/dist blobs match.
- Clean merge HEAD result: `verify:dist-drift` exit 0; full `verify:core` 61/61, zero failures, seven skipped main-thread lanes.
- Evidence directory: `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-upstream-integration/`; core report `.runtime/reports/generated/verify-core.json`.
- Current handoff: `ready-for-P2.1-acceptance`. Browser, main-thread, and performance remain owned by the separate acceptance lane.

## P2.1 deterministic implementation completion 2026-07-11

- State: functional commit `cc6477e0111568091a8665f76fa13d1083c67426` committed and verified; ready for separate browser/performance acceptance.
- Physical lines: `js/core/map_renderer.js` source/dist 23437; draw-canvas owner source/dist 255; baseline 23472; net reduction 35.
- Enforced ceilings: architecture split-entry budget 23438; Python `splitlines()` ceiling 23437.
- Focused results: owner 14/14; P53 8/8; Python boundary 5/5; render-pipeline 5/5; scenario chunk 57/57; scenario refresh 36/36; metadata 14/14; core-runner 8/8.
- Shared deterministic gates passed: architecture boundaries, state-write allowlist, import graph, route schema 286, and supervisor contracts.
- Pages/dist generation passed: startup shell 44/44, landing showcase 18/18, sample project 17/17, total 927.17 MiB. Log: `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-1-recovery/verify-pages-dist.log`.
- Clean-head `verify:dist-drift` exited 0. Log: `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-1-recovery/clean-head-verify-dist-drift.log`.
- Clean-head `verify:core` exited 0 with 61/61. Report: `.runtime/reports/generated/verify-core.json`; log: `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-1-recovery/clean-head-verify-core.log`.
- Blob parity: renderer source/dist `a78767ade0dd2f416fab95b02d67f007e0a9f79c`; owner source/dist `85eb8cc125b3438fd63805fca7c5be371e64076c`.
- Runtime cleanup: old PIDs 27992, 18096, and 35820 are absent; ports 8000 and 8892 are clear.
- Remote movement: `origin/main@17aeedf` moved forward by one commit. Direct red overlaps are `docs/active/_worktree_registry.md`, `tests/test_pages_dist_startup_shell.py`, and `tools/verification/verification_domains.mjs`. Preserve the clean worktree and defer rebase to the integration owner.
- Remaining acceptance: Browser, Playwright, main-thread, and performance acceptance are assigned to a separate acceptance owner.

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
- Post-commit split after the Windows readiness fix: clean-head `npm run verify:core` is green from existing evidence; `perf:gate` reached measurement and is red on real thresholds; main-thread/browser regressions remain inherited or unrun lanes under a future live-process owner.
- Parent checkout WIP remains untouched.

## Post-commit perf readiness classification

- Functional commit `61e090388feb0c69887b9947b55b61968d5324de` was ahead 4 from `origin/main`; the worktree was clean before this docs-only closeout.
- Clean-head `npm run verify:core` exited 0 in `.runtime/tests/renderer-frame-orchestration-p2-20260710/perf-readiness/post-commit/01-verify-core.log`. This docs-only closeout inspected existing artifacts and did not rerun core, main-thread, browser, server, Playwright, or perf commands.
- Windows readiness is green: the gate launched its managed server, completed three warmups and three runs for both scenarios, wrote `.runtime/output/perf/baseline_2026-04-20/perf-gate-current.json`, and had no PID/readiness timeout.
- `npm run perf:gate` exited 1 in `.runtime/tests/renderer-frame-orchestration-p2-20260710/perf-readiness/post-commit/02-perf-gate.log` because the threshold gate is red.
- Baseline reference is `docs/perf/baseline_2026-04-20.json`; `contractMismatches=[]`.
- Threshold failures: TNO totalStartup current 8131.4ms, baseline 5805.3ms, limit 6676.1ms at 1.15x, ratio 1.401, run min 8049.5, max 8185, spread 135.5ms / 1.67%; HOI4 totalStartup current 7746.8ms, baseline 5205.7ms, limit 5986.6ms at 1.15x, ratio 1.488, run min 7160.4, max 7789.5, spread 629.1ms / 8.12%; HOI4 renderSampleMedian current 705.05ms, baseline 560.9ms, limit 701.125ms at 1.25x, ratio 1.257, exceeds by 3.925ms / 0.56%, run min 690.4, max 715.65, spread 25.25ms / 3.58%.
- Attribution boundary: both startup shifts are repeatable current-vs-April failures; current evidence cannot attribute them to this launcher-only patch. HOI4 render median is borderline and environment noise can explain it.
- Main-thread evidence remains the prior `f5f27d` evidence; this closeout did not rerun main-thread. `test:e2e:physical-layer-runtime-contract` and `test:e2e:scenario-resilience` were not run after the perf stop rule.
- Cleanup: the interrupted typed owner had started a dedicated port 8892 server PID 58444; active_server metadata matched this worktree/runtime root; cleanup terminated only PID 58444; ports 8000 and 8892 were clear afterward; worktree status was clean before docs edits.
- P2.1 admitted under scoped governance waiver. Old red perf-gate evidence is historical only; P2.1 acceptance A/B, P2.2 entry A/B, and P2 closeout A/B remain required before later phase advancement.
- Runtime classification report: `.runtime/tests/renderer-frame-orchestration-p2-20260710/perf-readiness/post-commit/cleanup-classification.md`.
## P2 Contemporary A/B Admission Run 2026-07-10

- Scope: contemporary A/B only; no renderer/product code, perf runner, historical baseline, thresholds, or samples were edited. Browser E2E was not run.
- Control lifecycle: detached control worktree `C:\Users\raede\.codex\worktrees\mapcreator-perf-control-b14165c-20260710` was created from `b14165c0e693a87872361b87ac78dc31cd7a0155`, used only for A1/A2, then removed after deleting its ignored `node_modules` junction with a non-recursive junction-safe operation. Cleanup proof: `.runtime/output/perf/p2-ab/20260710/cleanup/control-cleanup.txt`; control path is gone.
- Recovery evidence: control SHA `b14165c0e693a87872361b87ac78dc31cd7a0155`; P2 SHA `3c54d9298c393a3401fd7279b180eac136c9ae85`; package-lock SHA256 `fa60a74b517568ffedd1bcdad5414e5ab3a36380ec1ea511411a267a52766385` on both sides; control artifacts were copied into P2 `.runtime/output/perf/p2-ab/20260710/A/` before cleanup.
- Environment: Node `v22.23.0`; npm `11.18.0`; Python `Python 3.12.10` at `C:\Users\raede\AppData\Local\Programs\Python\Python312\python.exe`; `pythonLocation=C:\Users\raede\AppData\Local\Programs\Python\Python312`; Playwright `1.58.2`; Chromium `145.0.7632.6` at `C:\Users\raede\AppData\Local\ms-playwright\chromium-1208\chrome-win64\chrome.exe`.
- Blocks:
- `A1` control order `tno_1962,hoi4_1939` exit `0`; log `.runtime\output\perf\p2-ab\20260710\A\A1\runner.log`; baseline `.runtime\output\perf\p2-ab\20260710\A\A1\baseline.json`; raw `.runtime\output\perf\p2-ab\20260710\A\A1\raw`.
- `B1` p2 order `tno_1962,hoi4_1939` exit `0`; log `.runtime\output\perf\p2-ab\20260710\B\B1\runner.log`; baseline `.runtime\output\perf\p2-ab\20260710\B\B1\baseline.json`; raw `.runtime\output\perf\p2-ab\20260710\B\B1\raw`.
- `B2` p2 order `hoi4_1939,tno_1962` exit `0`; log `.runtime\output\perf\p2-ab\20260710\B\B2\runner.log`; baseline `.runtime\output\perf\p2-ab\20260710\B\B2\baseline.json`; raw `.runtime\output\perf\p2-ab\20260710\B\B2\raw`.
- `A2` control order `hoi4_1939,tno_1962` exit `0`; log `.runtime\output\perf\p2-ab\20260710\A\A2\runner.log`; baseline `.runtime\output\perf\p2-ab\20260710\A\A2\baseline.json`; raw `.runtime\output\perf\p2-ab\20260710\A\A2\raw`.
- Combined reports: `.runtime/reports/generated/p2-perf-ab-20260710.json` and `.runtime/reports/generated/p2-perf-ab-20260710.md`.
- Admission checks: readiness_contract_errors=PASS, workload_identity_matches=PASS, block_drift=FAIL, b_vs_a_startup=PASS, b_vs_a_render_median=PASS, new_outlier_or_opposite_direction_anomaly=FAIL.
- Workload identity: scenario id, manifest SHA, runtime topology SHA, bootstrap topology SHA, runtime meta SHA, detail chunk manifest SHA, feature count, owner count, snapshot fingerprint, baseline hash, URL query, package-lock hash, Node major, Playwright package, and Chromium identity all match between A/B.
- Metrics:

| Scenario | Metric | A median | B median | B/A | B-A ms | A2/A1 drift | B2/B1 drift | A p90 | B p90 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `tno_1962` | `totalStartupMs` | 8243.0 | 8369.9 | 1.015 / 1.5% | 126.9 | 1.2% | 1.0% | 8337.5 | 8454.2 |
| `tno_1962` | `scenarioAppliedMs` | 3338.3 | 3400.7 | 1.019 / 1.9% | 62.4 | 0.3% | 0.1% | 3419.3 | 3419.8 |
| `tno_1962` | `applyScenarioBundleMs` | 664.0 | 665.6 | 1.002 / 0.2% | 1.6 | -3.1% | 4.2% | 694.9 | 688.8 |
| `tno_1962` | `refreshScenarioApplyMs` | 331.2 | 339.1 | 1.024 / 2.4% | 7.9 | -8.5% | 8.6% | 356.4 | 354.4 |
| `tno_1962` | `renderSampleMedianMs` | 831.0 | 835.1 | 1.005 / 0.5% | 4.0 | 3.5% | 0.9% | 868.0 | 853.2 |
| `hoi4_1939` | `totalStartupMs` | 7513.2 | 7485.8 | 0.996 / -0.4% | -27.4 | -7.2% | 11.1% | 7830.9 | 7873.5 |
| `hoi4_1939` | `scenarioAppliedMs` | 3474.4 | 3505.3 | 1.009 / 0.9% | 30.9 | 1.9% | 3.1% | 3534.1 | 3540.8 |
| `hoi4_1939` | `applyScenarioBundleMs` | 714.6 | 714.6 | 1.000 / -0.0% | -0.0 | 0.2% | 4.2% | 732.7 | 727.8 |
| `hoi4_1939` | `refreshScenarioApplyMs` | 438.6 | 432.4 | 0.986 / -1.4% | -6.2 | 0.3% | 2.3% | 464.0 | 455.0 |
| `hoi4_1939` | `renderSampleMedianMs` | 701.8 | 685.1 | 0.976 / -2.4% | -16.7 | -1.3% | 0.8% | 708.7 | 699.0 |

- Decision: P2.1 admitted under scoped governance waiver. Old block-drift data (`A2/A1=-7.2%`, `B2/B1=11.1%`) is preserved as historical evidence only; primary contemporary A/B readiness, workload identity, B/A startup thresholds, and B/A render thresholds pass.
- Historical April gate status: April baseline/threshold frozen; `docs/perf/baseline_2026-04-20.json` and `.md` were not modified.
- Parent checkout proof: parent status after cleanup matches preflight WIP shape and remains untouched. Release residue `C:\Users\raede\.codex\worktrees\mapcreator-release-e102a70` was removed and is no longer registered on 2026-07-11; recovery evidence remains commit `b14165c0e693a87872361b87ac78dc31cd7a0155`. Docs verification after edits: `git diff --check` exit 0; adaptive dry-run exit 0 with `changedFiles=3`, `recommendedCommands=5`, `mainThreadSerialVerification=0`, and `unmatchedChangedFiles=[]`.

## P2.1 post-acceptance code-review hardening

- Starting clean HEAD: `7b3a8fb4662c62a1ba7708da92ba2aa2f82ad9e3`.
- Previous-pixel continuity now reads phase after transformed-cache and last-good fallback effects complete.
- Production `drawCanvas()` ignores the owner result, so frame summaries now require explicit `{ includeSummary: true }`; the no-options path returns `undefined` without enumerating or copying timings.
- `commitLastFrame` receives the original mutable frame timings. An opted-in summary receives an independent frozen copy.
- P53 inventory proves public-facade and state-write semantics from current file content and no longer treats a clean working-tree diff as architectural evidence.
- Pre-fix browser acceptance at `7b3a8fb4` passed 65/65 and cleanup stopped PID 34784 with port 8892 clear. Fresh browser/performance acceptance remains required on the new committed clean HEAD.
- Live-process ownership: this writer owns deterministic and Pages/dist commands. Browser, Playwright, main-thread, and perf remain idle for the later acceptance owner.
- Functional Lore commit: `3efc43206d04616b82be576eb75ae105fc01dd05`.
- Clean-head acceptance: `verify:dist-drift` exit 0; full `verify:core` exit 0 with 61/61. Logs are under `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-1-review-fix/`.
- Current handoff: `ready-for-new-P2.1-acceptance` at `3efc4320`; browser/main-thread/performance must be rerun on this exact source commit before P2.2 entry.

## Notes

- P2.0 changed only active docs truth surfaces and completed at `6cd077bd3a732d3bebae0ba84c4dc09dbca462d4`.
- Selector/adaptive proof for this closeout covers exactly the three allowed docs and must end with `unmatchedChangedFiles=[]`.
- Fresh main-thread/browser evidence stays as a later root-owned lane; P2.1 implementation entry is admitted under scoped governance waiver.
- Cumulative extraction target is at least 150 lines, with P2.1 contributing at least 35 lines.

## Next action

Resume the single-owner P2.1 performance A/B lane from test-contract commit `427e68398a67586ef4a330b5304dfde567da917e`. P2.2 entry remains gated on the performance result.

## Scenario resilience contract realignment 2026-07-11

- Root cause: commit `cd0204fa` retired `#scenarioViewModeSelect` and removed `viewModeDisabled` from `readScenarioResilienceState()`, while two exact-object expectations retained that removed field.
- Scope: test-contract commit `427e68398a67586ef4a330b5304dfde567da917e` deletes only those two expected keys. Fatal recovery, reload/inconsistent status, the four existing disabled controls, and `SCENARIO_FATAL_RECOVERY` remain asserted.
- Browser evidence: `npm run test:e2e:scenario-resilience` passed 3/3 at the equivalent test patch later committed as `427e6839`. Logs: `.runtime/tests/renderer-frame-orchestration-p2-20260710/scenario-resilience-contract-fix/06-scenario-resilience.stdout.log` and `.stderr.log`.
- Prior same-runtime-tree evidence remains valid: `verify:core:main-thread` passed 65/65 and `test:e2e:physical-layer-runtime-contract` passed 1/1 at docs-only HEAD `77855450`; commits `77855450` and `427e6839` change documentation/test expectations only, so both runs exercise the same product runtime tree rooted at `3efc4320`.
- Static evidence: syntax, E2E layer manifest 47, test import graph 51, and the focused adaptive dry-run passed with one changed file, two recommended commands, one main-thread lane, and zero unmatched files. The final test-plus-docs selector reported five changed files, nine recommended commands, one main-thread lane, and zero unmatched files; all eight child-safe recommendations passed.
- Cleanup: server PID 18364 stopped; matching active-server metadata removed; ports 8000 and 8892 are clear. Evidence: `.runtime/tests/renderer-frame-orchestration-p2-20260710/scenario-resilience-contract-fix/07-cleanup.json` and `08-metadata-cleanup.json`.
## Current admission note

State: P2.1 admitted under scoped governance waiver.

Governance basis: primary contemporary A/B readiness PASS, workload/runner identity PASS, B/A startup thresholds PASS, B/A render thresholds PASS. HOI4 promotion short-path A/B counts 3/3 and long-path A/B counts 6/6, all stratified deltas inside declared deadband. Old block-drift data is preserved as historical evidence only. April baseline/threshold frozen. Control SHA: `b14165c0e693a87872361b87ac78dc31cd7a0155`. P2 starting HEAD: `1c58d5dbe1a42794074beb792b64b5e8ab26e153`.

Waiver scope: authorizes P2.1 implementation entry only. P2.1 acceptance A/B, P2.2 entry A/B, and P2 closeout A/B remain required.

Formal supplement: reports `.runtime/reports/generated/p2-perf-hoi4-isolated-abba-20260710.{json,md}` stay `inconclusive/blocked` for attribution; attempt01/02 invalid due validator `[double]::IsFinite` flaw after A3 exit 0; attempt03 invalid due stale task-owned Chromium; attempt04 A3/control 5 valid partial samples and B3/P2 quiet-window failed 3 bounded attempts, with B4/A4 not run; attempt05 discarded. Supplement cannot establish regression or no-regression and cannot overturn phase admission.

Cleanup: runner restored; junction removed; control worktree removed/pruned; ports 8000/8892 clear; task-owned runner/server/Chromium 0; parent untouched; release residue removed/no longer registered on 2026-07-11 with recovery evidence at commit `b14165c0e693a87872361b87ac78dc31cd7a0155`; artifact `.runtime/tmp/p2-supplement-control-cleanup.json`.

## P2.1 final browser and performance acceptance 2026-07-11

Historical legacy-metric phase truth: P2.1 acceptance originally recorded `failed/blocked` before the governed role reanalysis below. The original report remains preserved.

Browser matrix:

- `npm run verify:core:main-thread`: 65/65 passed. Log: `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-1-acceptance/browser-77855450/01-verify-core-main-thread.log`.
- `npm run test:e2e:physical-layer-runtime-contract`: 1/1 passed. Log: `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-1-acceptance/browser-77855450/02-physical-layer-runtime-contract.log`.
- `npm run test:e2e:scenario-resilience`: 3/3 passed after the retired view-mode expectation was removed in test-contract commit `427e68398a67586ef4a330b5304dfde567da917e`. Product runtime source remains rooted at reviewed commit `3efc43206d04616b82be576eb75ae105fc01dd05`.

Contemporary performance experiment:

- Control: `c7fb5cde4d6eb5ec4fc9c7c712b1964f45502f8a`.
- Candidate: `7e6ca0159cb5a9d8734a58b2bace5ca898ccaed1`.
- Sequence: `A1 -> B1 -> B2 -> A2`; every block used `tno_1962,hoi4_1939`, three warmups, and five measured runs per scenario.
- All four blocks exited 0 and passed their first quiet-window attempt. A-side CPU/memory-delta readings were A1 `18.0% / 0.049%` and A2 `18.4% / 0.349%`; B-side readings were B1 `18.0% / 0.391%` and B2 `12.2% / 0.001%`. Ports were clear and task-owned Chromium was absent before/after each block.
- Exact runner SHA256 `5d3756d9532d83fede372096823129ee4a66b5cac651fee0a049a7eb3465c34d`; exact package-lock SHA256 `fa60a74b517568ffedd1bcdad5414e5ab3a36380ec1ea511411a267a52766385`. Environment, URL query, scenario order, and workload identities matched.

Pooled primary results:

| Scenario | Startup A/B | Render A/B | Gate |
| --- | --- | --- | --- |
| `tno_1962` | `6414.40 / 6408.15ms` (`-6.25ms`, `-0.10%`) | `668.10 / 815.75ms` (`+147.65ms`, `+22.10%`) | render FAIL |
| `hoi4_1939` | `5833.95 / 5804.10ms` (`-29.85ms`, `-0.51%`) | `569.70 / 573.18ms` (`+3.48ms`, `+0.61%`) | PASS |

HOI4 promotion classification found a largest adjacent gap of `31.20ms` (`640.60 -> 671.80ms`) and a maximum within-cluster gap of `16.60ms`; the two-cluster materiality rule therefore did not pass. The provisional A/B short/long counts are `9/1` and `10/0`, with a 10 percentage-point long-rate difference. The long stratum remains below the three-per-side minimum and is ancillary inconclusive. Outlier and opposite-direction checks passed.

Artifacts:

- `.runtime/reports/generated/p2-1-performance-ab-20260711.json`
- `.runtime/reports/generated/p2-1-performance-ab-20260711.md`
- `.runtime/output/perf/p2-1-acceptance/20260711/A/{A1,A2}/`
- `.runtime/output/perf/p2-1-acceptance/20260711/B/{B1,B2}/`
- `.runtime/output/perf/p2-1-acceptance/20260711/cleanup/control-cleanup.json`

Cleanup is complete: the control runner was restored to its original byte SHA, the ignored junction and control worktree were removed safely, `git worktree prune` completed, ports 8000/8892 are clear, task-owned browser/process counts are zero, and parent WIP retains its preflight shape. The April baseline remains frozen. The approved protocol excludes selective reruns.

## Governed render-sample role reanalysis 2026-07-11

The original report `.runtime/reports/generated/p2-1-performance-ab-20260711.json` remains byte-preserved at SHA256 `f601896f26478ae9e023d97d0193e281cb8a0c3931fdcd8fa4bccebe03f4d839`, including its legacy `failed/blocked` decision. Its legacy metric pooled two different first-frame roles with the final post-promotion scenario frame. TNO first-sample composition was A blank/scenario `6/4` and B `3/7`, which changed the median role represented on each side.

The reusable policy `render-sample-role-v1` selects `last-post-promotion-idle-scenario-frame-v1` only when each measured run has exactly two samples with sequence `[1,2]`, the unique canonical candidate is `samples.at(-1)`, scenario identity matches, phase is idle, political background is progressive, scenario context time is positive, and the sample is recorded at or after visual chunk promotion. All 40 frozen raw runs match. No duration participates in role classification.

Governed canonical medians:

| Scenario | Control A | Candidate B | Delta | Result |
| --- | ---: | ---: | ---: | --- |
| `tno_1962` | `1197.90ms` | `1195.35ms` | `-2.55ms / -0.21%` | PASS |
| `hoi4_1939` | `694.55ms` | `694.80ms` | `+0.25ms / +0.04%` | PASS |

Startup, quiet-window/block validity, control/candidate HEAD, runner, lock, environment, URL query, workload identity, raw hashes, block drift, outlier, and opposite-direction checks pass. HOI4 has no material promotion gap, so promotion-stratified admission is `not-applicable/pass`. Companion artifacts are `.runtime/reports/generated/p2-1-performance-ab-governed-20260711.json` and `.md`; the decision is `accepted-with-governed-reanalysis`.

Future baseline/gate reports use schema version 2 and expose both `canonicalRenderSampleMs` and the legacy median diagnostic. The April schema-version-1 baseline and historical `1.15/1.25` thresholds remain compatible and frozen. Governed scenario role mismatch fails closed. The original P2.2 preregistration used A1/B1/B2/A2, three warmups, five measured runs, startup `3% + 75ms`, render `5% + 35ms`, and block drift `5%/10%`; the later Williams section supersedes the execution shape for the replacement P2.2a rerun while retaining the same practical thresholds.

## Governed tooling deterministic closeout 2026-07-11

Functional Lore commit `14878c78937f36f9ddee53a876521494a2214cbb` contains the policy, runner schema, offline analyzer, focused tests, metadata route, and documentation. Clean-head `verify:dist-drift` exited 0 and full `verify:core` passed 62/62; logs are `.runtime/tests/renderer-frame-orchestration-p2-20260710/perf-role-governance-14878c78/01-verify-dist-drift.log` and `02-verify-core.log`.

The offline analyzer was rerun after the gates and reproduced the governed JSON SHA256 `6f76b274a7827c1c6b7baac68508e40dbafb521206cdc85c1e06c03c42790245` and Markdown SHA256 `bed108df85b38aaf803287b3354332e0023868235767aea7500c5bad88d52305`. The source legacy report remained byte-identical at SHA256 `f601896f26478ae9e023d97d0193e281cb8a0c3931fdcd8fa4bccebe03f4d839`. This deterministic tooling slice used the already captured and validated 40-run evidence set; browser, dev server, Playwright, and live performance execution remain assigned to the later single-owner acceptance lane. P2.2a is ready under the pre-registered governed protocol.

## P2.2a cached-pass compositor implementation 2026-07-11

Starting clean HEAD: `ab86b1e24d161edbe6bcc80acb0b316e4bf81942`. Current `origin/main@17aeedf5b295d08fe08965fa5d6f89b0dfb6426c` is an ancestor of this branch; the isolated lane was ahead 19 / behind 0 before edits. The dirty parent checkout remained read-only.

The new import-free owner `js/core/renderer/cached_pass_compositor_owner.js` owns only `drawTransformedPass()` and `composeRenderPassesToTarget()`. `map_renderer.js` keeps the singleton, dependency wiring, diagnostics write effect, stable wrappers, export call path, and every P2.2b/adjacent algorithm. Dynamic target context is resolved per draw. The original transform/DPR/layout math, require-all canvas-before-reference preflight, result schema, non-required direct path, and success return remain locked by behavior tests.

Functional delivery package:

1. Core: `js/core/map_renderer.js`, new cached-pass owner, generated source mirrors, and Pages manifest.
2. Tests/contracts: named owner behavior, combined Python frame-compositor boundary, P53 inventory, scenario source scans, Pages startup, verification metadata, and core-runner fixtures.
3. Tooling/docs: architecture checker, verification domains, package scripts, P2.2a implementation record, registry, context, and task ledger.
4. Diff/size: `map_renderer.js` 23,437 -> 23,376 split lines, net -61; cached owner 170 split lines; cumulative P2 extraction is 96 lines after P2.1 + P2.2a.
5. Validation: owner 8/8, Python boundary 4/4, scenario 57/57, metadata 15/15, architecture green, Pages startup 47/47, landing 18/18, sample 17/17, and P53 11/11 after generation. Source/dist blobs match for renderer and cached owner.

Functional Lore commit `2f4ed71d8455bc16ad87ff361ac3f106360aa8c0` contains the production extraction, tests, verification routing, docs, and generated mirror. The first full-core attempt exposed a stale source-scan endpoint in `renderer_runtime_context_receiver_behavior.test.mjs`; its segment now ends at `getCachedPassCompositorOwner()`, the focused receiver suite passes 10/10, and no production code changed in that repair.

Clean-head `verify:dist-drift` exits 0 from `clean-head/20-verify-dist-drift.log`. Clean-head `verify:core` exits 0 with 64/64 commands, zero failures/omissions/duplicates, and seven explicit main-thread skips from `clean-head/22-verify-core-rerun.log`; the structured report is `.runtime/reports/generated/verify-core.json`. Selector evidence is 19 changed files, 195 recommended commands, 7 main-thread lanes, and 0 unmatched files. Source/dist blobs match at renderer `9467d79806d1f418c89527ac6b1a560ff11a27c1` and owner `bc84b5c34f060282b573b333ba14344e59483f73`.

Status: `ready-for-static-review + browser/performance acceptance`. Browser, main-thread, Playwright, and performance execution stay with the separate single-owner lane.

## P2.2a cached-pass compositor static-review fix 2026-07-11

Static review found one high-risk consistency issue and two narrow call-shape/order issues. Review-fix Lore commit `aa34b8b43ad52590f4c5fc553ff4b13d74fceab4` resolves all three while preserving the public/private renderer call surface:

1. Each owner public method now captures `getRenderPassCacheState()` once through the injected `getRenderPassCacheSnapshot()` dependency. Every pass canvas and dirty diagnostic in that call uses the same normalized snapshot. Tests prove one snapshot read for transformed draw, non-required multi-pass compose, and require-all multi-pass compose.
2. `map_renderer.js` forwards the caller's `options` object directly to `composeRenderPassesToTarget()`; the final owner-side parameter semantics are recorded in the follow-up section below.
3. DPR evaluation is restored to the original draw site after target-context setup for transformed paths and after layout resolution for direct composition.

The root renderer stays at 23,376 split lines. The hardened cached-pass owner is 176 split lines, within its 320-line ceiling. Source/dist blobs match at renderer `b2df02b5be80702b6c50cd3bc572a100302e8f4b` and owner `134a295605cd7081177f9af0ac5648c82c07be6b`.

Focused and shared evidence is green: cached-owner 12/12, P53 11/11, Python boundary 4/4, clean P51 26/26, clean P52 15/15, draw-owner suite, architecture/state/import/metadata/supervisor gates, Pages startup 47/47, landing 18/18, sample 17/17, clean `verify:dist-drift`, and clean `verify:core` 64/64. The functional selector reports 9 changed files, 27 recommended commands, 1 main-thread lane, and 0 unmatched files; the evidence-doc selector reports 4/9/0/0. The pre-commit P51 red was its intentional dirty-worktree dist guard; the clean-head suite passed after the functional commit.

Status: `ready-for-static-re-review + separate browser/performance acceptance`. The deterministic review-fix lane did not run browser, dev server, Playwright, `verify:core:main-thread`, or governed live performance.

## P2.2a final options-contract microfix 2026-07-11

Functional Lore commit `76977207` restores the exact compose options contract. The root wrapper continues forwarding the caller-owned options object. The owner now parameter-destructures `{ requireAllPasses = false } = {}` before the function body, so `null` retains the historical `TypeError`, a getter-backed option is evaluated once, and option evaluation precedes the method-local cache snapshot capture.

The one-snapshot-per-public-method contract and DPR evaluation order remain unchanged. Owner behavior passes 13/13; P53 passes 11/11; the combined Python boundary passes 4/4; architecture boundaries pass. Canonical Pages generation passes startup 47/47, landing 18/18, sample 17/17 at 927.17 MiB. Owner source/dist blobs match at `55c3f02bdf6da3f57ba1a7266a4954cd51bed249`. The owner is 175 split lines and `map_renderer.js` remains 23,376 split lines.

Clean-head `verify:dist-drift` and full `verify:core` pass at the functional commit; core reports 64/64 commands, zero failures, zero omitted commands, zero duplicates, and seven explicit main-thread skips. Functional adaptive selection reports 7 changed files, 13 recommended commands, 1 main-thread lane, and 0 unmatched files; final evidence-doc selection reports 4/9/0/0.

Status: `ready-for-final-static-re-review + separate browser/performance acceptance`. Browser, dev server, Playwright, `verify:core:main-thread`, and governed live performance remain assigned to their separate single-owner lane.

## P2.2a exact-head browser and governed performance acceptance 2026-07-11

Candidate `8eda8c5ce19f54fd839e72e3031a2424a4e658f3` passed the exact-head browser lane on one port-8892 server: `verify:core:main-thread` 68 commands, smoke 4/4, scenario concurrency 1/1, project save/load 5/5, interaction funnel 3/3, physical-layer runtime 1/1, and scenario resilience 3/3. Cleanup closed ports 8000/8892, removed matching metadata, and left zero task-owned Chromium.

The governed performance control is immediate ancestor `ab86b1e24d161edbe6bcc80acb0b316e4bf81942`. The final adjudicative experiment completed `A1 -> B1 -> B2 -> A2` with fixed TNO/HOI4 order, three warmups, five measured runs, schema-2 fail-closed role policy, and matched runner/lock/environment/query/workload identity. Quiet gates accepted A1 on attempt 1, B1 on attempt 3, B2 on attempt 3, and A2 on attempt 3. Every block exited 0; canonical role coverage is 40/40 with zero mismatches.

Pooled results:

- TNO startup: 7378.10ms control, 7237.50ms candidate, -140.60ms / -1.91%, pass.
- TNO canonical render: 1393.60ms control, 1355.50ms candidate, -38.10ms / -2.73%, pass.
- HOI4 startup: 6589.45ms control, 7172.80ms candidate, +583.35ms / +8.85%, fail.
- HOI4 canonical render: 804.45ms control, 883.00ms candidate, +78.55ms / +9.76%, fail.

Block drift is material across both sides. TNO A/B startup drift is 30.37%/31.75% and canonical drift is 32.93%/35.87%; HOI4 A/B startup drift is 31.44%/9.30% and canonical drift is 44.15%/17.73%. HOI4 first-pair and second-pair deltas reverse beyond the registered startup/render deadbands. Outlier rules pass.

Legacy `renderSampleMedianMs` is diagnostic: TNO A/B 840.45/832.75ms; HOI4 A/B 646.08/698.45ms. TNO first-role composition is A blank/scenario 9/1 and B 8/2; HOI4 is scenario 10/10 on both sides.

Acceptance decision: `blocked`. Failed checks are startup regression, canonical render regression, block drift, and opposite direction beyond deadband. P2.2b remains pending behind this gate.

## P2.2a Williams crossover rerun governance 2026-07-11

The original P2.2a report and raw evidence remain byte-preserved:

- JSON `.runtime/reports/generated/p2-2a-performance-ab-20260711.json`: SHA256 `277dba80fafb796b1d96ee0793e18a4eab1281e790908a778c617857a0dc7ddc`.
- Markdown `.runtime/reports/generated/p2-2a-performance-ab-20260711.md`: SHA256 `15359b93c75a36d1f5f0a442710f248517eaaa40b995d421b0b4e5e554edec45`.
- Raw manifest `.runtime/output/perf/p2-2a-acceptance/20260711/raw-sha256-manifest.json`: SHA256 `c832d438cef94962ac2fb88623fca6464f3e8d11f94732aa09ffb4a2f1279246`.

Its admission classification is now `invalid-environment-regime`. The machine switched performance regimes during B1 between HOI4 run 2 and run 3, later blocks stayed in the slower regime, HOI4 adjacent directions reversed, and bundle/apply/render/canonical timings moved together. This classification preserves the original blocked decision and keeps P2.2b closed.

Governance approved `p2-williams-crossover-v1`. The tracked policy, import-safe CLI, and narrow Windows capability adapter live at `tools/perf/williams_crossover_policy.mjs`, `tools/perf/run_williams_crossover.mjs`, and `tools/perf/williams_crossover_windows_runtime.mjs`. They freeze the eight-block Williams sequence, adjacent `B-A` pairs, same-side/order drift pairs, one-warmup/two-measured block medians, four-pair primary medians, practical thresholds, pair-count adjudication, symmetric direction veto, internal outliers, exact detached/clean identity, structured Windows telemetry, exact 32-file raw reconstruction, evidence manifests, cleanup, and `0/2/3/1` exit meanings.

The raw analyzer reads every measured run from disk, recomputes the canonical `last-post-promotion-idle-scenario-frame-v1` role, requires strict equality with each raw summary, binds scenario manifest path/SHA, feature count, gate sample role, runs, warmups, and URL query across all sides/blocks, and treats legacy pooled medians as diagnostic-only. Its exact manifest set binds schema/policy plus analyzer/policy/Windows-runtime identities to current LF-normalized content, block identities, and side identities; extra, missing, duplicate, tampered, or stale-tool evidence is invalid.

Windows counter state is tri-state; `required-capability-missing` and `collection-error` invalidate the experiment, and null values remain null. `performanceAdjustedFrequencyMHz` is derived as `processorFrequencyMHz * processorPerformancePercent / 100`. Telemetry admission freezes the CPU/frequency/memory thresholds from the plan, enforces pre/post and cross-block time ordering, and binds a single power-scheme GUID and AC source. Port admission uses structured `Get-NetTCPConnection` data plus direct probes where every HTTP response proves an active server. The historical rerun01 cleanup design used one persistent `Win32_ProcessStartTrace` watcher during measurement, accumulated the task-owned `ParentProcessId` closure across process-start events, then took three 200ms-spaced process snapshots after runner close. Rerun01 proved that watcher unavailable under the normal-user lane. The committed Job Object path documented below replaces this retired design.

Live-process owner: `none`. The sole rerun02 owner completed the committed Job Object experiment and cleanup. Analyze mode still needs one `.runtime` output owner and defaults to no-clobber; explicit report replacement uses `--overwrite-analysis`. A future live attempt requires two exact detached clean worktrees, a fresh raw root and fresh report paths, one full sequence, and retained artifacts. P2.2b remains blocked until a complete analyzer result returns `accepted` with exit `0`.

The historical pre-Job review-fix deterministic closeout is green: Williams governance 26/26, metadata 16/16, core-runner 8/8, route schema 295, import graph 51, supervisor contracts/routing/plan green, core list 65, adaptive dry-run `12 changed / 196 recommended / 7 main-thread / 0 unmatched`, and diff check green. Final independent telemetry and harness reviews found no remaining blocker in that static slice. The rerun02 record below supersedes its live-evidence status.

The first clean-head `verify:core` attempt after the Williams tooling commit exposed one stale P53 inventory sentence. The test contract now matches the exact P2.2a document truth, and the focused P53/Williams/metadata/core-runner checks are green; no production or task document wording changed.

## P2.2a Williams rerun01 outcome and analyzer TDD repair 2026-07-11/12

The exact rerun candidate was `f53a44f483403edbd7286db226380f0f0e4664be`, with runtime source anchor `8eda8c5ce19f54fd839e72e3031a2424a4e658f3`; control remained `ab86b1e24d161edbe6bcc80acb0b316e4bf81942`. Mandatory clean-candidate `verify:core` exited `0`. The committed harness `--plan` exited `0` and reproduced the frozen eight-block sequence, one warmup plus two measured runs per scenario, 32-file raw contract, and registered thresholds.

The single `--execute` attempt stopped during block-01 watcher setup. `Register-CimIndicationEvent` returned permission denied / `HRESULT 0x80041003`; the baseline runner never started (`runnerPid=null`) and measured raw count remained `0`. Block evidence records `status=invalid`, exit `3`, and `cleanupValid=false`. The harness then built the partial raw manifest, but analysis dereferenced `post.summary.firstAtMs` after `validateTelemetryWindow()` correctly returned `summary=null` for missing later-block telemetry. That secondary TypeError changed the outer process result to harness fault exit `1` and prevented generation of the typed invalid JSON/Markdown report.

The static repair uses TDD in the existing governance suite. Focused RED produced the exact `Cannot read properties of null (reading 'firstAtMs')` failure at policy line 471. Minimal GREEN normalizes the four cross-window timestamps to `number|null`, compares only present values, retains the existing `.missing` validation reason, and adds no synthetic telemetry. Focused GREEN passes; the full Williams governance suite passes 27/27.

Evidence remains under `.runtime/output/perf/p2-2a-williams-live-20260711-rerun01/`. The immutable raw root is `experiment-20260712T010243Z-raw`; `raw-sha256-manifest.json` SHA256 is `65ab4e89a77d40f4a7e8c1361d69be21ca9df5db625ce6f924b1037bf9667727`; `cleanup-final.json` SHA256 is `b20617025622387118537543ff474f0ac53c3d90a410a637d0c78f898f14beb9`; execute stderr SHA256 is `723dd8ed312ceb611a9a7f53cead2fab71642d0aff484cad0603ff944fbf723a`. Cleanup leaves zero task processes, ports 8000/8892 clear, no temporary junction/worktree, candidate head stable, and parent status identical to preflight. Rerun01 is terminal and will not be selectively resumed. The committed Job Object path resolves its watcher-capability blocker; P2.2b stays blocked pending a fresh complete governed acceptance result.

Static validation is green: policy/test syntax, focused regression 1/1, Williams governance 27/27, verification metadata 16/16, core runner 8/8, perf-gate contract 23/23, render-role policy 17/17, selector schema 295, supervisor contracts/routing 12/12 + 4/4, and diff check. SF-ATS dry-run reports `5 changed / 14 recommended / 12 child-safe / 2 main-thread / 0 unmatched`. The two main-thread recommendations are `perf:gate` and `perf:williams-crossover:run`; this static repair started no live process and leaves both lanes unrun.

Evidence:

- `.runtime/tests/renderer-frame-orchestration-p2-20260710/p2-2a-acceptance/browser/browser-result.json`
- `.runtime/output/perf/p2-2a-acceptance/20260711/performance-result.json`
- `.runtime/output/perf/p2-2a-acceptance/20260711/raw-sha256-manifest.json`
- `.runtime/reports/generated/p2-2a-performance-ab-20260711.json`
- `.runtime/reports/generated/p2-2a-performance-ab-20260711.md`

The final measurement group is the sole adjudicative A/B input. Earlier harness-only preflight/validation and quiet-gate stop artifacts remain under the same runtime root for process audit. The control worktree and junction are removed, candidate/control ports are clear, and parent checkout WIP is unchanged.

## Windows Job Object containment repair 2026-07-12

The WMI watcher path is replaced in committed candidate `6a2fad24bfe864d47c5d0fc712fb07403ceac98d`. `tools/perf/williams_crossover_windows_job_runner.cs` is a tracked Windows helper. `tools/perf/williams_crossover_windows_runtime.mjs` compiles it once before the first pre-telemetry window, performs a short capability probe, reuses the binary for every block, and deletes the temporary compiled artifact after the experiment. `runLoggedCommand()` delegates to this helper; the measurement path contains no WMI process-start watcher, system process polling, or `taskkill` cleanup.

The helper creates each workload root suspended and hidden, assigns it to a nested Job with kill-on-close, verifies membership, then resumes it. A `PROC_THREAD_ATTRIBUTE_HANDLE_LIST` limits inherited handles to NUL stdin and the runner stdout/stderr pipes. The base64 line protocol preserves empty arguments, whitespace, quotes, and trailing backslashes. Cleanup opens descendant synchronization handles before closing the Job, verifies Job close and root termination, records unverified PIDs separately, and keeps `cleanupValid=false` unless every captured descendant is confirmed gone. Assign failure terminates and waits for the still-suspended root. Evidence schema version, command executable/cwd/argv, and root exit are explicit; runtime transport rejects stdin `EPIPE` and asynchronous log persistence failures through typed errors.

Identity is now bound at five levels: tracked C# source descriptor, the actual compiled PE copied to immutable `tooling/windows-job-runner.exe`, preparation source/binary/timestamps/capability evidence, preregistered workload containment identity, and per-block/raw-manifest identity. Every block executes the immutable raw copy. Offline analysis re-hashes its bytes and requires three-way descriptor agreement. It semantically reads preparation and each direct `job-object.json`, then requires exact canonical equality with `cleanup.jobObject`. Policy validation covers schema, compile/probe order, capability command, creation flags, assign-before-resume, kill-on-close, breakaway disabled, command identity, root exit, Job close, root termination, timeout termination, remaining PIDs, and unverified PIDs. Compile/readiness/capability errors raise `WilliamsInvalidExperimentError` and preserve exit `3`.

Fresh evidence in the Job implementation slice: initial Job protocol RED `0/3`; first GREEN `3/3`; fail-closed cleanup RED `3/4`; cleanup GREEN `4/4`; evidence-chain RED `30/33`; final Job package `10/10`; Williams governance `29/29`; verification metadata `16/16`; core-runner behavior `8/8`; perf-gate contract `23/23`; render-role policy `17/17`. Five compile/integration attempts completed with zero compile failure; the first binary was `19968` bytes with SHA256 `0c04ead454235f28df5d06db545be9f18e8b59838367fdfb91c930d5738d127d`, and the current integration preserves root exit `7` while killing a detached child. Static closeout passes import graph `51`, route schema `297`, supervisor `12 + 4 + 15`, core list `66`, architecture/state-write and diff check. Adaptive selection reports `16 changed / 197 recommended / 7 main-thread / 0 unmatched`. Final independent P/Invoke and evidence-chain reviews both return `APPROVE / CLEAR`; the earlier evidence-chain `2 HIGH + 1 MEDIUM` review is the pre-fix snapshot. That implementation slice preceded the rerun02 live execution and clean-head full `verify:core` recorded below. P2.2b remains blocked until a new fresh governed Williams run returns `accepted` / exit `0`.

## Williams governed rerun02 terminal record 2026-07-12

The sole live owner ran the mandatory clean-head `npm run verify:core` at candidate `6a2fad24bfe864d47c5d0fc712fb07403ceac98d`; all 66 commands passed. Exact detached clean measurement worktrees used candidate `6a2fad24` and control `ab86b1e24d161edbe6bcc80acb0b316e4bf81942`, with matching package-lock Git blob `df70020f2f930d5692a1ff9febebf86dbb0e0db1`. The dry plan exited `0` and froze eight blocks, four adjacent `B-A` pairs, and 32 expected measured raw files.

The governed `--execute` command was invoked exactly once. Block-01/control/TH completed its baseline command with exit `0`, valid quiet-window evidence, 4 measured raw files, and valid Windows Job Object cleanup: `remainingPids=[]`, `unverifiedPids=[]`, Job close succeeded, root termination was confirmed, and ports/server/git/detached checks stayed valid. The operator evidence groups the analyzer's block-01 reasons into two root causes. Primary: cleanup observed new browser PIDs `99504` and `106292`; both were external `msedge.exe --type=renderer --extension-process` children of pre-existing Edge parent PID `32132`, absent from the pre snapshot and present in the post snapshot. Additional: pre telemetry intervals rounded to `[1666, 1628, 1655, 1618]ms` and post intervals to `[1628, 1635, 1617, 1631]ms`, outside the 1000±250ms contract. The block therefore failed closed with `cleanupValid=false`, the harness stopped before block-02, and the analyzer returned `invalid-experiment` / exit `3` with operator classification `multiple-admission-failures`. The analyzer's later missing-block and missing-raw reasons derive from that early stop.

This run supplies no four-pair performance verdict. No regression or acceptance conclusion exists. P2.2b remains blocked. There was no automatic retry. Canonical evidence lives under `.runtime/output/perf/p2-2a-williams-live-20260712-rerun02/`: raw manifest SHA256 `d9f4c89f01d01d661f38ac81a42ffa71d762842c2dd93d6a4e17ceba1f074b60`; analysis JSON `0c6c229bbfbc7b4df91b0810284aca4ece989e02ad27604deca738adfca4e799`; analysis Markdown `f3a4160887f3a794ad987b06526b029628fc97657ac4e14d0dcae21a4aaab31e`; execute log `3920a243e777a193cba68caade0f2ddc8834d18a74d0b02db9a0c5c6a1f7757d`; block cleanup `36a6a103e42574e5d837cf559ab20239fd682688331565353eb159e5bcc6e191`; Job evidence `f0a99b36f74f5bff07b3dae95710141442f0b40745eb84ad7377d5bc728ed586`.

Final cleanup removed both temporary `node_modules` junctions and detached measurement worktrees, pruned registrations, confirmed no listeners on 8000/8892, and found no rerun02 task processes. The remaining worktree list contains only the dirty parent checkout and the P2 isolated branch. `cleanup-final.json` captured 48 parent WIP entries at experiment cleanup. A later read-only snapshot contains 57 entries (52 deletions and 5 modifications) from unrelated parent work; P2 has kept the parent checkout untouched. Final cleanup and evidence indexes are `cleanup-final.json` and `canonical-evidence.json` beside the reports.

## Historical Williams telemetry-v2 repair lane 2026-07-12

The root integration agent owned the completed focused Windows WMI telemetry test and governed rerun03. Focused command logs remain under `.runtime/tests/renderer-frame-orchestration-p2-20260710/williams-telemetry-v2/`; rerun03 remains immutable under `.runtime/output/perf/p2-2a-williams-live-20260712-rerun03/`. The current live-process owner is `none`; the next authorized live lane is one fresh governed rerun04 after the telemetry-v3 checkpoint and clean-head core gate.

The repair keeps rerun02 immutable. It introduces policy `p2-williams-crossover-v2`, telemetry window schema 2, monotonic fixed-rate scheduling, actual capture-start timestamps, completion/duration/lag fields, and Job Object cleanup authority. Ambient browser PID churn remains a diagnostic. The 1000 +/- 250ms capture-start interval stays the admission gate; schedule lag stays diagnostic.

## Williams governed rerun03 terminal record and telemetry-v3 repair 2026-07-12

Rerun03 used candidate `2e05d5a8e7beae2c2200f6d4f3ffdc19e8df16a9`, control `ab86b1e24d161edbe6bcc80acb0b316e4bf81942`, and matching package-lock Git blob `df70020f2f930d5692a1ff9febebf86dbb0e0db1`. The live owner issued one dry plan and exactly one execute command. Block-01/control completed with valid telemetry, four raw measurements, and valid Job Object cleanup. Block-02/candidate then failed before workload admission: its first governed CIM capture lasted `3617.4604ms`; the absolute-target loop caught up with capture-start intervals `[3621,629,637,654]ms` and schedule lags `[31.9,2652.9,2281.0,1919.3,1572.8]ms`. The quiet gate rejected `telemetry.samples.interval`, the analyzer returned `invalid-experiment / exit 3`, and no retry was issued.

Rerun03 remains byte-preserved under `.runtime/output/perf/p2-2a-williams-live-20260712-rerun03/`. Canonical SHA256 values: execute log `4622a91609f260aef829681d4950fd42a0639bf3fdd8089b0dc16a01a7639d99`; execute exit file `24ba1e99dc06b19351323aae0d7370243d586475a634b7f6ff7927fbc72cfaed`; analysis JSON `c5e61eef6fdc8a567b1a73f9c1d840930c51d622cbbae47c1ffbfa43a372d6bd`; analysis Markdown `90697fe456ffb603732775ccb0cfec972e7d33176b4a5db8a5bd0bdc2f1cc414`; raw manifest `ede91623f669e684f57e64683f5b547027d3185534e1470b897073eb1bb5c6e4`; block-02 pre telemetry `a5ffb5ab5cde02be5fc32f04b0f8b26e622f6a50b7358358e12a25da7b51f37`; block-02 quiet window `391fa24aee7f5f42e255d48107600c3de867cce57bbfc705ec67a43bccef6dd0`.

Three independent static analyses agreed on the minimum protocol repair: every telemetry window performs exactly one same-counter priming capture before the sampling stopwatch; priming evidence is explicit and excluded from admission aggregates; the five governed samples retain the 1000 +/- 250ms capture-start contract. The policy identity rotates to `p2-williams-crossover-v3` and telemetry schema 3. Governed measured samples also fail closed when `captureDurationMs > 1250` or `abs(scheduleLagMs) > 250`, covering a final-sample stall that lacks a following interval. The implementation retains fixed absolute targets and existing interval admission; it adds no tolerance increase, sample discard, dynamic retry, or alternate fallback.

TDD evidence is green: governance 33/33; default Job runner 10 pass plus one explicit live skip. The root-owned explicit live lane collected two successive fresh telemetry windows and passed 2/2 in 18.903 seconds. Each window records one complete excluded priming capture, five governed samples, priming-to-first interval within 750-1250ms, all measured capture-start intervals within 750-1250ms, capture durations at or below 1250ms, and absolute schedule lag at or below 250ms. Rerun04 is the sole next experiment authorization after the telemetry-v3 functional checkpoint, clean-head core verification, and three independent final reviews. It must use fresh detached candidate/control worktrees, a unique evidence root, one dry plan, one execute, and zero automatic retry. P2.2b admission still requires a complete `accepted / exit 0` analyzer result.

Final implementation review is complete. The architecture review returned `CLEAR / APPROVE`; the code review returned `CLEAR` after adding occurrence-count assertions for the single counter reader, single priming call site, and single measured-loop call site; the evidence review returned `CLEAR` after this historical-lane wording and the rerun03 terminal task record were corrected. Focused and shared validation is green with adaptive selection `7 changed / 16 recommended / 3 main-thread / 0 unmatched`. A future hardening item may cross-check timestamp deltas against `captureDurationMs`; the current frozen runtime identity and live two-window evidence leave no present admission blocker.

Telemetry-v3 is committed at `26b1115cc3fe1e66200661e195a4c5abbf4d4c05`. Clean-head `verify:core` passed 66/66; its report SHA256 is `0639ee7c346a133b1219b8e6ae868df080f522cd2034e33bc63b50f0f9357fb3`. The terminal rerun03 detached worktrees were clean, their `node_modules` junctions targeted the isolated P2 dependency tree, and both worktrees were removed and pruned after recovery identities were recorded. The local worktree list now contains only the preserved dirty parent checkout and the P2 integration worktree. Rerun04 may now proceed through fresh detached paths and a unique evidence root.

## Williams governed rerun04 preflight 2026-07-12

Rerun04 now has exact detached worktrees at candidate `26b1115cc3fe1e66200661e195a4c5abbf4d4c05` and control `ab86b1e24d161edbe6bcc80acb0b316e4bf81942`. Both sides are tracked-clean, share package-lock Git blob `df70020f2f930d5692a1ff9febebf86dbb0e0db1`, and use ignored `node_modules` junctions targeting the P2 integration dependency tree. The first control inspection caught Git's transient `locked initializing` state while checkout was still completing. A later process, worktree-metadata, index, HEAD, and status inspection confirmed normal completion; the lock cleared and no repair mutation was needed.

Root remains the sole live-process owner. The unique evidence root is `.runtime/output/perf/p2-2a-williams-live-20260712-rerun04/`. The next steps are one dry plan, mechanical preregistration validation, and exactly one execute with zero automatic retry. P2.2b remains closed until all eight Williams blocks complete and the analyzer returns `accepted / exit 0`.

The sole dry plan completed with exit `0`. It froze policy `p2-williams-crossover-v3`, telemetry schema `3`, one `excluded-warmup` priming capture per pre/post window, eight Williams blocks in `A/TH, B/TH, B/HT, A/HT, B/TH, A/TH, A/HT, B/HT` order, one warmup per scenario, two measured runs per scenario, and 32 measured raw files. The dry-plan JSON SHA256 is `e486b198be5011a266c0b67d45f449724eb3416b31b528042fcc764523e528c3`; the clean pre-execute snapshot SHA256 is `682b909663fc241407f8d252bac69ef5a15b3ab8e0d3752fe15f4e60ba9d8f31`. Raw and report outputs remain uncreated. Root now owns exactly one execute invocation and zero automatic retries.

## Williams governed rerun04 terminal record and conditional P2.2b entry 2026-07-12

Root issued the authorized execute command exactly once and issued no retry. All eight Williams blocks completed with runner exit `0`; all eight block cleanup records and Windows Job Object records are valid with empty `remainingPids` and `unverifiedPids`; the raw manifest validates 115 entries and all 32 measured raw files. The analyzer returned `invalid-experiment / exit 3`, `admitted=false`, and no regression list. This terminal result supplies no acceptance, regression, equivalence, improvement, or slowdown conclusion.

The eight preregistered invalid reasons are: pre-block CPU averages `26.2%`, `31.2%`, `27.6%`, and `30.4%` for blocks 02, 03, 06, and 08 against the `25%` ceiling; adjacent-pair performance-adjusted frequency differences `9.580838323353298%` and `8.290155440414502%` for pairs 01-02 and 05-06 against the `5%` ceiling; global pre-frequency drift `15.568862275449089%` against the `10%` ceiling; and block-06 post sample 5 capture duration `1334.4013ms` against the `1250ms` ceiling. The four primary paired point estimates remain diagnostic-only because environment admission failed.

Canonical evidence remains under `.runtime/output/perf/p2-2a-williams-live-20260712-rerun04/`. SHA256 values: execute log `6e9575ef94d1685355a4c624e36d7e728d2371dcc4314d074613a1007d46f29a`; execute exit `24ba1e99dc06b19351323aae0d7370243d586475a634b7f6ff7927fbc72cfaed`; analysis JSON `aa24701dbb7efcc1a184e52eb85a5f222f8124b4d4516e2ae7b1a51d7273bada`; analysis Markdown `d6bcf67309fb19cda24143089c4051cb0b4834d91bdc15b6d66984c55de2752c`; raw manifest `484e6866b86217ebf61127b19dd92efee767a27fe4ae1e2abdb59ce545c765f4`; preregistration `45978565c603b50a04801d3a6b03611a66af0e23d7504f32bbf74bea5eff2da4`; canonical index `35cda7dfd189b9a6dd7595bbbb9a6df6d67ecaf0e5b8afb4aada0d728cd33251`; cleanup index `8f5d8e4188572cbc3d65ea68330b36104cd21547517b237271700e3f07d2525d`.

Cleanup is complete. Both dependency junctions were verified as reparse points targeting the isolated P2 dependency tree before removal. Both detached measurement worktrees were clean at their exact commits before `git worktree remove`; worktree metadata was pruned. All task Job PIDs are absent, ports 8000/8892 have no listeners, and the remaining worktrees are the preserved dirty parent plus this isolated P2 lane. The parent remains at `db8bd6c1` with 57 unrelated status entries and was untouched.

Three independent read-only reviews agree that rerun04 is trustworthy terminal invalid evidence and cannot open the performance gate. The evidence audit verified 115/115 manifest hashes, 32/32 raw files, 8/8 block identities, 16/16 telemetry windows, and complete cleanup. The statistics review prohibits post-hoc threshold changes, sample/block exclusion, and performance inference. The architecture review authorizes a reversible `P2.2b-G` isolated implementation entry while retaining the original integration gate. P2.2b may now migrate only `composeTransformedFrameToBuffer` and `drawTransformedFrameFromCaches` in an isolated recovery branch; main integration and P2 closeout require a fresh complete Williams result with `accepted / exit 0`.

## P2.2b isolated implementation checkpoint 2026-07-12

The canonical import-free owner `js/core/map_renderer/transformed_frame_compositor_owner.js` now owns only `composeTransformedFrameToBuffer()` and `drawTransformedFrameFromCaches()`. `map_renderer.js` keeps the singleton wiring, all runtime/cache writes, interaction-composite construction, pass drawing, stable wrappers, public facade, and RendererRuntimeContext boundary. The rejection-reason effect accepts only the reason; the composition root resolves and mutates the current render cache.

Focused verification is green: transformed owner 15/15, P53 inventory 13/13 after generated mirror sync, Python compositor boundary 5/5, scenario chunk contracts 57/57, architecture boundary, state-write allowlist with 115 tracked files, metadata 16/16, core-runner behavior 8/8, import graph 51 specs, route schema 302, supervisor contracts/routing 12/12 + 4/4, supervisor plan 15/15, and diff check. The adaptive dry-run reports 15 changed files, 201 recommended commands, and zero unmatched files. `verify:pages-dist` exits 0 with startup shell 47/47, landing 18/18, sample contracts 17/17, and a 927.18 MiB generated distribution. Log: `.runtime/reports/generated/p2-2b-verify-pages-dist-final.log`.

The next checkpoint is a Lore functional commit followed by clean-head `verify:dist-drift`, `verify:core`, main-thread/browser matrix, and `perf:gate`. Three fresh final static reviews follow those gates. Main integration and P2 closeout remain gated on one fresh post-change Williams result with `accepted / exit 0` under a unique preregistration/evidence root.

## P2.2b clean-head deterministic gate and live-process ownership 2026-07-12

The functional owner landed at `9321680a`; a follow-up contract alignment landed at `a2d8a66b`. The first clean-head `verify:core` exposed a stale interaction-border source scan that still searched the thin `map_renderer.js` wrapper. The contract now follows the canonical transformed compositor owner, keeps composition-root effect-injection assertions, and adds the successful snapshot path through labels-last and post-scope blit. Focused owner, Python, routing, selector, and route-schema checks are green.

Clean-head `verify:core` at `a2d8a66b` passed all 67 commands. Log: `.runtime/reports/generated/p2-2b-clean-verify-core-rerun.log`; structured report: `.runtime/reports/generated/verify-core.json`.

Root integration agent is the sole live-process owner for the remaining serialized acceptance lane. The reserved sequence is `verify:core:main-thread`, scenario resilience, physical-layer runtime contract, TNO contracts, water rendering, city rendering, `perf:gate`, then one fresh Williams crossover plan and execute. Each command receives a separate log under `.runtime/reports/generated/`; other agents are restricted to static review of committed source and completed artifacts. No automatic retry is authorized for the Williams experiment.

## City browser matrix diagnosis and repair lane 2026-07-12

The clean-head main-thread gate passed 71/71. Scenario resilience passed 3/3, physical-layer runtime passed 1/1, TNO contracts passed 2/2, and water rendering passed 12/12. City rendering exposed two failures. A detached `origin/main@17aeedf5` control worktree reproduced both failures unchanged, so neither failure was introduced by P2.

The city-points runtime spec still referenced retired Appearance tab IDs from before `c96af211`; the current canonical targets are `appearanceTabCityPoints` / `appearancePanelCityPoints` and `mapContentTabDayNight` / `appearancePanelDayNight`. The city marker pixel regression exposed two `labels` branches in `getRenderPassSignature()`: the reachable branch omitted normalized city style while the later city-style branch was unreachable. Existing deterministic contracts now require one labels signature branch with HGO, blank-label, revision, color, and normalized city-style inputs. The duplicate branch is merged at the composition root, and the E2E spec uses current panel IDs.

Root remains the sole live-process owner. The next serialized command runs the two repaired city specs from the P2 worktree, writing `.runtime/reports/generated/p2-2b-city-targeted-rerun.*.log`; static subagents may inspect committed source and completed artifacts only. After targeted green, root will run the full city suite once, then continue to `perf:gate` and the single governed Williams experiment.

## City browser matrix repair acceptance 2026-07-12

The repaired targeted matrix passed 2/2. `city_points_urban_runtime.spec.js` exercised the canonical city-points and day/night tabs with zero console or network issues. `city_urban_rendering_regression.spec.js` recorded `markerScaleDiff=444`, `cityPointDiff=459`, `lightsDiff=489`, zero page errors, zero console issues, and zero network failures. Logs: `.runtime/reports/generated/p2-2b-city-targeted-rerun.stdout.log` and `.runtime/reports/generated/p2-2b-city-targeted-rerun.stderr.log`.

The complete `npm run test:e2e:city-rendering` lane then passed 8/8 in 3.6 minutes. Its marker-scale check recorded `markerScaleDiff=444`; all city-label, city-light, reveal-plan, urban, and marker-visibility checks passed. Log: `.runtime/reports/generated/p2-2b-city-rendering-final.stdout.log`. The final renderer size is 23,269 lines by the architecture checker's counting convention, with the architecture ceiling reduced from 23,280 to 23,269. Root now owns the canonical Pages mirror sync; performance lanes remain serialized after the city repair commit.

## Williams governed rerun05 terminal record 2026-07-12

Rerun05 used exact detached candidate `3bbf46ec0fd5dec62d719b1aae31c8b0ef5792b7` and control `ab86b1e24d161edbe6bcc80acb0b316e4bf81942`. Both worktrees were tracked-clean, shared package-lock Git blob `df70020f2f930d5692a1ff9febebf86dbb0e0db1`, shared baseline-runner Git blob `70453d9b`, and shared role-policy-v1 Git blob `c66fe181`. The sole dry plan exited `0` and froze eight Williams blocks plus 32 expected measured raw files. Root issued exactly one execute command and issued zero retries.

Block-01/control completed three valid TNO lifecycle samples with contiguous sequences `1,2,3`; the third sample was the unique final post-promotion idle scenario frame. The frozen v1 role contract required exactly two samples, so it rejected the observed lifecycle on `declared-sample-count`, `sample-array-count`, and `sample-sequence`. The block inner runner exited `1`; the outer analyzer classified the evidence package as `invalid-experiment / exit 3`. Candidate produced zero measurements, so rerun05 supplies no acceptance, regression, equivalence, improvement, or slowdown conclusion.

Rerun05 remains immutable under `.runtime/output/perf/p2-2b-williams-postchange-20260712-rerun05/`. Canonical SHA256 values: raw manifest `3f5e1902c8910f19bce07b0a274c60ae60245ce3fe58781525221cb9146939ed`; analysis JSON `0ec23cfeac7f9f2dda0cced3cb4292cdbace1b600f6a6fbc1a31f8001c787c89`; analysis Markdown `908193d2c9fc4e85b6a3c9bf58b4d2575a7d12793285815ca1bed9ec4846e1c4`; dry-plan log `fe6cb0d1c846f54b40874f1fdb561e169d564af7d557bfcdac8185a936b6d20f`; execute log `67d0ffc7ab373aa270e12e8189a70cbcf8a94de8ac14d41a89c807a6e9b7d102`. The evidence package contains 17 validated manifest entries and 4 raw files because the fail-closed role check stopped before the remaining blocks. Job containment, cleanup, quiet telemetry, and the completed control identity remain valid.

## Render-sample role v2 and Williams v4 repair 2026-07-12

The reproduced failure supports one strict protocol correction: declared count must equal the actual sample array length; the array must contain at least two samples; sequences must be contiguous `1..N`; the canonical sample must be unique and last; every preceding sample must have a finite timestamp before chunk promotion. Scenario, idle phase, progressive-background, positive scenario-context, post-promotion, and duration contracts remain unchanged. Policy identities rotate to `render-sample-role-v2` and `p2-williams-crossover-v4`, so v1/v3 preregistration and raw evidence fail closed.

The first TDD run accepted the three-sample fixture only after the v2 implementation. Focused GREEN is render-role `23/23`, Williams governance `34/34`, and Python perf contract `23/23`. Tests also reject a single sample, declared-count drift, array-count drift, sequence gaps/duplicates, a non-unique or non-final canonical sample, and a post-promotion noncanonical intermediate frame. Dynamic sequence/timestamp evidence is frozen. The historical governed companion uses the new v2 report identity and output path while preserving the earlier v1 report files byte-for-byte. Independent code and governance reviews returned `CLEAR`; rerun06 remains gated on a committed candidate checkpoint, a control overlay containing only the v2 role policy, exact dual-side blob checks, fresh detached worktrees, a unique evidence root, one dry plan, one execute, and an `accepted / exit 0` analyzer result.

## Williams governed rerun06 terminal record and rerun07 authorization 2026-07-12

Rerun06 used candidate `9479e9e6ff8d4b2fa8ba969fdc7b7e2f341d2d40`
and control `bd98c5800ac5cca2a93d7f55ac1b0a254ca5028f` under policy
`p2-williams-crossover-v4` and role policy `render-sample-role-v2`. Root issued
one dry plan, one execute, and zero retries. All eight blocks completed with
valid Job cleanup; 32 measured raw files and all 115 manifest entries validate.

The analyzer returned `invalid-experiment / exit 3`, `admitted=false`,
`regressions=[]`. Invalid reasons are adjacent-pair pre-frequency differences
of `15.625%` and `9.271523%`, global pre-frequency drift `35.036496%`, a block-02
TNO startup outlier ratio `1.260172` with `1692ms` spread, and B-TH blocks 02/05
TNO startup drift `12.234332%`. The four primary estimates remain diagnostic.
Canonical hashes and the fixed final-repeat contract live in
`rerun07-final-repeat-governance.md`.

Three independent read-only reviews found the evidence complete, the
calculations and identities correct, and the result terminal invalid. They
authorized exactly one final capped rerun07 under a temporary standard Windows
High performance scheme, a fixed 120-second quiet interval, fresh detached
worktrees, one dry plan, one execute, and zero retry. Exit `0` opens P2 closeout;
exit `2`, `3`, or `1` ends the P2 acceptance lane under its recorded terminal
classification. Rerun07 receives no repetition.
