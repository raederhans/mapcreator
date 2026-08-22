# SC Williams v8 Stabilization Plan

## Goal

Repair the Williams execute protocol so one exact candidate can produce a policy-valid, fail-closed eight-block crossover experiment, then re-run the exact-revision performance, review, live, integration, push, and CI gates required to close SC Phase 0–3.

## Scope

- Replace the contradictory v7 Job runner / power lifecycle ordering with a versioned v8 protocol.
- Add a one-attempt preparation admission before Job compilation and capability probing.
- Add fixed, preregistered initial and inter-block stabilization with auditable receipts and zero formal retries.
- Update the raw manifest and analyzer to reject missing, extra, reordered, retried, or timing-drifted evidence.
- Revalidate the new SHA with SF-ATS, an enforcing performance gate, independent reviews, Windows live gates, and a fresh 8-block / 32-raw Williams run.
- Integrate through a fresh worktree based on current `origin/main`, push normally, and verify remote CI before Phase 4 and Phase 5 begin.

## Sources of truth

- Checked-out source and tests in `C:\Users\raede\.codex\worktrees\sc-williams-v8-stabilization-fix\mapcreator`.
- Historical immutable evidence under the f1 candidate's `.runtime/reports/generated/sc-phases-0-3-final-f1e5/`.
- Exact base candidate `f1e5bf5748b0658cf6674ab5a067187a90475e43` and control `9869698da5331e9afcc961f42b4666469abe6c46`.
- This directory for cross-heartbeat plan, task state, ownership, and handoff facts.

## Stages

- [x] Stage 1: Freeze f1 evidence and diagnose three Williams invalid experiments.
- [x] Stage 2: Create isolated repair branch/worktree and assign bounded implementation/review ownership.
- [x] Stage 3: Implement and test the v8 preparation, power, preregistration, stabilization, and raw-evidence contract.
- [ ] Stage 4: Calibrate and freeze the fixed stabilization duration with non-formal engineering evidence.
- [ ] Stage 5: Commit the clean candidate, then complete exact-SHA SF-ATS, fresh enforcing gate, independent review, and Windows live gates.
- [ ] Stage 6: Complete a fresh formal Williams experiment with 8/8 blocks and 32/32 measured raw files.
- [ ] Stage 7: Integrate on current `origin/main`, push, verify remote/CI, and hand off Phase 4 and Phase 5.

## Acceptance criteria

- Preparation order is `admission -> compile -> capability probe -> power activation -> preregistration` and each step is proven by immutable timestamps and identities.
- Preparation admission, every block admission, and every workload spawn have exactly one attempt; rejection terminates the fresh raw root as `invalid-experiment`.
- One initial and seven inter-block stabilization receipts match the preregistered policy, elapsed-time tolerance, sequence, and attempt count.
- The analyzer rejects v7/v8 mixing and every missing, extra, duplicate, retry, ordering, timing, identity, cleanup, or lifecycle mismatch.
- The new exact SHA passes child-safe verification, a fresh enforcing performance gate, two independent reviews, Windows live gates, and formal Williams admission.
- Final integration preserves parent WIP, uses no force push or history rewrite, and verifies the exact remote SHA and CI state.

## Non-goals

- No product-performance threshold, CPU admission threshold, console allowlist, or timeout relaxation.
- No reuse, overwrite, resume, or promotion of final-01, final-02, final-03, gate-window-11, or partial block evidence.
- No user-window closure, Windows system-task termination, production deployment, or changes to `engagement_project`.

## Risks and constraints

- Choosing a delay from successful formal windows would create sample-selection bias; calibration must be non-formal and frozen before the formal run.
- The repair creates a new candidate SHA, so f1 performance and review artifacts remain historical evidence only.
- Parent `main` contains 19 unrelated WIP paths and remains outside all edits, staging, and integration work.
- Root owns refs, worktrees, commits, `.runtime` live lanes, power changes, integration, push, and final verdict; collaborators have bounded file ownership.
