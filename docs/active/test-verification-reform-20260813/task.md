# Test Verification Reform Task

## Current status

The initial runner reform is committed. Stage 6 hotspot reduction is active under three ordered worktree tasks; frozen-candidate admission follows their integration.

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
- [ ] Stage 6A: admit the derived-proof cache candidate from Hotspot A.
- [ ] Stage 6B: authorize and admit cross-process evidence reuse after Stage 6A.
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

## Open risks and remaining work

- Cross-revision reuse requires complete route metadata and clean source/current checkpoints; current P4 renderer changes conservatively restart the phase plan at command 0 because their route does not intersect phase command refs.
- Schema-1 core reports remain intentionally ineligible because they lack revision identity.
- Full browser, Pages dist, performance, TNO corpus, and full core validation remain held outside the implementation loop. Full P4 policy passed at commit `58e6d350`; later performance experiments were bounded to focused patterns.
- The exact policy rebuild still spends roughly 18 minutes in the measured focused run. Historical derived-alias proof replay is the next measured optimization target; any cache for those proofs needs source SHA, path-set, checkpoint, and policy-identity invalidation.
- Generalized Windows Job Object process containment remains a separate high-risk follow-up; current runners retain synchronous child-process behavior.
- Hotspot B and C are read-only until the root supervisor supplies their exact upstream candidate SHA and implementation authorization.
