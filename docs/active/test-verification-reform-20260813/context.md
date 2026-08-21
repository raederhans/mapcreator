# Test Verification Reform Context

## Current truth

- Worktree: `C:\Users\raede\.codex\worktrees\ded1\mapcreator`
- Branch: `codex/p43-fast-verification-runner`
- Starting revision: `132e5b4542eab9e1fabe1d3861575bde458650f3`
- Phase 0 closeout worktree: `C:\Users\raede\.codex\worktrees\be0f\mapcreator`
- Phase 0 branch/base: `codex/verification-j2b-closeout@9869698da5331e9afcc961f42b4666469abe6c46`
- The prior core report planned 92 commands, passed the first 10, and stopped at `verify:test-console-allowlist`.
- `verify:core` currently lacks Git identity, per-command checkpoint, timing, and resume support.
- P4 phase verification already records initial/final SHA and tree and checkpoints command status, while resume and timing remain absent.
- The 339-test state-writer policy TAP took 6,139,150.8 ms; its six largest tests account for 99.12% and repeatedly scan the repository from one manifest test file.

## Decisions and deviations

| Time | Evidence or decision | Impact |
| --- | --- | --- |
| 2026-08-13 | Adopt fail-closed resume keyed by clean Git identity, exact command plan, and SF-ATS invalidation. | Development retries may reuse unaffected evidence; final admission keeps one frozen-tree full run. |
| 2026-08-13 | Stop the orphaned `verify:core -> state-writer-policy` process tree by exact verified PIDs. | Prevented another duplicated multi-hour scan; all unrelated Playwright MCP processes were preserved. |
| 2026-08-13 | Use short simulated runner tests until the implementation stabilizes. | Shared runtime lanes remain available and expensive gates run once near closeout. |
| 2026-08-13 | Preserve only a contiguous passed prefix during resume. | The earliest invalidated or non-passed command starts the full suffix; plan/control/unmatched ambiguity fails closed. |
| 2026-08-13 | Use caller-owned in-process scan cache with cloned results. | Six manifest hotspots share one repository scan while each assertion receives isolated data; cross-process persistence stays out of scope. |
| 2026-08-13 | Add explicit command supersession for exact P4, TNO coverage, and Pages. | Composite gates remove their fully covered constituents from adaptive/supervisor execution plans. |
| 2026-08-13 | Batch metadata selector assertions by changed-file set. | The full metadata behavior file decreased from 21.13 s observed before batching to 8.80 s after batching on the same worktree session. |
| 2026-08-13 | Keep quick, focused, and full P4 policy TAP artifacts separate. | Development checks cannot overwrite the full admission report. |
| 2026-08-13 | Bind every passed command to its post-command clean identity and bind SF-ATS-reused evidence to both source and current applicability identities. | Identity drift, invalid final verdicts, and two-hop resume ambiguity fail closed. |
| 2026-08-13 | Preserve `verify:pages-dist` generation semantics and add `verify:pages-dist-and-drift` for single-build admission. | Existing dist-generation workflows stay compatible while core/adaptive/supervisor avoid the duplicate build. |
| 2026-08-13 | Restrict historical P4.2b/P4.2c supersession to commands they actually execute. | The current P4.3 policy gate remains present whenever historical exact evidence cannot cover it. |
| 2026-08-13 | Continue with three ordered hotspot tasks from `bc3d674a`. | A owns derived-proof reuse; B owns cross-process evidence after A; C owns portfolio reform after A/B. |
| 2026-08-13 | Keep all hour-scale validation under the root supervisor. | Child tasks may run short isolated checks and must return long-gate requests as handoff items. |
| 2026-08-13 | Allow Hotspot A one optional proof-cache parameter pass-through in `tools/check_state_writer_policy.mjs`. | A can cover the two report recomputation paths; B treats that file as A-owned until the exact A diff is admitted. |
| 2026-08-13 | Admit Hotspot A as `13f4849`. | Four identical manifest historical-proof calls share one caller-owned cache; default callers keep live proof behavior. |
| 2026-08-13 | Implement Hotspot B as a lower-risk B1 slice first. | Exact clean-tree checker evidence targets Python boundary duplicates (`11 -> 4` scan roots) while full TAP and P4 direct checkers remain live. |
| 2026-08-13 | Admit Hotspot B as `f6310175`. | Canonical policy evidence is fenced at both ends, identity completeness is explicit, and each runner invocation has one live-producer budget; strict Python consumers validate the expected evidence ID. |
| 2026-08-13 | Hold Hotspot C implementation until B1 admission. | Its strict supersession slice is file-disjoint and projects seven fewer Core top-level commands and eight fewer Node processes. |
| 2026-08-13 | Admit Hotspot C as `0df8698c`. | Core executes seven fewer top-level commands and eight fewer Node leaves with an identical 103-file Node test closure; cyclic or unresolved supersession fails closed. |
| 2026-08-13 | Run the first combined frozen full-policy admission at `b7f9b40e`. | 356/356 passed in 954,768.5944 ms; remaining time is concentrated in two consumers that each receive a cloned full repository-scan graph. |
| 2026-08-13 | Open Hotspot D on the frozen evidence. | Preserve default isolated scan results; allow only audited internal consumers to request one recursively immutable shared result. |
| 2026-08-14 | Reject Hotspot D after the frozen candidate exceeded 30 minutes with an active single manifest worker. | Correctness review passed, but the real graph descriptor audit/deep freeze crossed 1.9x of the 15m55s baseline before completion; root stopped the exact owned process tree and reverted the candidate as `d873c075`. |
| 2026-08-14 | Open Hotspot E on repeated action non-target scanner setup. | Batch about 142 per-binding scans into one call per each of 14 action modules while preserving the exact legacy violation oracle and fail-closed errors. |
| 2026-08-14 | Reject Hotspot E at its predeclared 1.25x frozen wall-clock threshold. | The candidate proved 142-to-14 invocation closure and exact output contracts, but the full policy still ran at about 20 minutes; root stopped the exact owned tree and reverted it as `ed25d341`. |
| 2026-08-14 | Open Hotspot F as a read-only scanner-complexity diagnostic. | Measure single-binding versus multi-binding scaling on real action modules before choosing parse/index reuse, traversal changes, or a no-change outcome. |
| 2026-08-14 | Complete Hotspot F and reject invocation-count-only batching as the next mechanism. | The parser/index already has same-source reuse; repeated binding-independent whole-source preparation is the bounded scanner target. |
| 2026-08-14 | Reject Hotspot G after its frozen candidate crossed the 1.25x wall-clock threshold. | Exact historical blob batching reduced an isolated 47-path sample from 8.14 s to 0.112 s and preserved bytes, but the full manifest worker remained active at 20m45s. Root stopped the exact owned Node tree, preserved the last complete 356/356 TAP, and reverted the candidate as `13c355e9`. |
| 2026-08-14 | Open Hotspot H on source-analysis-owned scanner preparation. | Cache only AST/scope invariants by analysis object identity; keep every binding's resolution, modes, dataflow, traversal, outputs, and error state independent. |
| 2026-08-14 | Integrate Hotspot H as `ed735709` after fixing the fresh-oracle seam. | Real old/new paired benchmarks improve N=33 by 34.8% and N=72 by 50.7%; independent review and all short gates are clear. |
| 2026-08-14 | Treat the H long hotspot run as inconclusive due to timing drift. | The candidate hotspot crossed its historical 1.25x threshold, while an old-worktree manifest invocation in the same period also exceeded 21 minutes. Both exact process trees were stopped with zero residual PIDs, and the complete baseline TAP stayed intact. |
| 2026-08-14 | Open Stage 6I on accidental full-run prevention and progress visibility. | Require an explicit official full-manifest admission path and preserve observable partial progress so focused reviews cannot silently launch the repository-scale suite. |
| 2026-08-14 | Integrate the Stage 6I guard as `267511a`. | Direct manifest execution now fails in under one second with the official focused command; full and focused wrappers remain admitted, quick remains manifest-free, and mechanical ordering keeps the guard before repository setup. |
| 2026-08-14 | Split streaming progress into Stage 6J. | Moving from `spawnSync` to streaming changes signal and process-tree behavior; final TAP atomicity, running/failed artifacts, stderr framing, and Windows teardown require one dedicated contract. |
| 2026-08-14 | Freeze Stage 6J implementation baseline at `69733e43`. | Lane A owns the streaming policy runner and runner regressions; lane B audits Windows lifecycle/termination read-only; lane C audits artifact identity, atomicity, and adversarial cases read-only. Root retains integration and every live-test/process-stop decision. |
| 2026-08-14 | Integrate the Stage 6J-A lifecycle as `2a8d49f2` plus route closure `a69b7c3c`. | The P4-specific async runner publishes mode-isolated running/failure diagnostics and an atomic canonical/completed pair only after close and stream drain; authoritative consumers bind the exact full plan, command, target, bytes, and clean identity. |
| 2026-08-14 | Keep Stage 6J-A preparatory on Windows. | Current production termination covers the root child and records `containmentScope=root-only`, `cleanupVerified=false`, and `admissionEligible=false`. Stage 6J-B/J2 must provide Job Object descendant containment before production admission. |
| 2026-08-14 | Split J2 into compatibility-first J2a and production wiring J2b. | J2a extracts a shared Windows Job Object core while preserving Williams V1 evidence and source identity; J2b adds parent-death/control semantics and wires the P4 runner only after J2a equivalence is frozen. |
| 2026-08-14 | Integrate J2a as `69b17903`. | The nine-line Williams V1 entrypoint delegates to an algorithm-equivalent shared Job Object core. The compiler reads each source once, compiles frozen copies, and binds the actual binary to a canonical ordered source-set carried through preparation, preregistration, block, and manifest evidence. |
| 2026-08-14 | Bind the source identity helper itself into Williams tool identity. | Helper drift now invalidates current, candidate, block, and raw-manifest evidence; the new helper/core route to governance, job-runner, and live perf lanes with zero unmatched files. |
| 2026-08-20 | Re-audit Phase 0 from isolated branch `codex/verification-j2b-closeout@9869698d` in worktree `be0f`. | Current committed code already includes the J2b V2 control protocol and P4 containment wiring from `fccef91b`; production code stays frozen while the exact acceptance gates are rerun. |
| 2026-08-20 | Accept Stage 6J-C/J2b from the current committed implementation after bounded Windows revalidation. | Explicit cancel and parent death both produce zero active, remaining, unverified, or externally alive descendants; helper-crash uncertainty stays blocked and P4 admission requires verified tree-contained evidence. |
| 2026-08-20 | Freeze verification-reform feature expansion after Phase 0 closeout. | Any later verification-platform change must show at least 20% same-environment benefit on the required PR lane, record exact before/after execution sets, prove coverage equivalence for selection changes, and preserve fail-closed contracts. |
| 2026-08-20 | Restore the isolated worktree dependency layer from the committed lockfile. | The first SF-ATS child-safe attempt stopped on missing `acorn`; `npm ci --ignore-scripts --no-audit --no-fund` installed five declared packages, and the final 16-command child-safe plan passed. |

