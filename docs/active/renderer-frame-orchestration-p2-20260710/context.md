# Scenario Forge P2 Renderer Frame Orchestration Context

Date: 2026-07-10

## Repository facts

- worktree path: `C:\Users\raede\.codex\worktrees\mapcreator-renderer-frame-orchestration-p2-20260710`
- base branch: `origin/main`
- base commit / clean baseline HEAD: `b14165c0e693a87872361b87ac78dc31cd7a0155`
- current pre-P2 Windows perf readiness functional commit: `61e090388feb0c69887b9947b55b61968d5324de`
- current P2.1 functional Lore commit: `cc6477e0111568091a8665f76fa13d1083c67426`
- current task phase: P2.2a cached-pass compositor implementation complete; clean-head deterministic/dist evidence pending
- current acceptance test-contract commit: `427e68398a67586ef4a330b5304dfde567da917e`
- current worktree state: isolated P2 branch has the P2.2a functional slice staged in the working tree from clean HEAD `ab86b1e24d161edbe6bcc80acb0b316e4bf81942`; parent WIP remains untouched
- release residue worktree: removed/no longer registered on 2026-07-11; recovery evidence remains commit `b14165c0e693a87872361b87ac78dc31cd7a0155`
- P1 isolated worktree: removed
- P1 recovery branch: `origin/codex/renderer-runtime-context-p1-remaining-20260709@e102a70a`
- parent checkout: `C:\Users\raede\Desktop\dev\mapcreator`, `main@db8bd6c118d158aaed4dd6734ecdd981fe80f326`, `0 ahead / 17 behind origin/main@17aeedf`, with 43 `docs/archive/**` deletions and modified `README.zh-CN.md`, `dist/app.js`, `dist/pages-dist-manifest.json`, `landing/app.js`, `lessons learned.md`

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
- main-thread evidence: remains the prior `f5f27d3f` evidence; this closeout did not rerun main-thread
- perf baseline: red at `61e090388feb0c69887b9947b55b61968d5324de`; readiness green, threshold acceptance blocked
- clean-head `npm run verify:core` exited 0 from `.runtime/tests/renderer-frame-orchestration-p2-20260710/perf-readiness/post-commit/01-verify-core.log`; main-thread evidence remains the prior `f5f27d3f` evidence; browser regressions, physical-layer runtime contract, scenario resilience, and any further perf investigation remain separate lanes

## Current phase ledger

- P2.0 docs-only truth reconciliation: complete at `6cd077bd3a732d3bebae0ba84c4dc09dbca462d4`
- Pre-P2 test-only repair: committed at `28bda618`; static checks complete; focused browser baseline refreshed at 2/5 and identified a production disclosure race
- Pre-P2 production disclosure race repair: committed at `f5f27d3fe3dc2a928b6de453b2883a3c766daf21`; its Lore trailer records post-commit browser/main-thread/perf baseline as `Not-tested`
- Pre-P2 Windows perf readiness fix: complete at `61e090388feb0c69887b9947b55b61968d5324de`; readiness/PID ownership is green and perf gate reached measurement
- Clean baseline: perf measurement completed and gate is red on April-baseline thresholds
- P2.1 draw canvas orchestration owner: committed at `cc6477e0111568091a8665f76fa13d1083c67426`; clean-head dist/core verification is green; waiver authorizes separate P2.1 acceptance only
- P2.2a cached pass compositor owner: implementation and pre-commit focused/Pages validation complete; functional Lore commit and clean-head gates pending
- P2.2b transformed frame compositor owner: pending
- Review / UltraQA: pending
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

Future baseline/gate reports use schema version 2 and expose both `canonicalRenderSampleMs` and the legacy median diagnostic. The April schema-version-1 baseline and historical `1.15/1.25` thresholds remain compatible and frozen. Governed scenario role mismatch fails closed. P2.2a and P2.2b must repeat the same policy, A1/B1/B2/A2 order, three warmups, five measured runs, startup `3% + 75ms`, render `5% + 35ms`, and block drift `5%/10%`.

## Governed tooling deterministic closeout 2026-07-11

Functional Lore commit `14878c78937f36f9ddee53a876521494a2214cbb` contains the policy, runner schema, offline analyzer, focused tests, metadata route, and documentation. Clean-head `verify:dist-drift` exited 0 and full `verify:core` passed 62/62; logs are `.runtime/tests/renderer-frame-orchestration-p2-20260710/perf-role-governance-14878c78/01-verify-dist-drift.log` and `02-verify-core.log`.

The offline analyzer was rerun after the gates and reproduced the governed JSON SHA256 `6f76b274a7827c1c6b7baac68508e40dbafb521206cdc85c1e06c03c42790245` and Markdown SHA256 `bed108df85b38aaf803287b3354332e0023868235767aea7500c5bad88d52305`. The source legacy report remained byte-identical at SHA256 `f601896f26478ae9e023d97d0193e281cb8a0c3931fdcd8fa4bccebe03f4d839`. This deterministic tooling slice used the already captured and validated 40-run evidence set; browser, dev server, Playwright, and live performance execution remain assigned to the later single-owner acceptance lane. P2.2a is ready under the pre-registered governed protocol.

## P2.2a cached-pass compositor implementation 2026-07-11

Starting clean HEAD: `ab86b1e24d161edbe6bcc80acb0b316e4bf81942`. Current `origin/main@17aeedf5b295d08fe08965fa5d6f89b0dfb6426c` is an ancestor of this branch; the isolated lane was ahead 19 / behind 0 before edits. The dirty parent checkout remained read-only.

The new import-free owner `js/core/renderer/cached_pass_compositor_owner.js` owns only `drawTransformedPass()` and `composeRenderPassesToTarget()`. `map_renderer.js` keeps the singleton, dependency wiring, diagnostics write effect, stable wrappers, export call path, and every P2.2b/adjacent algorithm. Dynamic target context is resolved per draw. The original transform/DPR/layout math, require-all canvas-before-reference preflight, result schema, non-required direct path, and success return remain locked by behavior tests.

Delivery package before the functional commit:

1. Core: `js/core/map_renderer.js`, new cached-pass owner, generated source mirrors, and Pages manifest.
2. Tests/contracts: named owner behavior, combined Python frame-compositor boundary, P53 inventory, scenario source scans, Pages startup, verification metadata, and core-runner fixtures.
3. Tooling/docs: architecture checker, verification domains, package scripts, P2.2a implementation record, registry, context, and task ledger.
4. Diff/size: `map_renderer.js` 23,437 -> 23,376 split lines, net -61; cached owner 170 split lines; cumulative P2 extraction is 96 lines after P2.1 + P2.2a.
5. Validation: owner 8/8, Python boundary 4/4, scenario 57/57, metadata 15/15, architecture green, Pages startup 47/47, landing 18/18, sample 17/17, and P53 11/11 after generation. Source/dist blobs match for renderer and cached owner.

Pre-commit P51/P52 inventory checks report generated `dist/**` as modified because those historical tests assert a clean dist diff against HEAD. Their owner behavior tests remain green. The functional commit is the intended boundary for their clean-head rerun. Browser, main-thread, Playwright, and performance acceptance stay with the separate single-owner lane.
