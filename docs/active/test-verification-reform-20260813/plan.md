# Test Verification Reform Plan

## Goal

Reduce repeated verification time while preserving fail-closed coverage and auditable admission evidence.

## Scope

- Add revision-bound command checkpoint and resume support to long serial verification runners.
- Reuse SF-ATS changed-file routing to invalidate stale command evidence across clean Git revisions.
- Add per-command timing and durable progress reporting to affected runners.
- Audit the existing test catalog for repeated repository scans, overlapping gates, low-value rigid assertions, and missing fast/focused entrypoints.
- Optimize the dominant state-writer policy scan path without weakening its closed-world contract.

## Sources of truth

- `tools/verification/verification_domains.mjs`
- `tools/select_verification_targets.mjs`
- `tools/run_core_verification.mjs`
- `tools/run_p4_phase_verification.mjs`
- `tools/run_adaptive_tests.mjs`
- `tools/ai_test_supervisor/supervise_adaptive_verification.mjs`
- `.runtime/reports/generated/verify-core.json`
- `.runtime/reports/generated/p4-state-actions/P4.0/state-writer-policy-tests.tap`
- Project `AGENTS.md` SF-ATS verification contract

## Stages

- [x] Stage 1: Define and test the shared fail-closed resume and checkpoint contract.
- [x] Stage 2: Integrate the contract into core and adjacent long-running verification entrypoints.
- [x] Stage 3: Profile and reduce repeated state-writer repository scans.
- [x] Stage 4: Audit route metadata, gate overlap, timing budgets, and focused test entrypoints.
- [x] Stage 5a: Run targeted regression, adaptive selection, and independent review.
- [ ] Stage 5b: Run one final admission suite on the frozen candidate.

## Acceptance criteria

- Interrupted same-tree runs resume without repeating passed commands.
- Clean changed-tree runs reuse only commands whose command identity and routed domains remain unaffected.
- Dirty trees, unmatched paths, plan drift, identity drift, and missing evidence block reuse.
- Reports persist pending, running, passed, failed, reused, duration, source revision, and invalidation reason per command.
- Long runner unit tests cover interruption, same-tree resume, changed-tree invalidation, and fail-closed cases.
- The state-writer policy suite retains all closed-world assertions with materially fewer repeated full repository scans, or records a concrete validated blocker.
- SF-ATS routes every production or verification file changed by this work with zero unmatched files.

## Non-goals

- Removing deterministic admission coverage solely to improve elapsed time.
- Broadening timeout, console, or route allowlists.
- Running browser, dist, performance, or full policy suites before the candidate and live-test lane are stable.
- Replacing the existing Williams Windows Job Object runtime with a generalized process-containment layer in the same diff.

## Risks and constraints

- Resume evidence crossing revisions must be derived from committed clean trees and complete SF-ATS route coverage.
- Shared `.runtime` outputs, browser processes, dist mirrors, and policy TAP reports require one live-process owner.
- A cached repository scan must remain immutable or isolated so tests cannot influence one another.
- Existing user and worktree changes outside this task remain untouched.