## Live process ownership

| Process | Owner | Log path | State |
| --- | --- | --- | --- |
| core/P4/adaptive runner unit tests | root supervisor | `.runtime/reports/generated/test-verification-reform/` | short isolated commands only |
| full core, full P4 policy, browser, dist, performance | root supervisor | assigned before launch | held until candidate freeze |
| Hotspot A short tests | thread `019ffb53-af53-70f3-9a33-89e6a9a4ecb5`, worktree `cc70` | task-owned `.runtime` only | delivered `3fe5f76f`; integrated by root as `13f4849` |
| Hotspot B implementation | thread `019ffb53-ee12-7f72-9c0e-801190c2cae0`, worktree `269f` | short task-owned outputs only | delivered `f2bfd75a`; integrated and revalidated by root as `f6310175` |
| Hotspot C implementation | thread `019ffb54-8b38-7630-9b13-363cfba20917`, worktree `3121` | task-owned Core list/adaptive reports | delivered `15152ee1`; integrated and revalidated by root as `0df8698c` |
| Hotspot D implementation | thread `019ffb53-af53-70f3-9a33-89e6a9a4ecb5`, worktree `cc70` | short isolated outputs only | correctness clear; performance rejected and reverted as `d873c075` |
| Hotspot E implementation | thread `019ffb53-af53-70f3-9a33-89e6a9a4ecb5`, worktree `cc70` | short isolated outputs only | correctness clear; performance rejected and reverted as `ed25d341` |
| Hotspot F diagnostics | threads `019ffb54-8b38-7630-9b13-363cfba20917` and `019ffb53-ee12-7f72-9c0e-801190c2cae0` | no shared outputs | completed; repeated source-analysis preparation selected |
| Hotspot G implementation | thread `019ffb53-af53-70f3-9a33-89e6a9a4ecb5`, worktree `cc70` | focused tests only; full TAP owned by root | correctness clear; frozen performance rejected, candidate reverted as `13c355e9` |
| Hotspot H implementation | thread `019ffb53-ee12-7f72-9c0e-801190c2cae0`, worktree `269f` | short isolated tests and microbench only | delivered `faf66e53`; integrated and revalidated by root as `ed735709` |
| Hotspot H independent review | thread `019ffb54-8b38-7630-9b13-363cfba20917`, worktree `3121` | read-only diff and short checks | one fresh-oracle blocker fixed; final verdict `H_FINAL_REVIEW_CLEAR` |
| Stage 6J streaming implementation | thread `019ffb53-af53-70f3-9a33-89e6a9a4ecb5`, worktree `cc70` | runner-owned isolated artifacts only; no manifest/full policy | delivered `08fdb7fc`; integrated by root as `2a8d49f2` plus route closure `a69b7c3c` |
| Stage 6J Windows lifecycle audit | thread `019ffb53-ee12-7f72-9c0e-801190c2cae0`, worktree `269f` | read-only; no `.runtime` writes | complete; J2 readiness is `READY_WITH_REQUIRED_WILLIAMS_IDENTITY_MIGRATION` |
| Stage 6J evidence/adversarial audit | thread `019ffb54-8b38-7630-9b13-363cfba20917`, worktree `3121` | read-only; no `.runtime` writes | complete; final verdict `J_C_FINAL_REVIEW_CLEAR` |
| Stage 6J-B/J2a shared Job core | root plus three bounded native subagents, integration worktree `ded1` | short fake/contract tests plus one bounded Windows integration | integrated as `69b17903`; Williams V1 compatibility and exact compiled-source identity clear |
| Stage 6J-C/J2b bounded Windows integration | current `verification-j2b-closeout` task, branch `codex/verification-j2b-closeout`, worktree `be0f` | command `npm run test:node:windows-job-runtime:integration`; log `.runtime/reports/generated/verification-j2b-closeout/windows-job-integration.log`; retained PID evidence `.runtime/reports/generated/verification-j2b-closeout/process-tree-evidence-1787208039654-4bb2a3c8-a216-4273-969b-27636119b808.json`; no ports, databases, shared caches, or checkpoints | complete, exit 0, 5/5; all ten recorded owner/helper/root/descendant PIDs were absent at the external recheck |
| Phase 0 SF-ATS child-safe verification | current `verification-j2b-closeout` task, worktree `be0f` | 13-file Phase 0 scope through `tools/run_adaptive_tests.mjs --execute --defer-main-thread`; JSON/Markdown/log under `.runtime/reports/generated/verification-j2b-closeout/`; current worktree `.runtime` is task-owned | complete, exit 0; 16/16 commands passed, all files matched, route schema 371 passed, and six main-thread/live commands remained deferred |

