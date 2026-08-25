# Test Verification Reform Task

## Current status

The initial runner reform plus Stage 6A proof reuse, Stage 6B exact evidence reuse, Stage 6C strict command closure, and Stage 6H analysis-owned scanner preparation are committed on the working branch. Stages 6D, 6E, and 6G passed short correctness review but failed frozen wall-clock gates and were reverted. Stage 6H passed independent review, short behavior gates, and paired old/new scaling; its end-to-end policy admission remains open because current-machine long-run timing drifted materially from the historical baseline. Stage 6J-C/J2b was already present in committed code as `fccef91b` and passed the Phase 0 Windows closeout at coordination baseline `9869698d`; production and regression sources required no additional patch.

## Checklist

- [x] Add shared Git verification identity and atomic checkpoint utilities.
- [x] Add `verify:core` same-tree and changed-tree resume with SF-ATS invalidation.
- [x] Add timing/checkpoint/resume support to P4 phase verification.
- [x] Add per-command timing and atomic checkpoint reporting to adaptive and supervisor execution paths.
- [x] Add focused runner regression coverage.
- [x] Reduce repeated state-writer full repository scans inside the manifest suite.
- [x] Share the exact current-phase policy rebuild across read-only manifest assertions.
- [x] Audit and correct expensive/overlapping verification metadata entries.
- [x] Add quick and focused P4 policy runner modes with isolated TAP outputs.
- [x] Collapse covered commands for P4 exact phases, TNO coverage chain, and Pages verification.
- [x] Run SF-ATS dry-run and targeted validation.
- [x] Complete independent fail-closed and compatibility review.
- [x] Stage 6A: admit the derived-proof cache candidate from Hotspot A.
- [x] Stage 6B: authorize and admit cross-process evidence reuse after Stage 6A.
- [x] Stage 6C: authorize and admit measured test-portfolio reform after Stages 6A and 6B.
- [x] Stage 6D: evaluate explicit shared-readonly repository scan results and reject the candidate on frozen wall-clock evidence.
- [x] Stage 6E: evaluate batched action non-target parameter scans and reject the candidate on frozen wall-clock evidence.
- [x] Stage 6F: profile single-binding versus multi-binding scanner complexity and select the next bounded optimization.
- [x] Stage 6G: evaluate one-process historical Git source prefetch and reject it on the frozen full-policy wall-clock gate.
- [x] Stage 6H: cache source-analysis-owned scanner preparation and retain independent per-binding analysis.
- [x] Stage 6I: add explicit official-runner admission to the policy manifest.
- [x] Stage 6J-A: add observable partial progress to the policy runner with atomic final evidence.
- [x] Stage 6J-B / J2a: extract the Williams-compatible shared Job Object core and exact source-set identity.
- [x] Stage 6J-C / J2b: add parent-death/control semantics and P4 verified descendant cleanup.
- [ ] Freeze candidate and run the remaining full admission gates once.

## 2026-08-20 coordinated phase 0-3 delivery

- [x] Read and freeze the source diagnosis and phase contracts from the user-designated Edge tab.
- [x] Recheck root ownership: `main@9a5b25c6`, `origin/main@7ddcee0d`, parent checkout ahead 46 with unrelated scenario/UI WIP preserved.
- [x] Phase 0 delivery: current-state audit, bounded J2b implementation, regression coverage, adaptive selection, Windows integration evidence, and ready-for-integration commit.
- [x] Phase 1 delivery: current-state audit, minimal stable profiling output, regression coverage, adaptive selection, and ready-for-integration commit.
- [x] Phase 2 delivery: current-state audit of the already-adaptive workflow, remaining selector execution repair, fail-closed regression coverage, adaptive selection, and ready-for-integration commit or evidence-backed no-op.
- [x] Phase 3 delivery: canonical leaf expansion/deduplication boundary, duplicate/cycle/unresolved regressions, adaptive selection, and ready-for-integration commit.
- [ ] Independent audit of each exact delivery and their ordered combined diff.
- [ ] Ordered integration, targeted verification, SF-ATS selector dry-run, authorized push, registry/task closeout, and final remote-state report.

Phase workers own only their isolated worktrees and local commits. The final integration task owns merge/cherry-pick choice, target refs, push, shared `.runtime` outputs, long checks, and worktree cleanup.

### Combined-candidate local closeout

