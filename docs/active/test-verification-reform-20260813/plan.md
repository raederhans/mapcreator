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
- [x] Stage 6J-C / J2b: Add parent-death/control semantics and wire verified descendant cleanup into P4 production admission.
- [ ] Stage 5b: Run one final admission suite on the frozen candidate.

### 2026-08-20 governance execution baseline

The user authorized coordinated execution of phases 0-3 from the `SC项目推进` diagnosis. The source conversation used `origin/main@7ddcee0d613b0210a37e287c77e49c90443bd415`; each lane must re-audit current `main@9a5b25c6c07b05442c8c517457520e5ba610cd18` before changing code because later local commits may already satisfy part of a phase.

- [x] Phase 0 / `verification-j2b-closeout`: finish J2b parent-death, explicit-cancel, and verified zero-descendant cleanup; then freeze verification-platform feature expansion.
- [x] Phase 1 / `chore/verification-baseline`: emit a thin stable profile for wall time, normalized executed files and counts, process starts, selector planned versus executed closure, cache outcomes, meta/product split, and top-ten slow commands/files without changing the selected execution set.
- [x] Phase 2 / `fix/pr-fast-use-selector`: audit the current adaptive `pr-fast` path, close remaining selector-to-execution gaps, preserve fail-closed unmatched/route-gap behavior, and retain heavy/full coverage as shadow, nightly, sampled, or main-thread work.
- [x] Phase 3 / `fix/test-leaf-deduplication`: establish canonical leaf expansion and structural duplicate rejection; converge test catalog sources only to the smallest phase-complete boundary supported by current code and tests.

Execution order is phase 0, phase 1, phase 2, phase 3 for integration. Work may proceed in isolated worktrees when file ownership remains disjoint. Later phases must report overlap and dependency on earlier commits rather than silently absorbing them.

### Verification-reform feature freeze — 2026-08-20

Stage 6J-C closes verification-platform feature expansion for this reform. Any later verification-platform change must provide same-environment before/after evidence from the required PR lane showing at least 20% improvement in its declared primary metric. The evidence package must identify the exact before/after execution sets, mechanically prove coverage equivalence for any selection change, and preserve fail-closed unmatched and route-gap behavior, required admission semantics, and current allowlist and timeout boundaries.

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
- Any post-freeze verification-platform change demonstrates at least 20% benefit on the required PR lane with exact comparable before/after evidence, mechanically proven coverage equivalence for selection changes, and preserved fail-closed contracts.

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

## SC phase 0-3 combined candidate — 2026-08-20

- Local integration branch: `codex/sc-phases-0-3-candidate`.
- Exact base: `9869698da5331e9afcc961f42b4666469abe6c46`.
- Previous docs-record candidate `a244c59ed8ce704ecb8ddc738324d2eb094a70b4` received `REQUEST CHANGES / BLOCK` from independent review `01a01fa5-f27a-7553-8385-9427313b6f43` because the PR-fast selector CLI artifact lacked repository catalog bindings.
- E code candidate: `be28f8744ccbc5ba5c7b661f47788a3beeb11889`.
- Local integration owner: the current combined-candidate task owns this branch, index, worktree `.runtime`, adaptive artifacts, and serialized live gates.
- Phase order is preserved through eight ordered delivery commits followed by authority seal, canonical planner wiring, canonical profile projection, lane-local uniqueness closure, and the authorized structural-fixture refresh.
- E makes selector CLI production output and adaptive consumption share one repository catalog preparation/binding helper. The real selector artifact carries a 331-command reconciled authority, catalog digest, source identity, and 233-root selector set; strict drift remains a zero-spawn failure.
- The exact 16-file bound-artifact dry-run reports `selectionArtifact` loaded, `unmatched=0`, `blocked=0`, `routeGaps=0`, 204 selected roots, 237 unique selected leaves, 173 execution groups, 17 deferred-main roots, and three planner invocations.
- The exact 16-file bound-artifact child-safe execution passed all 173 groups. Its canonical profile reports 237/237 leaves, 227/227 files, `comparison=complete`, 173 process starts, and zero analysis issues.
- Main-thread ownership remains explicit for 20 deferred commands. Full P4/Stage 5b, browser, performance, scenario-data, and real Pages generation remain final integration or CI admission work.
- Real Pages generation stays outside this candidate validation because the builder writes tracked `dist` files; the sealed final plan proves the exact build -> contract -> Node tests -> drift dependency chain.

## Williams session-journal admission repair — 2026-08-21

- [x] Freeze the repair base at `d1f7c9c3ae0257c056aea8fb1a968a3db40ce7cb` in isolated worktree `b42a` and preserve the `a82e` candidate plus `045e` control worktrees.
- [x] Reproduce the existing-journal failure with ordinary files under `.runtime/tmp` on Windows PowerShell 5.1 / .NET Framework 4.8.1 and PowerShell 7.6 / .NET 10.
- [x] Extend the existing Williams governance suite with real-file-system coverage for consecutive checkpoints, existing-target atomic replacement, UTF-8 without BOM, valid JSON, failed-publication cleanup, retained prior journal content, and a later successful replacement.
- [x] Preserve `File.Replace` publication and pass a true null string through `System.Management.Automation.Language.NullString.Value`.
- [x] Run focused RED/GREEN, Williams governance and Job runner regressions, verification metadata, SF-ATS child-safe execution, PowerShell 7 compatibility, and the serialized live power-scheme preflight.
- [x] Fast-forward the repair commits into the final candidate and launch the complete 32-sample Williams crossover under the designated integration owner; the single run stopped fail-closed at block 01.