## Handoff

The root supervisor is the integration owner. Each hotspot task owns only its assigned files and local commit; merge, rebase, cherry-pick, push, worktree cleanup, shared `.runtime` outputs, and long commands remain root-owned.

## Next step

Integrate the Phase 0 docs-only closeout commit before phases 1-3, then retain the complete 356/356 TAP at `b7f9b40e` as the current admission baseline until the final Stage 5b same-environment or CI run produces a newer canonical admission artifact.

## 2026-08-20 phase 0-3 coordination handoff

| Fact or decision | Current evidence |
| --- | --- |
| User authority | Execute all phase 0-3 tasks from the `SC项目推进` diagnosis through separate Codex tasks, then open fresh audit and integration/reporting tasks. |
| Source plan baseline | The Edge conversation diagnosed `origin/main@7ddcee0d613b0210a37e287c77e49c90443bd415`; current repository evidence outranks that snapshot. |
| Root checkout | `main@9a5b25c6c07b05442c8c517457520e5ba610cd18`, ahead of `origin/main@7ddcee0d` by 46 commits. |
| Preserved root WIP | Source/dist scenario presentation and workspace files plus scenario/E2E regression tests are modified. Phase work runs in isolated worktrees from committed `main`; those bytes stay untouched. |
| Existing worktrees | `codex/gate4-pages-reachability-inventory@9fe902d5` is clean; `export-pipeline/mapcreator@de7c9815` is detached and clean. They remain outside phase ownership. |
| Current phase 2 observation | `.github/workflows/verify-shared.yml` already invokes `run_adaptive_tests.mjs --execute --defer-main-thread`; the phase 2 worker must determine the remaining gap against the full phase contract and may deliver an evidence-backed no-op. |
| Integration order | 0 -> 1 -> 2 -> 3, with explicit conflict and semantic-overlap review after each delivery. |
| Live-process owner | Phase 0 `verification-j2b-closeout` owned and completed the bounded Windows Job integration in worktree `be0f`. Browser, dist, performance, full P4, and shared integration `.runtime` checks remain assigned to the final integration/CI owner. |
| Final authority | A fresh independent audit task reviews exact commits. A separate integration task owns refs, ordered integration, final validation, push, registry synchronization, and final report. |

