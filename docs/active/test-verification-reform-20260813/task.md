# Test Verification Reform Task

## Current status

The initial runner reform plus Stage 6A proof reuse and Stage 6B exact evidence reuse are committed. Stage 6C has a measured command-closure implementation slice ready on the combined candidate.

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
- [ ] Stage 6C: authorize and admit measured test-portfolio reform after Stages 6A and 6B.
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

## Open risks and remaining work

- Cross-revision reuse requires complete route metadata and clean source/current checkpoints; current P4 renderer changes conservatively restart the phase plan at command 0 because their route does not intersect phase command refs.
- Schema-1 core reports remain intentionally ineligible because they lack revision identity.
- Full browser, Pages dist, performance, TNO corpus, and full core validation remain held outside the implementation loop. Full P4 policy passed at commit `58e6d350`; later performance experiments were bounded to focused patterns.
- The exact policy rebuild still spends roughly 18 minutes in the older focused baseline. Stage 6A now reuses identical historical proofs within one producer; a frozen-candidate live run remains required to measure the new wall time.
- Generalized Windows Job Object process containment remains a separate high-risk follow-up; current runners retain synchronous child-process behavior.
- Hotspot C remains implementation-gated until the root supervisor positions its worktree on the exact combined Stage 6A+B candidate SHA.