- [x] Cherry-pick the eight phase deliveries in the authorized order from exact base `9869698da5331e9afcc961f42b4666469abe6c46`.
- [x] Commit A authority/catalog/parser sealing as `f623bf0e17801720de4a810a96ab9cf36b4529ae`.
- [x] Commit B direct Phase 2 -> Phase 3 final-plan wiring as `9c96ec6b0f67d8ecf9289e66c15fa8a4483543b0`.
- [x] Commit C canonical execution profile projection as `6a0b5eedb36b73190d162e6bc7f7ef91ffed039b`.
- [x] Close mutually exclusive disposition overlap while retaining lane-local uniqueness as `3d92d8752deec85558191f7b63cb5a0f6d4f2aa7`.
- [x] Refresh the authorized structural authority fixture as D `f50e557283a3e276a4f5f8a945ffbb2642441deb`.
- [x] Run the 12 combined mechanical acceptance areas through focused behavior regressions plus the exact 16-file real selector and adaptive plan.
- [x] Run the exact 16-file child-safe plan to terminal success under one `.runtime` owner.
- [x] Record the independent `a244c59e` review as `REQUEST CHANGES / BLOCK` for the PR-fast selector artifact handoff.
- [x] Bind selector CLI artifacts through the shared repository catalog helper as E `be28f8744ccbc5ba5c7b661f47788a3beeb11889`.
- [x] Run the exact 16-file selector -> `--selection-json` dry-run and child-safe execution to terminal success under one `.runtime` owner.
- [ ] Run final Stage 5b/full P4/browser/performance/scenario-data/Pages generation admission under the designated final integration or CI owner.
- [x] Obtain `APPROVE / CLEAR TO INTEGRATE` from the independent exact-head review of combined candidate `e602cf4fb1bb68b5692e58f8a8151223349b4135`, with zero findings at all severities.

## Validation evidence

