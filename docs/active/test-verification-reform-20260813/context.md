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

## 2026-08-21 SC phase 0-3 final admission BLOCK

### Exact candidate and remote state

- Integration worktree: `C:\Users\raede\.codex\worktrees\a82e\mapcreator`.
- Candidate branch fast-forward path: `d1f7c9c3ae0257c056aea8fb1a968a3db40ce7cb -> 095455713e18a911dcb85762ad9767d411c2ca4d -> e602cf4fb1bb68b5692e58f8a8151223349b4135`.
- Control: `C:\Users\raede\.codex\worktrees\045e\mapcreator`, detached and clean at `9869698da5331e9afcc961f42b4666469abe6c46`.
- Fresh fetch and `ls-remote` both exited `0`; `origin/main` remained `7ddcee0d613b0210a37e287c77e49c90443bd415` and is an ancestor of `e602cf4`.
- Parent checkout remained `main@9869698d` with the frozen 19-path / 977-line tracked WIP and canonical diff SHA-256 `aea020b4130165870c07e4d92e5cf87454f4e9776bfffc1feec69aec1370e661`.

### Williams sole-owner execution

The current integration task exclusively owned `.runtime-output`, `browser-dev-server`, `perf-dev-server`, `playwright-browser`, and `system-power-scheme`. Both measurement worktrees were detached, clean, and bound to their expected SHAs. Ports 8000/8892, matching Williams/baseline processes, Git locks, prior temporary schemes, and the expected-scheme environment variable were clear before launch.

```powershell
npm run perf:williams-crossover:run -- --control-worktree C:\Users\raede\.codex\worktrees\045e\mapcreator --candidate-worktree C:\Users\raede\.codex\worktrees\a82e\mapcreator --control-head 9869698da5331e9afcc961f42b4666469abe6c46 --candidate-head e602cf4fb1bb68b5692e58f8a8151223349b4135 --raw-root C:\Users\raede\.codex\worktrees\a82e\mapcreator\.runtime\reports\generated\sc-phases-0-3-final-admission\17-williams-crossover-raw --json-out C:\Users\raede\.codex\worktrees\a82e\mapcreator\.runtime\reports\generated\sc-phases-0-3-final-admission\17-williams-crossover-report.json --md-out C:\Users\raede\.codex\worktrees\a82e\mapcreator\.runtime\reports\generated\sc-phases-0-3-final-admission\17-williams-crossover-report.md
```

The command ran once and exited `3`. Block 01 ran the control baseline with `--runs 2 --warmups 1`; `run_baseline.mjs` rejected the canonical render role because the role contract requires five runs. The block wrote 4/32 raw samples, returned exit `1`, and completed Job Object cleanup with zero remaining or unverified PIDs. Completed blocks remained 0/8.

The automatic power-scheme stop encountered a second blocker. `power-scheme-lifecycle.json` is valid BOM-less UTF-8 and parses successfully when Windows PowerShell 5.1 receives `-Encoding UTF8`; its default `Get-Content` decoding corrupts the localized Chinese `powercfg` strings and causes `ConvertFrom-Json` to fail at position 933. The task restored Balance, deleted run-owned GUID `2f91656c-3eb3-4315-b1ef-20ab6f3f1245`, verified that GUID absent, and confirmed zero task-owned processes and zero listeners. Candidate a82e returned to its branch clean at `e602cf4`; control remained detached and clean.

### Preserved evidence

- `.runtime/reports/generated/sc-phases-0-3-final-admission/17-williams-crossover.stdout.log`
- `.runtime/reports/generated/sc-phases-0-3-final-admission/17-williams-crossover.stderr.log`
- `.runtime/reports/generated/sc-phases-0-3-final-admission/17-williams-crossover-owner.json`
- `.runtime/reports/generated/sc-phases-0-3-final-admission/17-williams-crossover-system-recovery.md`
- `.runtime/reports/generated/sc-phases-0-3-final-admission/17-williams-crossover-raw/`

The early stop occurred before raw-manifest publication and final JSON/Markdown report generation, so acceptance and regression verdicts remain unavailable.

### Reused closed gates