The repair acceptance boundary keeps performance thresholds, retry policy, power-scheme ownership, journal replay, cleanup, and fail-closed recovery semantics unchanged. The full crossover remains the final live admission measurement.

## SC phase 0-3 final admission BLOCK — 2026-08-21

- [x] Fast-forward `codex/sc-phases-0-3-candidate` from `d1f7c9c3ae0257c056aea8fb1a968a3db40ce7cb` to the exact reviewed combined candidate `e602cf4fb1bb68b5692e58f8a8151223349b4135`.
- [x] Re-audit all worktrees and refs, fresh-fetch `origin/main@7ddcee0d613b0210a37e287c77e49c90443bd415`, verify its ancestry to the candidate, and preserve the parent checkout at `main@9869698da5331e9afcc961f42b4666469abe6c46`.
- [x] Reuse the already closed Windows Job V2, full P4, full Core, P4.3, browser/scenario, Pages/dist, live telemetry, and power-scheme preflight artifacts.
- [x] Run exactly one full Williams command with detached `045e@9869698d` as control and detached `a82e@e602cf4` as candidate, using new `17-williams-crossover-*` outputs and the frozen thresholds.
- [x] Preserve the partial raw evidence, restore Balance, remove the run-owned temporary power scheme, return a82e to the candidate branch, and verify both measurement worktrees clean.
- [ ] Complete 8/8 Williams blocks and 32/32 raw samples with acceptance and regression verdicts.
- [ ] Push the final candidate to `origin/main` and observe required GitHub checks.

Stage 5b remains open. The single Williams attempt exited `3` after block 01 produced 4/32 raw samples and 0/8 completed blocks. The control baseline rejected the Williams two-run configuration against the canonical five-run role contract, and Windows PowerShell 5.1 failed to decode the BOM-less UTF-8 lifecycle journal with its default reader. Final report generation, performance acceptance, push, and remote CI stayed beyond the fail-closed admission boundary.

## Williams nested-admission alignment repair — 2026-08-21

- [x] Reproduce and mechanically cover the contract gap where the Williams pre-block quiet window admits an environment that the immediately following standard performance admission rejects.
- [x] Make the pre-block decision use the standard admission policy's CPU average, CPU peak, top-process single-core, memory, power, and Git requirements without broadening any threshold or allowlist.
- [x] Preserve the baseline runner's independent fail-closed admission, Williams Job Object containment, power-scheme lifecycle, exact revision identity, raw evidence contract, and exit-code meanings.
- [x] Ensure a pre-block rejection happens before Job preparation or the block workload starts and records a typed, auditable invalid-experiment result with valid zero-spawn cleanup.
- [x] Add deterministic regressions for average CPU, peak CPU, top-process, memory, power, Git, accepted parity, collector failure, forged admitted envelopes, and zero workload spawn on rejection.
- [x] Run focused Williams governance, role/perf/Job contracts, syntax, SF-ATS dry-run and child-safe execution; reserve every browser/perf/live lane for the root owner.
- [x] Freeze `841801cd45e7bf5c9869e780bb4e338da346890c` and obtain independent code-reviewer plus architect/verifier verdicts. Both lanes block live admission on two P2 evidence gaps.
- [x] Repair validator-invalid stderr detail and add a direct missing pre-block admission raw-root regression in `c61ecb86190374c98be1863e06e8e180182fff04`.
- [x] Re-run syntax, focused RED/GREEN, Williams 71/71, Job 16 plus one live skip, role 82/82, perf 26/26, and exact two-file SF-ATS 7/7 groups plus 9/9 leaves with zero unmatched, blocked, route, or CI-only gaps.
- [ ] Freeze the task-record-sealed SHA, obtain fresh independent code-reviewer and architect/verifier clearance in the existing review task, and request a new live lifecycle for the cleared SHA.

The repair starts from `a97d4574fc2e964876a9dc17ea792d93ec24ad9d`. Code commits `102dfd4522efa198ce577c029037771c4dd0726b` and `60c3352b026d495e30709694d6e092cc222da119` implement the nested admission alignment and close the subsequent pre-Job ordering, fixed-oracle, and strict `not-started` evidence gaps. The first coordinated review at `841801cd45e7bf5c9869e780bb4e338da346890c` found two P2 evidence gaps; `c61ecb86190374c98be1863e06e8e180182fff04` closes both with direct regressions. Post-P2 verification passed Williams governance 71/71, Job runner 16 pass plus one explicit live skip, role policy 82/82, perf contracts 26/26, and all seven SF-ATS child-safe groups covering nine canonical leaves; unmatched files, blocked verification entries, route gaps, and CI-only roots are zero. The previous two full Williams lifecycles remain immutable evidence: live1 stopped at block 02 on standard CPU admission, and live2 stopped at block 01 on standard CPU plus top-process admission. A third execution against `a97d4574` is prohibited. Any future live run requires the new task-record-sealed candidate, fresh independent review, clean measurement worktrees, and a newly recorded lifecycle authority.
