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
- [x] Stage 6J-B / J2a: Extract a Williams-compatible shared Windows Job Object core with exact source-set identity.
- [ ] Stage 6J-C / J2b: Add parent-death/control semantics and wire verified descendant cleanup into P4 production admission.
- [ ] Stage 5b: Run one final admission suite on the frozen candidate.

### 2026-08-20 governance execution baseline

The user authorized coordinated execution of phases 0-3 from the `SC项目推进` diagnosis. The source conversation used `origin/main@7ddcee0d613b0210a37e287c77e49c90443bd415`; each lane must re-audit current `main@9a5b25c6c07b05442c8c517457520e5ba610cd18` before changing code because later local commits may already satisfy part of a phase.

- [ ] Phase 0 / `verification-j2b-closeout`: finish J2b parent-death, explicit-cancel, and verified zero-descendant cleanup; then freeze verification-platform feature expansion.
- [ ] Phase 1 / `chore/verification-baseline`: emit a thin stable profile for wall time, normalized executed files and counts, process starts, selector planned versus executed closure, cache outcomes, meta/product split, and top-ten slow commands/files without changing the selected execution set.
- [ ] Phase 2 / `fix/pr-fast-use-selector`: audit the current adaptive `pr-fast` path, close remaining selector-to-execution gaps, preserve fail-closed unmatched/route-gap behavior, and retain heavy/full coverage as shadow, nightly, sampled, or main-thread work.
- [ ] Phase 3 / `fix/test-leaf-deduplication`: establish canonical leaf expansion and structural duplicate rejection; converge test catalog sources only to the smallest phase-complete boundary supported by current code and tests.

Execution order is phase 0, phase 1, phase 2, phase 3 for integration. Work may proceed in isolated worktrees when file ownership remains disjoint. Later phases must report overlap and dependency on earlier commits rather than silently absorbing them.

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
- Stage 6J-B/J2a preserves Williams V1 assign-before-resume, kill-on-job-close, no-breakaway, timeout, argv, and cleanup evidence while binding the compiled binary to the exact ordered entrypoint/core bytes.
- Stage 6J-C/J2b requires parent-death and explicit-cancel control plus terminal evidence showing zero remaining or unverified descendants before P4 production admission becomes eligible.
- Phase 0 interruption and cancel evidence records `remainingPids=[]`, `unverifiedPids=[]`, fail-closed cleanup uncertainty, mode-correct artifact identity, and a passing bounded Windows integration regression.
- Phase 1 produces deterministic profile evidence while preserving the exact selected command set and exposing duplicate normalized leaf execution.
- Phase 2 makes `pr-fast` execute current selector output with zero unmatched files and route gaps; selected and deferred/main-thread ownership remains explicit.
- Phase 3 makes one normalized leaf appear at most once in a lane and fails during plan generation on duplicate, cyclic, or unresolved expansion.
- Every phase runs or dry-runs SF-ATS adaptive selection, adds route coverage for any unmatched production file, and reports all main-thread or CI-only gates left open.

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
