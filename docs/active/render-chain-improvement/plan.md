# Render Chain Improvement Plan

## Intent
Improve the render-chain performance work in two guarded stages: first make benchmark reports trustworthy, then optimize the proven hot path around post-scenario visible-frame recovery.

## Acceptance Criteria
- Benchmark reports identify the served runtime, workload, metric validity, and sample spread.
- `singleFillAction` is marked invalid when no action was recorded.
- `settleExact`, `hitCanvas`, chunk promotion, and interaction recovery expose enough timing details to guide fixes.
- Runtime behavior remains unchanged for scenario apply, map fill, double-click fill, chunk visibility, and hit detection.
- Source/dist synchronization is verified when packaged files are touched.

## Work Items
- [x] Add active task docs and Ralph context snapshot.
- [x] Harden editor benchmark report identity and invalid metric handling.
- [x] Harden perf gate workload identity and sample spread reporting.
- [x] Add renderer hot-path timing breakdown.
- [x] Add `politicalRecoveryQuality` with default progressive mode and exact query override.
- [x] Keep startup/chunk recovery current-viewport political background usable while deferring full fine cache work to idle slices.
- [x] Keep hit/interaction correctness scoped to current viewport and existing overscan.
- [x] Run targeted contract tests and source/dist verification.
- [x] Run performance benchmarks and record before/after evidence.
- [x] Review changed files for simpler and safer implementation.

## Live Process Ownership
Main agent owns all builds, browser benchmarks, perf gates, and long tests for this task. Subagents may inspect files and propose tests, but they must not run or monitor live processes.