| Command or check | Result |
| --- | --- |
| Exact process-tree inspection and termination | Repeated core/policy tree stopped; remaining target PIDs = 0. |
| Read-only current runner audit | Core/adaptive lack identity and resume; P4 has identity/checkpoint; supervisor has timing. |
| Existing state-writer TAP timing parse | Old baseline 6,139,150.8 ms; optimized full run 3,662,093.7 ms (341/341, exit 0), a 40.3% reduction. Top six still consumed 98.2%; a three-hotspot immutable-snapshot experiment took 2,556,448.9 ms and showed historical derived-alias proof replay remains dominant, so the experiment was reverted. |
| Shared exact current-phase rebuild | Focused pair passed 2/2 in 1,059,110.9 ms. The canonical rebuild consumed 1,058,830.9 ms; the second ledger assertion reused it in 0.8 ms. The two tests now issue one exact rebuild instead of three while retaining full-object and ledger equality against the checked-in policy. Independent review: `CLEAR`. |
| Post-deduplication short gates | P4 quick 217/217 in 2,372.7 ms; core runner 22/22 in 1,938.0 ms; route schema check passed for 363 routes. |
| Core/P4 resume and checkpoint regression | Final bounded matrix 89/89; exact resume, changed-tree suffix invalidation, two-hop SF-ATS reuse, per-command/final identity binding, atomic replacement, dirty/unmatched/plan fail-closed all passed. |
| P4 quick runner | 217/217 passed; Node test duration 2,708.7 ms; isolated quick TAP written. |
| P4 focused cache regression | 1/1 passed; Node test duration 226.6 ms; isolated focused TAP written. |
| Metadata behavior before/after batching | 29/29 passed; observed duration reduced from 21,133.0 ms to 8,802.4 ms in this session. |
| Supervisor/adaptive checkpoint and supersession tests | Running/terminal checkpoints, duration fields, route-gap zero-execution, and composite command collapse passed. |
| TNO multi-report unit regression | Repeated output paths produced byte-equal JSON; legacy string arg remained accepted. |
| Core list smoke | schema 2 report written with 87 commands and one Pages admission command (`verify:pages-dist-and-drift`). |
| SF-ATS final dry-run | 29 changed files; 229 recommendations; 213 planned child-safe commands; 15 blocked main-thread commands; unmatched changed files = 0. |
| SF-ATS follow-up dry-run | The final two-file diff selected four commands: two child-safe commands passed and two full P4 main-thread commands remain reserved for frozen-candidate admission; unmatched changed files = 0. |
| Pages route structural regression | 1/1 Python selector contract passed; generation and admission composite each contain one builder call. |
| Independent diff review | Three initial findings plus multi-hop provenance findings fixed; final verdict `FINAL_REVIEW_CLEAR`. |
| Stage 6A historical proof reuse | Integrated as `13f4849`; exact identity binds source, paths, phase, taint mode, checkpoints, algorithm version, and previous/current policy hashes. Root rerun passed focused 6/6, batch/soundness 29/29, 363 routes, three syntax checks, SF-ATS unmatched 0, and diff check. |
| Stage 6B read-only design | Core plus P4.3 exact exposes about 11 repository-scale scan roots. B1 targets exact clean-tree checker evidence for Python boundaries, directionally `11 -> 4`, while retaining live full policy TAP and P4 direct checkers. |
| Stage 6B exact policy evidence | Integrated as `f6310175`. Evidence binds explicit untracked-aware clean SHA/tree identity, canonical phase and checker plan, policy/config/checkpoint identity, report bytes and producer provenance. Create/validate use start/end identity fences; each Core/P4/direct/standalone invocation owns one live-fallback attempt. Root rerun passed Node 63/63, Python 3/3, route schema 363, syntax/diff checks, and SF-ATS with 11 changed files / 0 route gaps. Full TAP and every P4 direct checker remain live. |
| Stage 6C read-only portfolio audit | Current Core closure is 87 top-level / 103 leaf / 70 Node / 20 Python processes. Strict command-closure supersession projects 80 top-level / 95 leaf / 62 Node / 20 Python with identical Node test-file coverage. |
| Stage 6C strict command closure | Integrated as `0df8698c`. Core now lists 80 commands and seven durable supersession records; mechanical closure is 95 leaf / 62 Node / 20 Python while the unique Node test-file set remains 103/103. Cycle and unresolved provenance fail closed. Root rerun passed Core 34/34, metadata 29/29, supervisor contracts/routing 18/18, supervisor plan 17/17, route schema 363, list 80/7/0/0, and SF-ATS with five changed files / zero route gaps. |
| SC phase 0-3 wiring regressions | `node --test` for profile/core/metadata/portfolio passed 142/142. The suite covers forged authority zero-spawn, prepared catalog build once, one planner call per disposition, canonical analyzer calls zero, schema/kind reseal drift, required-field deletion, CR/LF/CRLF rejection, Windows identity/conflict behavior, Pages topology, batching/isolation, observer faults, pre-spawn, ENOENT, and lifecycle evidence. |
| Structural authority fixture | `npm run -s python -- -m unittest tests.test_e2e_structural_tooling -q` passed 48/48 after the authorized fixture received the current required authority fields. Production missing-field behavior remains fail closed. |
| Independent final review at `a244c59e` | Review `01a01fa5-f27a-7553-8385-9427313b6f43` returned `REQUEST CHANGES / BLOCK`: standalone selector CLI output had selector-only authority and omitted catalog digest, source identity, and root set, while the workflow passed it to the adaptive strict reader. The earlier 173/173 artifacts recorded `selectionArtifact=null`. |
| E real selector CLI seam regression | Targeted Node profile/core/metadata/portfolio passed 143/143 and structural passed 48/48. A real selector CLI artifact is accepted by `readSelectionArtifact(..., { preparedCatalog })`, produces structured groups, starts a stub runner, and keeps route-authority, digest, source-identity, and root-set drift at zero spawn. |
| Exact 16-file bound selector and dry-run | Selector artifact contains 331 authority commands, digest `1cda67a2...632c0d5a`, source digest `a699fc9a...030749e`, and 233 roots. Adaptive loads it through `--selection-json`, keeps 204 selected roots, 237 unique leaves in 173 groups, defers 17 main-thread roots with 32 leaves, calls the three disposition planners once each, and reports unmatched 0 / blocked 0 / route gaps 0. |
| Exact 16-file bound child-safe execution | All 173 structured execution groups passed with non-null `selectionArtifact`. The final profile reports lifecycle `passed`, 237/237 canonical leaves, 227/227 files, complete leaf/root comparisons, 160 Node plus 13 Python process starts, zero interruption, zero analysis issues, and successful observer publication across 347 checkpoints. P4 quick ran inside group `execution:0060` and passed with exit 0. |
| P4 and Windows bounded live gates | P4 quick passed 260/260 after restoring five lockfile dependencies. Windows Job V2 passed 5/5 with zero residual target processes; the first run passed all five behaviors and hit a transient teardown `EPERM`, then the bounded retry exited 0. |
| Core and Pages boundary evidence | Core list produced 82 commands. The deferred Pages final plan contains five ordered executions and four exact dependency edges: build -> startup contract -> landing Node test -> sample-project Node test -> dist drift. Real Pages generation remained outside the tracked `dist` write boundary. |
| Frozen full policy after Stages 6A-C | `b7f9b40e`: 356/356 passed, exit 0, TAP total 954,768.5944 ms (~15m55s). This is 84.4% below the 6,139,150.8 ms baseline and 73.9% below the 3,662,093.7 ms intermediate run. The closed snapshot (420,985.07 ms) and deterministic builder (470,960.75 ms) still account for 93.42%; both consume the shared repository-scan cache whose resolver still clones the full graph per return. |
| Stage 6D shared-readonly experiment | Short correctness review closed two P1 certificate/proxy bypasses and one P2 revoked-proxy diagnostic gap; focused 8/8, batch 9/9, soundness 20/20, syntax, route 363, and SF-ATS route gaps all passed. The frozen full-policy candidate at `8d828e4` exceeded 30 minutes while its single manifest worker remained CPU-active, crossing 1.9x of the 954,768.5944 ms admission baseline before completion. Root stopped the exact four-process tree, confirmed zero remaining target PIDs, and reverted the candidate as `d873c075`. The checked-in full TAP remains the prior complete 356/356 baseline. |
| Stage 6E measured target | The next slice batches `validateStateActionNonTargetParameterMutations`: static evidence shows 14 action modules and about 142 per-binding scanner setups before each module's normal batch inventory. Acceptance requires an exact legacy-oracle violation comparison and one scanner invocation per action module. |
| Stage 6E batch experiment | `64c41aa` mechanically reduced production scanner invocations from 142 to 14 while preserving 142 binding analyses and zero violations. Independent review closed binding-ID collision, payload equality, oracle independence, and redundant-container postprocessing; root reruns passed focused 2/2, batch 10/10, scanner 30/30, policy 20/20, route 363, and SF-ATS with zero route gaps/unmatched. The frozen full-policy run remained active at the predeclared 1.25x threshold of about 20 minutes, so root stopped the exact four-process tree, confirmed zero remaining PIDs, and reverted the candidate as `ed25d341`. |
| Stage 6F diagnostic target | Compare the same action-module bindings as N single-binding scans versus one N-binding scan at N=1/4/8/16/33. The next implementation must follow measured scanner complexity rather than invocation count alone. |
| Stage 6F scanner diagnosis | `parseAndAnalyzeJavaScript` already reuses the same-source AST/index. Multi-binding still repeats `functionRecordByNode`, direct-return indexing, returned-function base closure, trusted-global alias fixpoint, static-path mutation indexing, and identity-transition indexing per binding. On the largest measured action module, 72-binding batch median was 387 ms versus 377 ms for repeated single calls, confirming that invocation batching leaves the dominant `B x S` preparation term intact. A 31.4 KiB synthetic source with 240 unrelated functions took about 124 ms/290 ms for 33/72 bindings versus 1.47 ms/1.30 ms on the 48-byte owner source, locating the bounded Stage 6H opportunity. |
| Stage 6G historical source batch experiment | `02c13b29` replaced 47-path `cat-file -e` plus `git show` reads with one bounded `git cat-file --batch` process. Focused 4/4, syntax, 363 routes, diff hygiene, independent review, and SF-ATS route gaps all passed. Real 47-path output was pairwise equal and reduced the observed reader sample from 8.14 s to 0.112 s, with Git process count about `78 -> 2` including revision resolution. The frozen full-policy manifest worker remained CPU-active at 20m45s, beyond the predeclared 19m53s threshold derived from the 15m55s baseline. Root stopped the exact three-process Node tree, confirmed zero remaining PIDs, preserved the prior complete TAP, and reverted the candidate as `13c355e9`. |
| Stage 6H analysis preparation reuse | Integrated on the working branch as `ed735709`. A WeakMap keyed only by analysis object identity now reuses function/return indexes, syntactic export closure, trusted-global alias fixpoint, static-mutation paths, identity-transition records, and function identity context. Resolution, target-owner closure, modes, dataflow, traversal, findings, diagnostics, and delegations remain binding-local. Independent review closed one fresh-oracle seam blocker and returned `H_FINAL_REVIEW_CLEAR`. Root reruns passed scanner 32/32, policy 20/20, batch 9/9, syntax, 363 routes, diff check, and SF-ATS with zero route gaps. |
| Stage 6H paired performance | The benchmark directly loaded the real `f2bfd75a` implementation and the candidate, alternated five runs, and required deep plus JSON output equality. On the 42.9 KiB real action module, N=33 improved from 155.849 ms to 101.590 ms (-34.8%) and N=72 from 547.534 ms to 269.824 ms (-50.7%). Shared preparation is mechanically one per scan; the fresh oracle is one per binding. |
| Stage 6H long-gate observation | A direct deterministic-builder hotspot remained active at 10m58s and was stopped at the predeclared 1.25x historical subtest threshold; its exact three-process tree left zero residual PIDs. The result is inconclusive for H admission because an independent old-worktree manifest invocation in the same time window also remained active beyond 21 minutes, demonstrating substantial machine/baseline drift. Neither interrupted run overwrote the complete 356/356 full TAP. |
| Stage 6I accidental-full-run guard | Integrated as `267511a`. The official wrapper overwrites a private full/focused/quick child mode; the manifest synchronously accepts only full/focused before repository setup. A direct manifest pattern failed with a clear official command in 732 ms, while the official focused path passed 1/1 and wrote the isolated focused TAP. Reachability/guard contracts passed 10/10; syntax, route schema 363, diff check, independent review, and SF-ATS with zero route gaps passed. |
| Stage 6J frozen execution contract | Baseline `69733e43`; root is integration/live-process owner. Lane A implements runner streaming and deterministic fake-child regressions. Lane B audits Windows Job Object/signal/orphan semantics. Lane C audits canonical versus running/failure artifact identity, crash consistency, output framing, bounded growth, and adversarial cases. Full policy/Core/browser/Pages/TNO/perf remain unstarted. |
| Stage 6J-A streaming and artifact lifecycle | Integrated as `2a8d49f2` with root route closure `a69b7c3c`. The CLI runner delegates to a P4-specific lifecycle helper with mode-isolated lock/running/publishing/completed/failed/interrupted artifacts, bounded UTF-8 streaming, close-only settlement, atomic canonical publication, prior-evidence rollback, and authoritative full-plan consumers. Independent review returned `J_C_FINAL_REVIEW_CLEAR`. |
| Stage 6J-A real quick run | Official quick path passed 253/253 in 2,272.1 ms Node duration and 3.45 s wall time. Its completed artifact records `root-only`, `cleanupVerified=false`, `admissionCandidate=false`, and `admissionEligible=false`; only canonical TAP plus completed JSON remain after success. |
| Stage 6J-A short integration gates | Streaming plus reachability passed 28/28; metadata 29/29; verify-core runner 34/34; supervisor aggregate passed schemas 41 domains/3 schemas and Node 18/18; click/draw boundaries passed Node 32/32 plus Python 6/6; import graph covered 51 specs; E2E layering covered 47 specs; route schema covered 363 routes; SF-ATS matched all 9 changed files with zero unmatched files and zero route gaps. |
| Stage 6J-B / J2 readiness | `READY_WITH_REQUIRED_WILLIAMS_IDENTITY_MIGRATION`. J2a will extract a shared Job Object core and preserve Williams V1 behavior/evidence with source-set identity migration. J2b will add parent-death/control protocol, require zero remaining or unverified descendants, and wire `tree-contained` P4 admission. |
| Stage 6J-B / J2a shared Job core | Integrated as `69b17903`. The original C# runner and extracted core are algorithm-equivalent after the expected class/protocol parameterization. `compileWindowsJobRunner` reads the ordered source set once, computes identity from those bytes, writes exclusive build snapshots, compiles only the snapshots, and returns the actual source set. Official Williams execution compares that set with both current and candidate identities before any workload. |
| Stage 6J-B / J2a verification | Williams contracts passed 58/58; metadata 29/29; Python perf gate 26/26; verify-core runner 34/34; supervisor plan 17/17 and contracts/routing 18/18; bounded Windows detached-descendant integration passed 1/1 in 1.18 s; route schema covered 363 routes; SF-ATS matched all 10 changed files with zero unmatched and reserved six main-thread/live gates. |
| Phase 0 current-code audit | `9869698d` contains `fccef91b`, which already supplies `SF_WINDOWS_JOB_V2`, authenticated parent/control identity, creation-time Job assignment, parent-death/cancel/timeout first-cause handling, durable containment evidence, P4 close-time embedding, and tree-contained-only production admission. The accepted production and regression sources remain identical to the coordination baseline. |
| Phase 0 child-safe regressions | Windows Job V2 protocol/runtime passed 21/21; P4 streaming, mode isolation, evidence embedding, and admission fail-closed coverage passed 24/24; Williams V1 Job coverage passed 16 with one explicit live-telemetry skip. |
| Phase 0 bounded Windows integration | `npm run test:node:windows-job-runtime:integration` passed 5/5 in 1.74 s, covering normal root exit, explicit cancel, timeout, helper-crash kill-on-close fail-closed behavior, and parent death. |
| Phase 0 retained process-tree evidence | `.runtime/reports/generated/verification-j2b-closeout/process-tree-evidence-1787208039654-4bb2a3c8-a216-4273-969b-27636119b808.json` records explicit-cancel PIDs `81224/21108/60100`, helper-crash PIDs `43268/32128/6140`, and parent-death PIDs `76428/79480/17992/19924`. Every post-run PID check is false; verified cancel and parent-death evidence reports `activeProcessesAfterCleanup=0`, `remainingPids=[]`, and `unverifiedPids=[]`; helper crash reports `containmentScope=blocked` and `cleanupVerified=false`. |
| Phase 0 real quick artifact | The official quick runner passed 260/260 with zero `not ok` lines. Its completed artifact records `mode=quick`, `containmentScope=root-only`, `cleanupVerified=false`, `reusable=false`, and `admissionEligible=false`, preserving full/quick/focused identity isolation. |
| Phase 0 SF-ATS execution | The final 13-file adaptive run executed 16/16 child-safe commands successfully, deferred six main-thread/live commands, matched every changed file, reported zero blocked verification entries, and passed the 371-route schema check. The first child-safe attempt exposed a missing local `acorn` installation; `npm ci --ignore-scripts --no-audit --no-fund` restored the five lockfile packages before the successful rerun. |

