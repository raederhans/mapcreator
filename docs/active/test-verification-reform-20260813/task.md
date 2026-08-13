# Test Verification Reform Task

## Current status

The initial runner reform plus Stage 6A proof reuse, Stage 6B exact evidence reuse, Stage 6C strict command closure, and Stage 6H analysis-owned scanner preparation are committed on the working branch. Stages 6D, 6E, and 6G passed short correctness review but failed frozen wall-clock gates and were reverted. Stage 6H passed independent review, short behavior gates, and paired old/new scaling; its end-to-end policy admission remains open because current-machine long-run timing drifted materially from the historical baseline.

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
- [ ] Stage 6J: add observable partial progress to the policy runner with atomic final evidence.
- [ ] Freeze candidate and run the remaining full admission gates once.

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

## Open risks and remaining work

- Cross-revision reuse requires complete route metadata and clean source/current checkpoints; current P4 renderer changes conservatively restart the phase plan at command 0 because their route does not intersect phase command refs.
- Schema-1 core reports remain intentionally ineligible because they lack revision identity.
- Full browser, Pages dist, performance, TNO corpus, and full core validation remain held outside the implementation loop. Full P4 policy passed at commit `58e6d350`; later performance experiments were bounded to focused patterns.
- The exact policy rebuild still spends roughly 18 minutes in the older focused baseline. Stage 6A now reuses identical historical proofs within one producer; a frozen-candidate live run remains required to measure the new wall time.
- Generalized Windows Job Object process containment remains a separate high-risk follow-up; current runners retain synchronous child-process behavior.
- Full wall-clock savings remain unmeasured until the frozen-candidate Core/P4 admission run; current Stage 6C evidence proves command and test-file closure only.
- Full Core wall-clock savings remain unmeasured. Stage 6D established that recursive descriptor audit/deep freeze is unsuitable for the real scan graph; Stage 6E established that fewer scanner invocations do not imply lower wall time when multi-binding analysis changes internal complexity; Stage 6G showed that a large isolated Git-read win did not translate into the frozen full-policy wall-clock gate. Stage 6H has paired scanner-local evidence, while its repository-scale effect requires a same-environment control or CI admission run.
- The synchronous wrapper still buffers TAP until completion. Stage 6J should retain a running artifact and an interruption/failure artifact while publishing the canonical full TAP only after a complete terminal result. Signal propagation and Windows process-tree containment must be designed together with streaming.
