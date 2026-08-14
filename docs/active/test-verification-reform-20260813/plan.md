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
- [x] Stage 6A: Cache exact historical derived-alias proofs with complete identity invalidation.
- [x] Stage 6B: Reuse revision-bound policy evidence across Python, P4, and Core process boundaries.
- [x] Stage 6C: Reform the remaining test portfolio from measured timing and coverage-equivalence evidence.
- [x] Stage 6D: Evaluate immutable shared repository-scan graphs and reject the real-graph performance regression.
- [x] Stage 6E: Evaluate action non-target batching and reject the frozen wall-clock regression.
- [x] Stage 6F: Profile scanner scaling and choose a measured follow-up.
- [x] Stage 6G: Evaluate batched historical Git source reads and reject the frozen full-policy regression.
- [x] Stage 6H: Reuse source-analysis-owned immutable scanner preparation while preserving per-binding dataflow.
- [x] Stage 6I: Require explicit official-runner admission before the repository-scale manifest suite can start.
- [x] Stage 6J-A: Expose durable partial progress and atomic terminal artifacts for long policy runs.
- [ ] Stage 6J-B / J2: Add Windows Job Object descendant containment and verified cleanup before production admission.
- [ ] Stage 5b: Run one final admission suite on the frozen candidate.

## Acceptance criteria

- Interrupted same-tree runs resume without repeating passed commands.
- Clean changed-tree runs reuse only commands whose command identity and routed domains remain unaffected.
- Dirty trees, unmatched paths, plan drift, identity drift, and missing evidence block reuse.
- Reports persist pending, running, passed, failed, reused, duration, source revision, and invalidation reason per command.
- Long runner unit tests cover interruption, same-tree resume, changed-tree invalidation, and fail-closed cases.
- The state-writer policy suite retains all closed-world assertions with materially fewer repeated full repository scans, or records a concrete validated blocker.
- SF-ATS routes every production or verification file changed by this work with zero unmatched files.
- Stage 6A preserves byte-equivalent policy output while reducing repeated historical proof executions for identical inputs.
- Stage 6B rejects dirty, stale, plan-drifted, phase-drifted, or artifact-incomplete evidence before any cross-process reuse.
- Stage 6C keeps every deterministic admission contract reachable while reducing duplicate commands, processes, or setup work.
- Stage 6D preserves isolated results by default and exposes shared scan results only through an explicit, mechanically immutable contract.
- Stage 6E reduces non-target scanner invocations from per-binding setup to one batch per action module while preserving violation order, attribution, evidence, coordinates, diagnostics, and fail-closed behavior.
- Stage 6F records bounded real-module scaling for single-binding and multi-binding paths, and any follow-up must improve that measured mechanism without weakening the exact policy oracle.
- Stage 6G preserves ordered exact blob bytes, missing-path semantics, bounded buffering, SHA/path provenance, and reader selection while reducing historical source-reader Git processes; frozen full-policy wall time remains the admission gate.
- Stage 6H keeps resolution, target-owner closure, taint mode, current-contract recognition, traversal state, findings, diagnostics, and delegations binding-local while reusing only analysis-identity invariants.
- Stage 6J-A keeps the canonical full/quick/focused TAP as terminal complete evidence, exposes mode-isolated running and failed/interrupted artifacts, never promotes stale or partial output to pass evidence, and records the current Windows lifecycle honestly as `root-only` with unverified cleanup.
- Stage 6J-B requires assign-before-resume Windows Job Object containment, parent-death and explicit-cancel control, and terminal evidence showing zero remaining or unverified descendants before production admission becomes eligible.

## Non-goals

- Removing deterministic admission coverage solely to improve elapsed time.
- Broadening timeout, console, or route allowlists.
- Running browser, dist, performance, or full policy suites before the candidate and live-test lane are stable.
- Replacing the existing Williams Windows Job Object runtime inside the Stage 6J-A streaming diff.
- Expanding Stage 6C beyond mechanically proven command closure before frozen-candidate timing evidence exists.

## Risks and constraints

- Resume evidence crossing revisions must be derived from committed clean trees and complete SF-ATS route coverage.
- Shared `.runtime` outputs, browser processes, dist mirrors, and policy TAP reports require one live-process owner.
- A cached repository scan must remain immutable or isolated so tests cannot influence one another.
- Historical-proof and cross-process caches must expose their identity and invalidation decisions in durable evidence.
- Existing user and worktree changes outside this task remain untouched.