## Open risks and remaining work

- Cross-revision reuse requires complete route metadata and clean source/current checkpoints; current P4 renderer changes conservatively restart the phase plan at command 0 because their route does not intersect phase command refs.
- Schema-1 core reports remain intentionally ineligible because they lack revision identity.
- Full browser, Pages dist, performance, TNO corpus, and full core validation remain held outside the implementation loop. Full P4 policy passed at commit `58e6d350`; later performance experiments were bounded to focused patterns.
- The exact policy rebuild still spends roughly 18 minutes in the older focused baseline. Stage 6A now reuses identical historical proofs within one producer; a frozen-candidate live run remains required to measure the new wall time.
- Windows P4 full-policy admission now requires the J2b V2 tree-contained evidence embedded by the official runner. The bounded Phase 0 gate proves the containment mechanism; the frozen-candidate full P4 policy run and complete canonical admission artifact remain Stage 5b integration/CI work.
- Full wall-clock savings remain unmeasured until the frozen-candidate Core/P4 admission run; current Stage 6C evidence proves command and test-file closure only.
- Full Core wall-clock savings remain unmeasured. Stage 6D established that recursive descriptor audit/deep freeze is unsuitable for the real scan graph; Stage 6E established that fewer scanner invocations do not imply lower wall time when multi-binding analysis changes internal complexity; Stage 6G showed that a large isolated Git-read win did not translate into the frozen full-policy wall-clock gate. Stage 6H has paired scanner-local evidence, while its repository-scale effect requires a same-environment control or CI admission run.
- The streaming wrapper bounds synthesized output at 64 MiB and may also retain the prior canonical/completed pair plus final serialization during rollback-safe publication. J2b preserves that bounded artifact contract while embedding verified Job Object descendant teardown evidence.

