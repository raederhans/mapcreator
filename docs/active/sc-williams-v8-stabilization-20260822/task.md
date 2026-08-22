# SC Williams v8 Stabilization Task

## Current status

`V8_OFFLINE_CLEAR_CALIBRATION_PENDING` — the v8 implementation, negative regressions, SF-ATS routing, and fresh Lane A exact-diff review are clear. The candidate is ready for a root-owned, preregistered non-formal calibration before exact-SHA live admission.

## Checklist

- [x] Preserve f1, control, gate-window-11, and final-01/02/03 evidence.
- [x] Diagnose admission stability and the Job runner / power lifecycle ordering contradiction.
- [x] Create `codex/sc-williams-v8-stabilization-fix` from exact f1 without touching parent WIP.
- [x] Assign bounded production, test, review, and root ownership.
- [x] Implement v8 preparation admission, one-time Job preparation, power activation, and preregistration ordering.
- [x] Implement initial plus seven inter-block stabilization receipts with one-attempt semantics.
- [x] Close timestamp-chain and maximum-handoff validation for preparation, stabilization, admission, and telemetry.
- [x] Close successful-block exactly-one workload validation across Job, cleanup, and block-result evidence.
- [x] Close governed-receipt physical exact-set and pre-block/Job-preparation no-clobber validation.
- [x] Update exact raw entry, manifest, snapshot, and analyzer validation for the initial v8 receipt set.
- [x] Complete all negative regressions for ordering, retry, timing, workload count, extra/missing receipts, early exit, no-clobber, and cleanup.
- [x] Obtain a fresh independent exact-diff CLEAR after all Lane A findings close.
- [ ] Calibrate and freeze the fixed stabilization duration using non-formal evidence.
- [x] Commit the clean repair candidate represented by this record and complete pre-commit SF-ATS selection/dry-run/child-safe checks.
- [ ] Complete a fresh exact-SHA enforcing performance gate and fresh Lane A/B reviews.
- [ ] Complete Windows Job, power, telemetry, and cleanup live gates.
- [ ] Complete a fresh formal Williams run with 8/8 blocks and 32/32 measured raw files.
- [ ] Integrate in a fresh current-`origin/main` worktree, push normally, and verify remote/CI.
- [ ] Start Phase 4 and Phase 5 visible tasks within the three-task-per-phase limit.

## Validation evidence

| Command or check | Result |
| --- | --- |
| `git worktree list --porcelain` | Parent WIP worktree, historical f1/control worktrees, and the new repair worktree are distinct. |
| `git worktree add -b codex/sc-williams-v8-stabilization-fix ... f1e5bf5` | PASS, exit 0; new worktree created from exact f1. |
| f1 and control identity/status checks | PASS; exact detached heads and clean status retained. |
| final-03 raw review | block-01 complete, block-02 admission rejected, 4/32 measured raw, cleanup valid. |
| v7 ordering review | Confirmed `power-lifecycle.job-runner-order` in the generated report and contradictory production/policy sequence. |
| v8 full governance before Lane A review | PASS, exit 0; 79/79. |
| adjacent governed report and verification metadata | PASS, exit 0; 90/90. |
| Windows Job runner companion suites | PASS, exit 0; 16 pass and one explicit live telemetry skip. |
| verification route schema | PASS, exit 0; 372 routes. |
| Lane A first fresh exact-diff review | REQUEST CHANGES; P1 x2 and P2 x1 covering timestamp-chain fail-open, successful workload count, and governed receipt exact-set/no-clobber. |
| Lane A second review | REQUEST CHANGES; P1 x1 and P2 x1 covering synthesized workload count and Job preparation EEXIST cleanup. |
| Final v8 governance plus Windows Job suites | PASS, exit 0; 102 total, 101 pass, 0 fail, one explicit live telemetry skip; governance 84/84 and the native Windows Job integration passed. |
| Adjacent governed report and verification metadata | PASS, exit 0; 90/90 on the final bytes. |
| JavaScript syntax checks | PASS, exit 0 for all three production modules and all three modified test files. |
| SF-ATS final dry-run | PASS, exit 0; five recommendations, three child-safe selected, two main-thread deferred, `unmatchedChangedFiles=[]`, `routeGaps=[]`. |
| Verification route schema | PASS, exit 0; 372 routes on the final bytes. |
| Lane A fresh final exact-diff review | `LANE_A_CLEAR`; P0/P1/P2/P3 all zero. |
| `git diff --check` | PASS; no patch whitespace errors. |

## Open risks and remaining work

- The provisional 5000 ms delay and 1000 ms handoff bound require one preregistered non-formal calibration before they become formal-run authority.
- The calibration must preserve every fixed window and decision, with zero retry, zero threshold-driven polling, and zero successful-window selection.
- The new SHA invalidates reuse of f1's gate and review authority; all exact-revision gates remain pending.