Each execution task must report base and head SHA, branch, status, owned paths, changed files, regression coverage, commands and exit status, artifacts, route gaps, skipped main-thread or CI gates, remaining risk, and recommended integration method. A no-op requires current code and targeted evidence proving the phase contract is already satisfied.

## 2026-08-20 SC phase 0-3 combined candidate

### Current candidate truth

- Worktree: `C:\Users\raede\.codex\worktrees\a82e\mapcreator`.
- Branch: `codex/sc-phases-0-3-candidate`.
- Exact base: `9869698da5331e9afcc961f42b4666469abe6c46`.
- Previous candidate with docs record: `a244c59ed8ce704ecb8ddc738324d2eb094a70b4`.
- Current E code candidate: `be28f8744ccbc5ba5c7b661f47788a3beeb11889`.
- Remote activity: none. `main`, `origin/main`, all other refs/worktrees, and `export-pipeline` remained unchanged.
- Parent `main` still owns its 19 unrelated source/dist/scenario/E2E WIP paths. `tests/test_e2e_structural_tooling.py` was clean in the parent and every other worktree before the authorized D edit.
- Active ownership audit found only the current integration task; it serially owned this branch/index, candidate `.runtime`, selector/adaptive artifacts, P4 quick, and Windows integration.

### Candidate decisions and evidence

