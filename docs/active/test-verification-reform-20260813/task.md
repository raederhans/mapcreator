# Test Verification Reform Task

## Current status

Implementation and bounded validation are complete. The frozen-candidate long admission lane remains pending.

## Checklist

- [x] Add shared Git verification identity and atomic checkpoint utilities.
- [x] Add `verify:core` same-tree and changed-tree resume with SF-ATS invalidation.
- [x] Add timing/checkpoint/resume support to P4 phase verification.
- [x] Add per-command timing and atomic checkpoint reporting to adaptive and supervisor execution paths.
- [x] Add focused runner regression coverage.
- [x] Reduce repeated state-writer full repository scans inside the manifest suite.
- [x] Audit and correct expensive/overlapping verification metadata entries.
- [x] Add quick and focused P4 policy runner modes with isolated TAP outputs.
- [x] Collapse covered commands for P4 exact phases, TNO coverage chain, and Pages verification.
- [x] Run SF-ATS dry-run and targeted validation.
- [x] Complete independent fail-closed and compatibility review.
- [ ] Freeze candidate and run the remaining full admission gates once.

## Validation evidence

| Command or check | Result |
| --- | --- |
| Exact process-tree inspection and termination | Repeated core/policy tree stopped; remaining target PIDs = 0. |
| Read-only current runner audit | Core/adaptive lack identity and resume; P4 has identity/checkpoint; supervisor has timing. |
| Existing state-writer TAP timing parse | 6,139,150.8 ms total; top six repeated full scans = 99.12%. |
| Core/P4 resume and checkpoint regression | Final bounded matrix 89/89; exact resume, changed-tree suffix invalidation, two-hop SF-ATS reuse, per-command/final identity binding, atomic replacement, dirty/unmatched/plan fail-closed all passed. |
| P4 quick runner | 217/217 passed; Node test duration 2,708.7 ms; isolated quick TAP written. |
| P4 focused cache regression | 1/1 passed; Node test duration 226.6 ms; isolated focused TAP written. |
| Metadata behavior before/after batching | 29/29 passed; observed duration reduced from 21,133.0 ms to 8,802.4 ms in this session. |
| Supervisor/adaptive checkpoint and supersession tests | Running/terminal checkpoints, duration fields, route-gap zero-execution, and composite command collapse passed. |
| TNO multi-report unit regression | Repeated output paths produced byte-equal JSON; legacy string arg remained accepted. |
| Core list smoke | schema 2 report written with 87 commands and one Pages admission command (`verify:pages-dist-and-drift`). |
| SF-ATS final dry-run | 29 changed files; 229 recommendations; 213 planned child-safe commands; 15 blocked main-thread commands; unmatched changed files = 0. |
| Pages route structural regression | 1/1 Python selector contract passed; generation and admission composite each contain one builder call. |
| Independent diff review | Three initial findings plus multi-hop provenance findings fixed; final verdict `FINAL_REVIEW_CLEAR`. |

## Open risks and remaining work

- Cross-revision reuse requires complete route metadata and clean source/current checkpoints; current P4 renderer changes conservatively restart the phase plan at command 0 because their route does not intersect phase command refs.
- Schema-1 core reports remain intentionally ineligible because they lack revision identity.
- Full browser, Pages dist, performance, TNO corpus, full P4 policy, and full core validation remain held outside the implementation loop.
- Generalized Windows Job Object process containment remains a separate high-risk follow-up; current runners retain synchronous child-process behavior.