## 2026-08-21 Williams session-journal repair

- [x] Reproduce `Write-WilliamsPowerSchemeSession` failing on its second checkpoint when `File.Replace` receives PowerShell `$null` for the .NET string backup-path parameter.
- [x] Add a Windows real-file-system regression to `tests/williams_crossover_governance_behavior.test.mjs`; the test first failed on checkpoint two and now validates four publications around an induced read-only-destination failure.
- [x] Update `tools/perf/williams_crossover_power_scheme.ps1` to pass `System.Management.Automation.Language.NullString.Value` while retaining the existing atomic publication and finally cleanup flow.
- [x] Pass Williams governance `44/44`, Williams Job runner `16 passed / 1 explicit live-telemetry skip`, verification metadata `31/31`, and final SF-ATS child-safe execution with eight canonical commands and zero route gaps.
- [x] Pass PowerShell 7.6 consecutive existing-target writes and the Windows PowerShell 5.1 live preflight; restore Balance `381b4222-f694-41f0-9685-ff5bb260df2e`, delete temporary scheme `763d8e3a-fac8-4f75-968f-985592042ffc`, and finish with zero matching processes or listeners on 8000/8892.
- [x] Final integration owner fast-forwards the isolated repair and runs `perf:williams-crossover:run` once for the complete 32-sample plan; the command exits `3` at block 01 and admission becomes `BLOCK`.