| Decision or evidence | Result |
| --- | --- |
| Ordered integration | Eight phase commits were cherry-picked in the authorized 0 -> 1 -> 2 -> 3 sequence. Conflicts were limited to the adaptive runner and core-runner regression file and were resolved by preserving strict Phase 2 planning plus Phase 1 observer checkpoints. |
| Authority seal | Fixed schema/kind identity, presence-aware required authority, reconciled selector/catalog provenance, and unquoted control-separator rejection fail closed before spawn. |
| Final-plan seam | One prepared repository catalog feeds one Phase 3 final-plan call per selected, deferred-main-thread, and deferred-ci-only disposition. Production execution consumes structured executions, dependency edges, lock groups, and provenance directly. |
| Profile projection | Canonical executions project immutable root/leaf/group/process/safety/provenance/dependency/source-order facts. Checkpoints append lifecycle evidence, and canonical operation makes zero legacy analyzer calls. |
| Exact real lane | Sixteen changed files produce unmatched 0, blocked 0, route gaps 0, 237 unique selected leaves, 173 execution groups, and 20 deferred main-thread commands. Full child-safe execution passed all 173 groups. |
| Artifacts | `.runtime/reports/generated/sc-phases-0-3-candidate/{selector,adaptive-dry-run,adaptive-execute}.{json,md}` plus `adaptive-dry-run-profile.json` and `adaptive-execute-profile.json`. |
| Bounded live evidence | P4 quick passed 260/260. Windows Job V2 passed 5/5 on bounded retry with zero residual target processes. Core list wrote `.runtime/reports/generated/verify-core.json` with 82 commands. |
| Remaining admission | Full P4/Stage 5b, full Core, browser, performance, scenario-data, CI, and real Pages generation remain open. Pages generation is held because it writes tracked `dist` content outside this candidate boundary. |
| Independent review HIGH | Review `01a01fa5-f27a-7553-8385-9427313b6f43` blocked `a244c59e`: workflow selector output omitted repository catalog bindings and carried 323 selector-only authority commands, so the 331-command adaptive strict reader failed before spawn. |
| E producer/consumer closure | `be28f874` moves selection binding into the Phase 3 portfolio boundary. Selector CLI and adaptive main both use the same prepared repository binding; the workflow YAML remains unchanged. Four independent binding drifts remain zero-spawn. |
| E bound artifacts | `.runtime/reports/generated/sc-phases-0-3-candidate-e/` contains the real selector artifact plus bound dry-run/execute JSON, Markdown, and profiles. The selector has 331 authority commands and 233 roots; execute loaded `selectionArtifact`, passed 173/173 groups, and published a complete 237-leaf profile. |