| Gate | Exact evidence |
| --- | --- |
| Windows Job V2 | `01b-windows-job-runtime-integration-retry.stdout.log`: 5/5 passed. |
| Full P4 state-writer | `02-full-p4-state-writer-policy.stdout.log`: 403/403 passed. |
| Full Core main-thread | `03-full-core-main-thread.stdout.log`: 86 commands completed, including Playwright main-thread coverage. |
| Power scheme and telemetry | `04a-williams-power-scheme-live-preflight.stdout.log` completed; `04b-williams-crossover-telemetry-live.stdout.log`: 2/2 passed. |
| P4.3 canonical admission | `05-p4-3-canonical-admission.stdout.log`: 403/403 policy tests, five phase commands, unmatched 0, route gaps 0. |
| Browser/scenario recovery | `06-political-progressive-recovery.stdout.log`: 3/3 passed; `14-scenario-chunk-runtime.stdout.log`: 8/8 passed in 2.3 minutes, including the 17.2-second stable invalidation assertion. |
| Stage 5 and TNO ready | `08-stage5-visual-acceptance.stdout.log`: 1/1 passed; `09-tno-ready-state.stdout.log`: 5/5 passed. |
| Pages/public | Pages/dist completed inside the full Core lane; `10b-pages-public-release-gate-local.stdout.log`: local public release gate 1/1 passed with zero console or network issues. |

### Disposition and handoff

Admission status is `BLOCK`. The full Williams performance decision, normal push to `origin/main`, deployed Pages check, and GitHub Actions observation stayed unrun. A new repair task must align the Williams two-run experiment with the control canonical-role contract and make the Windows PowerShell 5.1 journal reader encoding explicit, then submit a fresh exact candidate for independent review and a newly authorized admission run.

The docs-only SF-ATS pass selected `node --test tests/verify_core_runner_behavior.test.mjs` as its sole child-safe group. Dry-run and execution exited `0`; 56/56 tests passed with one Node process start, complete execution-set comparison, zero unmatched files, zero blocked verification entries, and zero route gaps. Artifacts use `.runtime/reports/generated/sc-phases-0-3-final-admission/18-final-admission-docs-*`.

## 2026-08-21 Williams nested-admission alignment handoff