Repair artifacts are under `.runtime/reports/generated/williams-journal-fix-*`. The adaptive execution defers `perf:williams-power-scheme:live-preflight`, live telemetry, standard perf, and full Williams as main-thread roots; the explicitly assigned power preflight completed separately with exit 0.

## 2026-08-21 final integration admission

- [x] Confirm sole integration/live-test ownership and reserve `.runtime-output`, `browser-dev-server`, `perf-dev-server`, `playwright-browser`, and `system-power-scheme`.
- [x] Confirm candidate/control identities, detached measurement state, clean Git state, empty task-owned process set, zero listeners on 8000/8892, Balance-only power state, and fresh output paths.
- [x] Execute the complete Williams plan once with frozen control/candidate SHAs and isolated `17-williams-crossover-*` outputs.
- [x] Stop admission on Williams exit `3`; preserve every partial raw/log artifact and perform zero retries.
- [x] Restore Balance, delete temporary scheme `2f91656c-3eb3-4315-b1ef-20ab6f3f1245`, verify zero task-owned PIDs and zero listeners, restore a82e to `codex/sc-phases-0-3-candidate`, and keep control detached.
- [ ] Produce 8/8 completed blocks, 32/32 raw samples, a valid raw manifest, final JSON/Markdown reports, and acceptance/regression PASS.
- [ ] Push to `origin/main` and observe required GitHub Actions to terminal conclusions.

| Final admission check | Result |
| --- | --- |
| Williams command | `npm run perf:williams-crossover:run -- --control-worktree C:\Users\raede\.codex\worktrees\045e\mapcreator --candidate-worktree C:\Users\raede\.codex\worktrees\a82e\mapcreator --control-head 9869698da5331e9afcc961f42b4666469abe6c46 --candidate-head e602cf4fb1bb68b5692e58f8a8151223349b4135 --raw-root ...\17-williams-crossover-raw --json-out ...\17-williams-crossover-report.json --md-out ...\17-williams-crossover-report.md`; exit `3`; one execution; zero retries. |
| Measurement progress | `block-01` produced one invalid block result, 0/8 completed blocks, and 4/32 raw scenario samples. Final raw manifest and JSON/Markdown performance reports were never reached. |
| Baseline blocker | Control `run_baseline.mjs` exited `1`: `config.runs expected=5 actual=2` plus the same 5-versus-2 mismatch for `tno_1962` and `hoi4_1939`. Job Object cleanup was valid with `remainingPids=[]` and `unverifiedPids=[]`. |
| Journal blocker | The 32,180-byte lifecycle journal starts with `{` and has no BOM. Explicit UTF-8 parsing succeeds in PowerShell 7 and Windows PowerShell 5.1; the Windows PowerShell 5.1 default reader fails at JSON position 933. Automatic power-scheme stop therefore exited through the fail-closed recovery path. |
| System recovery | `powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e` exit `0`; `powercfg /delete 2f91656c-3eb3-4315-b1ef-20ab6f3f1245` exit `0`; the temporary GUID is absent; Balance is the only remaining scheme; task-owned PIDs and listeners on 8000/8892 are zero. |
| Parent WIP protection | Parent stays `main@9869698d` with 19 tracked paths and 977 diff lines; canonical PowerShell LF-join/no-final-newline SHA-256 remains `aea020b4130165870c07e4d92e5cf87454f4e9776bfffc1feec69aec1370e661`; overlap with the 18 candidate paths is zero. |
| SF-ATS docs-only verification | The three task-record paths select one child-safe command, `node --test tests/verify_core_runner_behavior.test.mjs`; dry-run and execution both exit `0`, the regression passes 56/56, and `unmatched=[]`, `blocked=[]`, `routeGaps=[]`. |
| Admission disposition | `BLOCK`. Performance acceptance and regression verdicts are unavailable. `origin/main` push and remote CI were not run. |

## 2026-08-21 Williams nested-admission alignment repair