### Live process ownership closeout

| Process | Owner | Artifact | State |
| --- | --- | --- | --- |
| exact 16-file adaptive dry-run/execute | current combined-candidate task | `.runtime/reports/generated/sc-phases-0-3-candidate/` | complete; execute exit 0; 173/173 groups passed |
| exact 16-file bound selector/dry-run/execute after E | current combined-candidate task | `.runtime/reports/generated/sc-phases-0-3-candidate-e/` | complete; selector/dry-run/execute exit 0; artifact authority 331; 173/173 groups passed; task processes and locks 0 |
| P4 quick | current combined-candidate task | `.runtime/reports/generated/p4-state-actions/P4.0/state-writer-policy-tests.quick.tap` | complete; 260/260 passed |
| Windows Job V2 integration | current combined-candidate task | test-owned temporary containment evidence | complete; 5/5 passed; residual target processes 0 |
| full P4/Core/browser/perf/scenario/Pages | final integration or CI owner | assigned at launch | open |

## 2026-08-21 Williams journal atomic-publication handoff

| Fact | Evidence |
| --- | --- |
| Ownership | Isolated implementation branch `codex/fix-williams-journal-atomic-replace` in worktree `b42a`, exact base `d1f7c9c3ae0257c056aea8fb1a968a3db40ce7cb`; candidate `a82e` and control `045e` stayed read-only. |
| Direct root cause | PowerShell binds ordinary `$null` to an empty string for a .NET string parameter. Both `File.Replace(source, destination, $null, true)` and its three-argument form raised `System.ArgumentException`; `System.Management.Automation.Language.NullString.Value` passed the true null accepted by the documented API. |
| Production change | `Write-WilliamsPowerSchemeSession` keeps same-directory temporary creation, UTF-8 without BOM, `File.Replace` for existing targets, `File.Move` for first publication, and finally cleanup; only the null-string representation changed. |
| Regression | A real journal receives two consecutive checkpoints, retains valid JSON, then survives a read-only-destination publication failure with the prior checkpoint intact and zero `*.tmp` files, and finally accepts a fourth atomic replacement with one journal file remaining. |
| Static and child-safe verification | Focused regression passed; Williams governance `44/44`; Job runner `16 passed / 1 explicit live skip`; metadata `31/31`; final adaptive execution passed eight canonical commands with `unmatchedChangedFiles=[]` and `routeGaps=[]`. |
| Cross-runtime evidence | Windows PowerShell 5.1 / CLR 4.0 runs the production regression and live preflight; PowerShell 7.6 / .NET 10 completed two writes to the same existing journal with zero temporary files. |
| Live preflight | Sole owner `codex/fix-williams-journal-atomic-replace`; log `.runtime/reports/generated/williams-journal-fix-live-preflight.log`; exit 0 with lifecycle and cleanup valid, Balance restored, temporary GUID absent, and ports 8000/8892 plus matching process set empty. |
| Deferred admission | The complete 32-sample Williams crossover, live telemetry, and standard perf experiment remain assigned to the final integration owner. |
