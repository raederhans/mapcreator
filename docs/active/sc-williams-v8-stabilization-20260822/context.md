# SC Williams v8 Stabilization Context

## Current truth

- Repair worktree: `C:\Users\raede\.codex\worktrees\sc-williams-v8-stabilization-fix\mapcreator`.
- Branch: `codex/sc-williams-v8-stabilization-fix`; parent/base revision: `f1e5bf5748b0658cf6674ab5a067187a90475e43`. The commit containing this record is the calibration candidate.
- Historical f1 worktree and control worktree are detached, clean, and retained with final-01/02/03 evidence.
- `gate-window-11` passed on f1 and historical Lane A/B reviews were CLEAR. Those facts do not admit the future repair SHA.
- final-01 and final-02 stopped at block-01 admission with zero workload spawns. final-03 completed block-01 with 4/32 measured raw files, then stopped at block-02 admission.
- final-03 also proved a deterministic v7 contract violation: Job capability probing occurred after temporary power activation, producing `power-lifecycle.job-runner-order`.

## Decisions and deviations

| Time | Evidence or decision | Impact |
| --- | --- | --- |
| 2026-08-22 01:09Z | final-03 block-02 admission averaged 20.2% after a 6 ms block transition | Three formal invalid runs exhausted the same-hypothesis retry allowance; f1 live reruns stopped. |
| 2026-08-22 01:16Z | `capabilityProbedAt=01:07:07.969Z` followed `temporary-active.completedAt=01:06:59.0839658Z` | Current v7 execute flow can never satisfy its analyzer ordering rule after preparation succeeds. |
| 2026-08-22 01:22Z | Created a new branch/worktree from exact f1 | Historical evidence stays immutable while the repaired protocol receives a new SHA. |
| 2026-08-22 01:22Z | Selected explicit v8 protocol identity and provisional fixed 5000 ms stabilization | Root must run non-formal calibration and freeze the value before any formal Williams attempt. |
| 2026-08-22 01:22Z | Formal retries remain zero | Every rejected formal root stays immutable; a new attempt starts from block-01 in a fresh root. |
| 2026-08-22 01:34Z | Offline v8 governance reached 79/79; adjacent report/metadata reached 90/90; Job runner reached 16 pass with one explicit live skip; route schema reached 372/372 | The initial implementation is executable and routed, while exact-revision live authority remains pending. |
| 2026-08-22 01:43Z | Lane A returned REQUEST CHANGES with two P1 findings and one P2 finding | Root assigned fail-closed timestamp-chain, exactly-one workload, governed-receipt inventory, and no-clobber repairs before calibration or commit. |
| 2026-08-22 01:44Z | Provisional handoff bound frozen as `maxHandoffLagMs=1000` | Non-formal calibration must confirm or replace this value before the final candidate SHA and formal Williams run. |
| 2026-08-22 02:06Z | Final offline v8 suites reached 102 total / 101 pass / one explicit live skip; adjacent suites reached 90/90; route schema reached 372/372 | Child-safe implementation and regression evidence are green on the final uncommitted bytes. |
| 2026-08-22 02:08Z | Lane A returned `LANE_A_CLEAR`, with P0/P1/P2/P3 all zero | All five findings across the earlier two review rounds are closed; calibration remains the next admission boundary. |

## Live process ownership

| Process | Owner | Log path | State |
| --- | --- | --- | --- |
| Williams / performance / browser / power lanes | `/root` | Assigned under `.runtime/` before each run | inactive; collaborators may not start or poll |
| v8 implementation tests | bounded executor / Lane B | command output only unless root assigns `.runtime` path | child-safe hermetic checks only |

## Handoff

- Production owner `/root/sc_williams_v8_executor` completed its bounded implementation slice.
- Lane B completed the authorized regression and SF-ATS dry-run slice.
- Lane A completed the fresh read-only exact-diff review with `CLEAR`.
- Root owns these task records, Git/ref operations, calibration, live gates, candidate commit, integration, push, and final report.

## Next step

Commit the clean calibration candidate, then run the root-owned preregistered non-formal calibration. Preserve both fixed stabilization windows, their full admission decisions and CPU samples, handoff timing, power lifecycle, Job preparation identity, telemetry, and cleanup evidence.