- [x] Preserve both prior live evidence roots and close retry authority for `a97d4574fc2e964876a9dc17ea792d93ec24ad9d`.
- [x] Record live2 root cause: block-01 outer quiet-window valid; inner standard admission rejected CPU average `21.1% > 20%` and `ChatGPT[6820] 30.4% > 25%`; zero measurements started.
- [x] Verify live2 cleanup: Job Object `cleanupValid=true`, `remainingPids=[]`, `unverifiedPids=[]`, ports clear, Balance restored, temporary scheme absent, candidate/control clean, and parent WIP hash unchanged.
- [x] Implement same-policy pre-block admission with full decision revalidation before lazy Job preparation and zero workload spawn on rejected, invalid, or collection-failure evidence; code commits are `102dfd4522efa198ce577c029037771c4dd0726b` and `60c3352b026d495e30709694d6e092cc222da119`.
- [x] Pass deterministic and SF-ATS child-safe verification for the exact three-file follow-up diff: syntax and diff checks exit `0`; Williams governance 71/71; Job runner 16 pass plus one explicit live skip; role policy 82/82; perf contracts 26/26; SF-ATS 7/7 execution groups and 9/9 canonical leaves with `unmatched=[]`, `blocked=[]`, and `routeGaps=[]`.
- [x] Freeze `841801cd45e7bf5c9869e780bb4e338da346890c` and complete a fresh code-reviewer plus architect/verifier review. The coordinated verdict is `BLOCK` with two P2 findings: validator-invalid stderr lost `git-evidence-invalid`, and the raw analyzer lacked a direct missing pre-block admission artifact regression.
- [x] Close both P2 findings in `c61ecb86190374c98be1863e06e8e180182fff04`: stderr now separates validator reasons, evaluator failure codes, and quiet-window environment detail; regressions cover forged-head stderr and missing admission no-throw/manifest/block/exit-3 behavior.
- [x] Pass post-P2 syntax, focused RED/GREEN, Williams governance 71/71, Job runner 16 pass plus one explicit live skip, role policy 82/82, perf contracts 26/26, and exact two-file SF-ATS execution with 7/7 groups, 9/9 leaves, `unmatched=[]`, `blocked=[]`, `routeGaps=[]`, and zero CI-only roots.
- [x] Freeze `494922841e80a3438041d63ccc40ef678a9e36aa` and complete the second fresh dual review. Code-reviewer returns zero candidate findings; architect/verifier returns `BLOCK / P2×1` because evaluator-rejected and quiet-window stderr projections lacked direct output assertions.
- [x] Close the second-review P2 in `6efaf29013feac22f8ffdb6628cd88634fbc7219`: all six evaluator rejection cases assert their published failure code, and a block-level quiet-window case asserts cadence, busy-port, exit-3, preparation, and zero-spawn evidence.
- [x] Pass focused 2/2, Williams governance 72/72, and exact one-file SF-ATS execution with 3/3 groups, 4/4 leaves, `unmatched=[]`, `blocked=[]`, `routeGaps=[]`, zero CI-only roots, and one root-owned power-scheme live preflight deferred.
- [ ] Freeze the third task-record-sealed candidate SHA and obtain two fresh explicit `CLEAR` verdicts through the reused review task.
- [ ] Obtain and execute a newly authorized live lifecycle for the repaired SHA.
- [ ] After live admission passes, push normally, verify exact remote SHA, and observe required GitHub Actions.

Current artifacts:

