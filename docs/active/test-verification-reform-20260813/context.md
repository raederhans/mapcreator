# Test Verification Reform Context

## Current truth

- Worktree: `C:\Users\raede\.codex\worktrees\ded1\mapcreator`
- Branch: `codex/p43-fast-verification-runner`
- Starting revision: `132e5b4542eab9e1fabe1d3861575bde458650f3`
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
| Stage 6J streaming implementation | thread `019ffb53-af53-70f3-9a33-89e6a9a4ecb5`, worktree `cc70` | runner-owned isolated artifacts only; no manifest/full policy | active on two-file runner scope; root owns integration |
| Stage 6J Windows lifecycle audit | thread `019ffb53-ee12-7f72-9c0e-801190c2cae0`, worktree `269f` | read-only; no `.runtime` writes | active; must report termination and orphan-process blockers to lane A/root |
| Stage 6J evidence/adversarial audit | thread `019ffb54-8b38-7630-9b13-363cfba20917`, worktree `3121` | read-only; no `.runtime` writes | active; must report schema/atomicity blockers to lane A/root |

## Handoff

The root supervisor is the integration owner. Each hotspot task owns only its assigned files and local commit; merge, rebase, cherry-pick, push, worktree cleanup, shared `.runtime` outputs, and long commands remain root-owned.

## Next step

Design Stage 6J before another local full-policy attempt: retain the canonical full TAP as terminal complete evidence, write observable running/failed artifacts, and preserve exact Windows process-tree teardown. Preserve the complete 356/356 TAP at `b7f9b40e` as the current admission baseline until a same-environment control or CI run admits the newer candidate.