| Fact | Current authority and evidence |
| --- | --- |
| User authority | Continue from the second Williams invalid-experiment into a code-changing repair cycle; keep each phase at no more than three visible tasks. |
| Conversation budget | Phase 0-3 uses stopped legacy repair task `01a023da-d868-73f0-9b01-c68715b9c8a2`, active isolated repair task `01a024c0-cc96-7d01-bbfa-9ac5014ec1fb`, and review task `01a023ed-9423-7882-96c7-90cb26d55005`; count is capped at 3/3. |
| Repair base and code chain | The isolated repair starts at `a97d4574fc2e964876a9dc17ea792d93ec24ad9d`; root integrated `102dfd4522efa198ce577c029037771c4dd0726b`, `60c3352b026d495e30709694d6e092cc222da119`, and the review closure `c61ecb86190374c98be1863e06e8e180182fff04` into `bc29`. The delivery worktree `de63` remains detached at `60c3352b`. |
| Live2 evidence | Root `C:\Users\raede\.codex\worktrees\a82e\mapcreator\.runtime\admission\sc-phases-0-3-a97d4574-live2`; final report says `invalid-experiment`, `admitted=false`, exit `3`. |
| Direct root cause | Williams block-01 quiet-window was valid, then the baseline standard admission rejected CPU average `21.1%` against `20%` and `ChatGPT[6820] 30.4%` against `25%`. The workload produced zero measured runs. |
| Repair boundary | Align pre-block admission with the existing standard policy. Thresholds, allowlists, independent baseline admission, Job Object behavior, power lifecycle, raw contract, and exit codes remain unchanged. |
| Code owner | Isolated repair task `01a024c0-cc96-7d01-bbfa-9ac5014ec1fb` delivered the Williams runner/policy/governance-test repair in `de63`. Root reviewed and committed the exact diff, fast-forwarded it into `bc29`, and retains task-record, index, ref, candidate, SF-ATS, and live-process ownership. The legacy repair task is stopped. |
| First independent review | The coordinated review at `841801cd45e7bf5c9869e780bb4e338da346890c` returned `REQUEST CHANGES / BLOCK`. Validator-invalid stderr published quiet-window fallback detail, and the raw analyzer lacked a direct missing pre-block admission file regression. Evidence is under `C:\Users\raede\.codex\worktrees\abb8\mapcreator\.runtime\reviews\sc-841801cd-coordinated-review\`. |
| P2 closure | `c61ecb86190374c98be1863e06e8e180182fff04` publishes recomputed validator reasons for invalid envelopes, evaluator failure codes for rejected envelopes, and typed quiet-window environment detail. The test suite reads forged-head stderr and directly removes `blocks/block-01/pre-block-standard-perf-admission.json` before raw analysis. |
| Root deterministic closure | At `c61ecb86`, syntax and diff checks exit `0`; Williams governance passes 71/71; Windows Job runner passes 16 with one explicit live telemetry skip; render role policy passes 82/82; perf contracts pass 26/26. Exact two-file SF-ATS executes 7/7 child-safe groups and 9/9 canonical leaves, with zero unmatched files, blocked verification entries, route gaps, or CI-only roots. Evidence is under `.runtime/reports/generated/sc-841801cd-p2-closure/`. |
| Second independent review | The coordinated review at `494922841e80a3438041d63ccc40ef678a9e36aa` returned `BLOCK / P2×1`. Production skip-detail classification is correct; evaluator-rejected and quiet-window stderr branches required direct output assertions. Evidence is under `C:\Users\raede\.codex\worktrees\abb8\mapcreator\.runtime\reviews\sc-49492284-followup\`. |
| Second-review P2 closure | `6efaf29013feac22f8ffdb6628cd88634fbc7219` reads stderr in every evaluator rejection case and adds a block-level quiet-window rejection with cadence, busy-port, exit-3, preparation, and zero-spawn assertions. Focused 2/2 and Williams 72/72 pass. |
| Second-review SF-ATS closure | Exact one-file selection recommends four roots, executes 3/3 child-safe groups covering 4/4 leaves, defers one root-owned power-scheme preflight, and reports zero unmatched files, blocked verification entries, route gaps, or CI-only roots. Evidence is under `.runtime/reports/generated/sc-49492284-p2-test-closure/`. |
| Deferred root lanes | `perf:williams-power-scheme:live-preflight`, `test:node:williams-crossover-telemetry-live`, `perf:gate`, and `perf:williams-crossover:run` remain main-thread deferred. No live process is running. |
| Preserved alternative | Root preserved the concurrent pre-block admission implementation as quarantine stash commit `773409fd19812456a92ea766e29cf8c83587f4f4`; it is outside the candidate and remains recoverable. |
| Review owner | Reused review task performs fresh independent code-reviewer plus architect/verifier review only after root freezes the exact repair SHA. |
| Live owner | Root exclusively owns browser, Playwright, performance, power-scheme, ports 8000/8892, and `.runtime/admission` outputs. No live process is currently running. |
| Stop condition | A deterministic failure is repaired before review. Any live invalid-experiment, regression, harness fault, cleanup uncertainty, revision drift, or remote divergence stops admission and downstream phases. |
| Next checkpoint | Root commits these task records, freezes the third exact candidate ref, moves the clean review worktree to that SHA, and hands the cumulative boundary plus all three P2 acceptance clusters to the existing independent review task for two fresh explicit `CLEAR` verdicts. |

## 2026-08-24 P0-P3 handoff context

| Item | Current evidence |
| --- | --- |
| Integration owner | `codex/sc-p0-p3-integration-20260824` in `C:\Users\raede\.codex\worktrees\sc-p0-p3-integration-20260824\mapcreator`, based on `origin/main@a6833008`. |
| Preserved parent WIP | `C:\Users\raede\Desktop\dev\mapcreator` remains on `codex/preserved-main-wip-20260823`; its 20 tracked modifications were not staged, modified, or discarded. |
| P0 task | Thread `01a032dd-a0c8-7203-be07-9dc2c208e265`, worktree `9cb3`, delivery commit integrated as `12b4a243`. |
| P1/P2 task | Thread `01a032dd-a0d6-70d2-a358-cfc79b4bcaa5`, worktree `9e29`, delivery commit integrated as `929b0ae1`. |
| P3 planning task | Thread `01a032dd-a0c8-7203-be07-9de998edb850`, worktree `4760`; read-only plan, no code/test/build changes. |
| Combined seam | `b69ff0b5` records the polar heavy-group contributor in the canonical metadata source; shadow comparison returns `equal=true`, `zeroSpawn=true`, and no mismatches. |
| P0 bounded evidence | Minimum CI heavy-test count is 14; four focused scenario contract tests pass; four strict scenario ratifications are idempotent; five scenario provenance records bind topology blob SHA-256 `fb14c9f8...5bacd9`. |
| Blank-base boundary | Public materialization is byte-identical across two runs and the default contract passes. Strict mode still reports the three pre-existing ownerless/Arctic semantic gaps; no contract was weakened. |
| P1 boundary | Observation only. It is not evidence for full/nightly/browser/Pages/performance/long-matrix admission. |
| P3 next action | Start only P3.1 Day/Night Runtime Owner from the plan's exact boundary; do not overlap P3.2-P3.5 or delete tests before the five-part deletion gate passes. |

## 2026-08-24 P3 execution ownership

| Lane | Exact ownership and current state |
| --- | --- |
| Supervisor / integration | Thread `01a028e9-78d6-7a31-ae01-d81532018212`; clean worktree `C:\Users\raede\.codex\worktrees\sc-p0-p3-integration-20260824\mapcreator`; branch `codex/sc-p0-p3-integration-20260824`; frozen start `f118a101d30373c507075da32267969b22197338`, merged remote-main commit `2e41e4ae`. Owns slice admission, integration commits, shared/long checks, task records, push, two-end SHA verification, and cleanup decisions. |
| Serial implementation | Thread `01a03372-ff2a-7281-af36-65e58e243f9c`; worktree `d871`; final P3.5 head `9c2dc32f`. Sole production-code owner; stopped clean after the final committed slice. No push, merge, shared long test, or cleanup authority. |
| Independent review | Thread `01a03372-ff2a-7281-af36-65fed97d06ee`; detached clean worktree `42a1`; exact-candidate findings-first review returned final `CLEAR`. No writes, commits, integration, push, or shared long tests. |
| Independent verification | Thread `01a03372-ff0c-72e3-addf-b25981aa9311`; detached clean worktree `5152`; final P3.5 candidate and test-only follow-up both received `PASS`. No production edits, integration, push, or cleanup. |
| Serial boundary | P3.1 through P3.5 are integrated, accepted, merged with the landing revamp, and normally pushed. No production slice remains open. Combined verification and the first local/remote equality gate pass; this documentation-only closeout is the final delta. No live/shared process is currently running. |
| Baseline identity | `a6833008:js/core/map_renderer.js` and `f118a101:js/core/map_renderer.js` resolve to the same blob `b5990105850cc7c79e5506c6f89dbee1ab111fae`; the planned 23,153 split-line baseline remains valid. |

### P3.1 admission checkpoint

| Fact | Evidence and disposition |
| --- | --- |
| Final implementation candidate | `fa015b53500cfe4a18f1f2ce6073ac52bf3daab0`, cumulative child of `f118a101`, 25 committed files, implementation worktree clean. It closes the initial state-action registration, hostile scheduler, canonical invocation, raw scanner, and P4.3 Visual Effects route findings. |
| Independent review | `CLEAR`. Day/Night is the single runtime authority; raw mode no longer borrows current contracts; unknown/unregistered/composition/factory hash drift remain fail-closed; Visual Effects is present in all required P4.3 direct routes. |
| Independent verification | `PASS`. Final delta hostile delegation 1/1, metadata 3/3, architecture, and exact `verify:p4:routes --phase P4.3 --history-base f118a101` all exit 0; the detached worktree is clean. |
| Policy and selector evidence | Canonical producer records 207 writers and final validator passes 75 production plus 43 test legacy-direct files. The 25-file selector is exact with zero unmatched/blocked entries. Bound dry-run starts zero processes; its single raw Water argv conflict plus 38 propagated gaps reproduce unchanged at the base. |
| Supervisor integration | The four implementation commits were replayed as `79746feb`, `5689d9f9`, `c9c1e050`, and `dc256b8f`; the integrated committed tree is byte-for-byte equivalent to `fa015b53`. Post-integration P4.3 route verification passes with zero unmatched files and zero route gaps. P3.2 is released. |

### P3.2 admission checkpoint

| Fact | Evidence and disposition |
| --- | --- |
| Final implementation candidate | `dcc83e8ddf4e8c2966f06e243870ec25dfed125c`, direct child of `fa015b53`, five committed files, implementation worktree clean. Visual Effects owns paper, graticule, draft-grid, texture labels, and asset/pattern/geometry/noise caches. |
| Independent review | `CLEAR`. No duplicated implementation or second cache authority; pass and City Lights order, resize invalidation, cache identity, public facades, and canvas state restoration remain intact. |
| Independent verification | `PASS`. Owner 6/6, Python pipeline 6/6, catalog 3/3, pass-family 6/6, cache-host 10/10, metadata, architecture, import graph, and P4.3 route all exit 0. |
| Selector evidence | The five-file selector is exact with zero unmatched/blocked entries. Bound dry-run has zero route gaps, zero execution-owner conflicts, and zero process starts. |
| Supervisor integration | Candidate was replayed as `41b3f538`; all five committed files are identical to `dcc83e8d`. Post-integration P4.3 route verification against `e00caa3c` reports five changed files, zero unmatched files, and zero route gaps. P3.3 is released. |

### P3.3 admission checkpoint

| Fact | Evidence and disposition |
| --- | --- |
| Final implementation candidate | `039acb7d513dd3cd5886218c14178196888f52e0`, comprising transaction ownership commit `d2420643` and checkout-stability fix `039acb7d`, direct descendants of `dcc83e8d`. The implementation worktree is clean. |
| Independent review | Initial review found one CRLF-sensitive architecture matcher and returned `REQUEST CHANGES`; the two-file follow-up normalized source line endings and added LF/CRLF/token-drift coverage. Exact-candidate re-review returned `CLEAR`. |
| Independent verification | `PASS`. Owner 22/22, inventory 11/11, interaction actions 8/8, Python boundary 6/6, focused delegation and metadata, architecture, route, and diff-check all exit 0. Ten action policy bindings match current source identities and coordinates exactly. |
| Policy and selector evidence | Canonical producer records 207 writers; validator passes 75 production plus 43 test legacy-direct files with zero violations. The 22-file selector has zero unmatched or blocked entries. The bound plan starts zero processes and retains one inherited `sample_project_contracts.test.mjs:resourceLocks` planner conflict with 28 propagated gaps. |
| Supervisor integration | Candidate commits were replayed as `5d6543fa` and `1c2f92f8`; the integrated `js/core`, `tests`, and `tools` tree matches `039acb7d`. Post-integration architecture, owner, inventory, and P4.3 route checks pass; route reports 22 changed files, zero unmatched files, and zero route gaps. P3.4 is released. |

### P3.4 admission checkpoint

| Fact | Evidence and disposition |
| --- | --- |
| Final implementation candidate | `a9f63bd6a16a828f80c14d80a91cbbbdfc52688b`, comprising owner commit `56c40a91` and verification-contract follow-ups `208dc652` plus `a9f63bd6`, direct descendants of `175c4421`. The implementation worktree is clean. |
| Independent review | Initial review found stale root-bound ocean/scenario contracts and selector omissions; follow-up review found canonical/legacy authority drift. Both follow-ups preserved production and policy bytes. Final exact-candidate review returned `CLEAR`. |
| Independent verification | `PASS`. Owner 8/8, Python boundary 4/4, ocean 3/3, focused scenario 5/5, delegation 1/1, inventory 6/6, orchestrator 10/10, metadata/shadow, architecture, selector, and P4.3 route all pass. |
| Policy and selector evidence | Canonical policy remains 207 writers and its validator evidence remains valid because both follow-ups have zero production/policy diff. The owner selector returns 18 commands and 19 route IDs with zero unmatched files. Canonical/legacy shadow is equal and zero-spawn. |
| Supervisor integration | Candidate commits were replayed as `c8deacb9`, `5dabccaf`, and `19c0ddf4`; the integrated tree matches `a9f63bd6`. Post-integration metadata/portfolio 91/91, owner/ocean/orchestrator/inventory 27/27, Python boundary 4/4, architecture, and P4.3 route all pass; route reports 19 changed files, zero unmatched files, and zero route gaps. P3.5 is released. Blank-line trailing whitespace is carried to the final P3.5 policy refresh. |

## 2026-08-26 Stabilization and Cost Collapse v2 handoff

| Fact | Current authority and evidence |
| --- | --- |
| User authority | Re-examine the follow-up inspection after the first total conversation, start the second execution round, dispatch user-visible tasks and subagents, and continue optimization through completion. |
| Frozen remote baseline | `origin/main@1439dee6e14b26e628820ee0e9c9322e22dad407`; local `main` points to the same SHA after fetch. |
| Preserved desktop WIP | `C:\Users\raede\Desktop\dev\mapcreator` remains on `codex/preserved-main-wip-20260823@9869698d` with 20 tracked modifications. It is 99 commits behind `origin/main` and is not an implementation or integration lane. |
| Integration owner | This root task owns `C:\Users\raede\.codex\worktrees\sc-v2-integration-20260826\mapcreator` on `codex/sc-v2-integration-20260826`, task records, integration commits, push, branch settings, long/shared verification, remote observation, registry truth, and cleanup decisions. |
| Current remote blocker | Build and Deploy `32857711186` and Nightly `32886723760` both fail with `Heavy dependency test missing from grouping manifest: tests/test_landing_map_asset_contracts.py`. Deploy checkout fetched 15,822 files and spent about 102 seconds in fetch. |
| Branch protection | `gh api repos/raederhans/scenario-forge/branches/main` reports `protected=false`, protection disabled, and no required status checks. Do not enable it until the exact successful check names and bypass behavior are reviewed. |
| Wave A execution task | User-visible task `01a03bf6-2f1f-7912-81f7-e9bdfd8362f0` in worktree `3191`. Scope is heavy registration, guard split, self-tests, and PR/Nightly routing only; no commit, push, merge, cleanup, branch protection, Nightly sharding, P4, TNO, footprint, dist, or product changes. |
| Wave A ready handoff | Worktree `3191` is detached at the frozen baseline with 11 uncommitted files and no integration actions. Classification tests pass 3/3; minimal lock reports zero packages/zero allowlist; full classification finds 15 heavy tests; portfolio passes 54/54; selector schema covers 390 routes; SF-ATS matches all 11 files with zero route gaps; `git diff --check` passes. Full, Nightly, browser, performance, remote Actions, deployment, and branch protection remain intentionally unrun. |
| Wave A integration | The integration owner committed the exact handoff as `7ecfac08`, independent reviewer `review_wave_a` returned `APPROVE`, and cherry-picked it as `b8363e4d`. Fresh integration checks pass: minimal lock, full classification, classification 3/3, workflow structure 3/3, portfolio 54/54, 390-route schema, and commit-range diff check. Remote Actions, deployment, full Nightly, and branch protection remain open. |
| PR 88 first run | PR `88` initially failed required verification for two deterministic reasons: smoke lacked `geopandas` because browser profiles skipped the locked Python environment, and a selector structural test hard-coded stale route-authority count `336` while the candidate correctly carried `346`. Commit `f482c11a` installs locked dev dependencies for backend-starting browser profiles and replaces the stale count with sorted unique identity checks. Five focused structural tests pass; the pushed PR rerun is pending. |
| PR 88 second run | Run `32925565611` reached the app and exposed a baseline startup regression plus two metadata regressions. The trace proves `visual_effects_pass_owner.drawDayNightPass -> map_renderer.drawDayNightPass` recursed until `RangeError`; the fix restores the direct `DayNightRuntimeOwner` port and adds a source-bound regression. Heavy classification now selects only `tests/**/test_*.py` plus its exact manifest/workflow sources, so adjacent adaptive fixtures remain intentionally unmatched. Updated exact metadata counts are 431 contributor records, 390 routes, and 346 commands. Focused Python 3/3, visual owner 6/6, metadata 39/39, architecture, 15-test classification, and browser smoke 4/4 all pass locally. |
| PR 88 third run | Run `32926463944` passed smoke, demo, all three strict scenario matrix jobs, and transport, but `pr-fast` exposed a retained-shadow source drift: the canonical heavy classifier used `tests/heavy_dependency_groups.json` while `INFRASTRUCTURE_ROUTES` still used broad `tests`. The retained route now uses the same exact manifest source. Portfolio check passes, combined metadata/portfolio tests pass 93/93, Python classification and workflow structure pass 62/62, and diff check is clean. The separate perf run `32926463742` remains base-unmeasurable because its `origin/main@1439dee6` worktree hits the already-proven Day/Night recursion before candidate measurement; it is not a candidate performance regression. |
| Wave B execution task | User-visible task `01a03bfa-0335-7a80-9403-233f9d2d3961` in worktree `3d08`. Scope is Nightly platform shards, final aggregator, Windows live governance ownership, and one full-policy producer; current P4.3 authority remains intact and P4.4/P4.5 plans stay out of scope. |
| Wave C observation task | User-visible task `01a03bfa-3a76-75f3-ab39-d18f503a5049` in worktree `e2ec`. Scope is canonical high-level gate signals plus comparable cost schema only; the required execution set and demo/smoke dependency must remain unchanged in this baseline wave. |
| Wave E observation task | User-visible task `01a03bfa-6d7a-76c3-bf8d-c8153cee0fdb` in worktree `da06`. Scope is report-only tree/blob/checkout profiling and versioned waiver schema; no asset migration, tracked-dist removal, history rewrite, or current required gate. |
| Read-only subagents | `audit_p0_p1`, `audit_nightly_p4`, and `audit_pr_catalog_footprint` independently audited `origin/main@1439dee6` with no edits or long tests. They confirm Wave A is open, Nightly is Ubuntu-only, P4.3 boundary evidence is already strict, P4.4/P4.5 are intentionally unsupported, PR high-level requirement signals are absent, and footprint profiling is absent. |
| Footprint snapshot | The read-only audit measured 15,822 tracked files, a 2,448.76 MiB checkout tree, and a 4.00 GiB Git pack. Existing Pages payload is about 927.65 MiB with the current 950 MiB warning and 1 GiB hard cap; Phase E must gate new unmanaged growth without retroactively blocking existing assets. |
| Live resources | No root-owned browser or server process is running. Root completed the sole-owner smoke cycle on localhost `8810`: the pre-fix run reproduced 4/4 startup failures and its trace identified the Day/Night facade recursion; the post-fix run passed 4/4 in 36.5 seconds with zero HOI4/TNO console or network issues. Evidence remains under `.runtime/tests/playwright/`, `.runtime/browser/`, and `.runtime/reports/`. |
| Next integration checkpoint | Receive the Wave A delivery, inspect exact changed-file overlap against the integration branch and later-wave audits, apply or replay only that bounded diff, run the two guards plus focused metadata/route tests, then create the integration commit before remote observation. |

### P3.5 admission checkpoint

| Fact | Evidence and disposition |
| --- | --- |
| Final implementation candidate | `9c2dc32f2963144f2de22a6db7c2490335f6a68d`, comprising owner extraction `5bc0782f`, recovery fixes `da539359` and `5c83cc29`, and test-only inventory contract repair `9c2dc32f`. The implementation worktree is clean. |
| Independent review | Initial review found commit effects inside the recoverable catch and three Scenario contracts bound to the old root. Follow-ups moved normal/noop commits outside recovery, restored dependency exception propagation, adopted dual-source harnesses, and repaired worker-ring facade/DI proofs. A post-integration stale Python phase assertion received a separate test-only fix. Final exact-candidate review returned `CLEAR`. |
| Independent verification | `PASS`. Partial owner 15/15, partial Python boundary 3/3, political preflight/orchestrator 17/17, Scenario source-bound 3/3, zero-action 1/1, inventory 6/6, architecture, metadata/shadow, selector, and diff-check all pass. The final test-only follow-up separately passes Python 5/5 and inventory 6/6. |
| Policy and protocol evidence | Canonical producer records 207 writers; final policy hash remains `8076ea6a354682243bf3705ab1beb3ff0ce26c88`, so the prior validator result of 75 production plus 43 test legacy-direct files and zero violations remains byte-applicable. Worker client, worker, packet helper, and orchestrator blobs are unchanged from the P3.4 base. |
| Supervisor integration | Candidate commits were replayed as `7cd7d254`, `da93be85`, `9ecb1793`, and `29bdcf40`. Post-integration partial owner 15/15, partial Python 3/3, orchestrator suite 22/22, architecture, inventory 6/6, metadata 37/37, and portfolio 54/54 pass. P3 implementation is complete; remote-main reconciliation and final synchronization remain. |
| Remote reconciliation | Fresh `origin/main@28215c12` was merged normally as `2e41e4ae`. Conflict resolution preserved both registry snapshots, unioned landing and P3 verification authority, and assigned unique selector order landing 379 plus Day/Night 380/381. Metadata 38/38, portfolio 54/54, landing assets 10/10, partial owner 15/15, orchestrator suite 22/22, selector schema, portfolio consistency, and both-parent diff checks pass. The merge SHA was pushed and matched local, `origin/main`, and `ls-remote`. |