- live1: `.runtime/admission/sc-phases-0-3-a97d4574-live1/`
- live2: `.runtime/admission/sc-phases-0-3-a97d4574-live2/`
- live2 report: `.runtime/admission/sc-phases-0-3-a97d4574-live2/williams-report.json`
- live2 block-01 admission: `.runtime/admission/sc-phases-0-3-a97d4574-live2/williams-raw/blocks/block-01/raw/perf-admission.json`
- isolated follow-up evidence: `C:\Users\raede\.codex\worktrees\de63\mapcreator\.runtime\reports\generated\williams-preblock-admission-followup\`
- root final deterministic/SF-ATS evidence: `.runtime/reports/generated/williams-preblock-admission-root-final/`
- first coordinated review: `C:\Users\raede\.codex\worktrees\abb8\mapcreator\.runtime\reviews\sc-841801cd-coordinated-review\`
- post-P2 SF-ATS evidence: `.runtime/reports/generated/sc-841801cd-p2-closure/`
- second coordinated review: `C:\Users\raede\.codex\worktrees\abb8\mapcreator\.runtime\reviews\sc-49492284-followup\`
- second-review P2 SF-ATS evidence: `.runtime/reports/generated/sc-49492284-p2-test-closure/`

## 2026-08-24 SC P0-P3 continuation

- [x] P0: restore the minimum-CI heavy dependency classification for polar-water spherical safety, ratify the four strict public scenarios, and refresh the five scenario provenance bindings against the current topology blob.
- [x] P0: regenerate `blank_base` through the public materializer twice and confirm byte identity; retain the three pre-existing strict semantic gaps as explicit follow-up instead of weakening the contract.
- [x] P1: perform only the requested lightweight observation: 333 scripts after P2, one 18-command selector sample, zero duplicate commands, zero unmatched files, and zero route gaps. This is not full/nightly/browser/Pages/performance evidence.
- [x] P2: remove only `test:node:renderer-hit-canvas-scheduling-inventory`; inline its third independent Node process into the canonical owner suite while preserving execution files, order, and process boundaries.
- [x] P2: classify the remaining 28 superseded scripts rather than force-delete them: 12 P4 direct-runner, 6 adaptive child-safe, 3 supervisor-direct, and 7 diagnostic/report entries.
- [x] Combined seam: add the new heavy-group polar route to the canonical verification metadata authority. Shadow comparison is zero-spawn and equal; 378 routes reconcile to the same 336 commands, 432 catalog entries, 403 leaves, and 29 suites.
- [x] P3: complete planning only. The five serial renderer slices, ownership boundaries, reduction budgets, deletion gates, and verification ladder are recorded in `plan.md`; no P3 production code, generated dist, browser run, or performance run was performed.

Delivery commits in the integration lineage are `12b4a243` (P0), `929b0ae1` (P1/P2), and `b69ff0b5` (combined catalog seam). Normal `origin/main` synchronization is owned by the primary integration task after the final combined checks.

## 2026-08-24 P3 serial execution

- [x] Freeze the supervisor worktree at clean `codex/sc-p0-p3-integration-20260824@f118a101`; verify that its renderer blob is byte-identical to the planned `a6833008` baseline and that the parent WIP remains untouched.
- [x] Establish three user-visible task lanes: one sole production-code implementer, one read-only exact-commit reviewer, and one independent verifier/test owner.
- [x] P3.1 Day/Night Runtime Owner: candidate commit, findings-first review, focused exact-selector proof, supervisor integration checkpoint.
- [x] P3.2 Texture Effects Render Owner: candidate commit, findings-first review, focused exact-selector proof, supervisor integration checkpoint.
- [x] P3.3 Click Selection Transaction Owner: candidate commit, findings-first review, focused exact-selector proof, supervisor integration checkpoint.
- [x] P3.4 Political Background Render Owner: candidate commit, findings-first review, focused exact-selector proof, supervisor integration checkpoint.
- [ ] P3.5 Political Partial-Repaint / Worker Engine: candidate commit, findings-first review, focused exact-selector proof, supervisor integration checkpoint.
- [ ] Run the final bounded P3 acceptance ladder, close task records, push normally, and verify local/remote SHA equality. Production deployment and force-push remain unauthorized.

Only one slice may modify `js/core/map_renderer.js` at a time. The implementer stops after each committed candidate; the reviewer and verifier consume the exact candidate SHA; the supervisor alone owns cherry-pick/integration, shared `.runtime` lanes, long gates, task-record commits, remote synchronization, and cleanup decisions.

P3.1 is admitted and integrated. The implementation lineage is `1332bb51` → `b651a59f` → `423feb0b` → `fa015b53`; the supervisor replayed the same committed tree as `79746feb` → `5689d9f9` → `c9c1e050` → `dc256b8f`. Independent review returned `CLEAR` and independent verification returned `PASS` for the final six-file delta. Day/Night runtime ownership, canonical state-action delegation, raw/current scanner separation, Visual Effects P4.3 direct routing, hostile scheduler behavior, selector identity, and zero-spawn bound planning are closed. The remaining Water `river_layer_regression.spec.js:argv` planner conflict reproduces unchanged at `f118a101` and is a non-blocking inherited gap. P3.2 is now the only authorized production slice.

P3.2 is admitted and integrated. Implementation candidate `dcc83e8ddf4e8c2966f06e243870ec25dfed125c` was replayed by the supervisor as `41b3f538`. Independent review returned `CLEAR` and verification returned `PASS`: paper, graticule, draft-grid, texture-label rendering and four texture cache families have one Visual Effects owner; host orchestration, resize invalidation, pipeline/City Lights order, cache identity, public facades, and hostile canvas restoration remain intact. The exact five-file selector, P4.3 direct routes, architecture/import graph, and zero-spawn bound plan all pass. P3.3 is now the only authorized production slice.

P3.3 is admitted and integrated. Implementation candidate `039acb7d513dd3cd5886218c14178196888f52e0` was replayed by the supervisor as `5d6543fa` and `1c2f92f8`. Review closed one CRLF-sensitive architecture matcher and returned `CLEAR`; verification returned `PASS`. The click transaction owner preserves the single event funnel, branch and side-effect ordering, deferred hydration live-state refresh, water and sovereignty fail-closed behavior, canonical action authority, and source-bound scanner proofs. Canonical policy generation records 207 writers and validates 75 production plus 43 test legacy-direct files with zero violations. Post-integration architecture, owner, inventory, and P4.3 route checks pass. P3.4 is now the only authorized production slice.

P3.4 is admitted and integrated. Implementation candidate `a9f63bd6a16a828f80c14d80a91cbbbdfc52688b` was replayed by the supervisor as `c8deacb9`, `5dabccaf`, and `19c0ddf4`. Two review rounds closed stale source-bound contracts, incomplete owner routing, and canonical/legacy authority drift; final review returned `CLEAR` and verification returned `PASS`. Political background cache/deferred ownership, source/color provenance, currentness fences, ocean/intensity effect delegation, progressive summaries, and the P3.5 worker/partial seam remain intact. Post-integration metadata/portfolio, owner/ocean/orchestrator/inventory, Python boundary, architecture, and P4.3 route checks pass with zero unmatched files or route gaps. P3.5 is now the only authorized production slice; blank-line trailing whitespace is carried into its final policy refresh.
