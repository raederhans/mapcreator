# P4 Global State Action Ownership Context

## Current truth

- Execution worktree: `C:\Users\raede\.codex\worktrees\mapcreator-state-actions-p4-20260719`
- Branch: `codex/state-action-ownership-p4-20260719`
- Base: `origin/main@68a62e540104025e1b3e976f77589f8b3eff2f36`
- Parent checkout: `C:\Users\raede\Desktop\dev\mapcreator`
- Parent status on 2026-07-19: current `main@68a62e54` with user-owned deletions under selected `docs/archive/**` task shells plus `lessons learned.md`; P4 preserves every entry and performs all edits in the isolated worktree.
- Durable consensus evidence exists in `.omx/plans/architect-review-global-state-action-ownership-p4.md` and `.omx/plans/critic-review-global-state-action-ownership-p4.md`; both final verdicts are `APPROVE` in Architect → Critic order.
- Current phase: P4.1 docs-only attestation A; functional checkpoint `8a01614fbe98f1ee0faf73f011ee1e065861d29e` is exact-C green.

## Decisions and deviations

| Time | Evidence or decision | Impact |
| --- | --- | --- |
| 2026-07-19 | `HEAD == origin/main == 07d95eaa`; parent contains new uncommitted WIP | Created a fresh isolated P4 worktree from `origin/main`; parent remains untouched. |
| 2026-07-19 | `origin/main` advanced to `78f9a575` through two performance/City/audit commits with zero path overlap with P4.0 | Fast-forwarded the isolated P4 worktree using `git merge --ff-only origin/main`; scanner and the 116-file compatibility allowlist were rerun and passed. |
| 2026-07-19 | `origin/main` advanced again to `8a02bc8d` through the same-runner performance baseline repair with zero P4 path overlap | Fast-forwarded the isolated worktree before P4.0 metadata freeze; parent WIP stayed untouched. |
| 2026-07-19 | `origin/main` advanced to `c9154ced` through performance self-check and audit closeout commits with zero P4 path overlap | Fast-forwarded the isolated worktree and regenerated the P4.0 baseline against current main before checkpoint C. |
| 2026-07-19 | `origin/main` advanced to `68a62e54` through post-P3 audits with zero P4 production-path overlap | Rebasing/fast-forward synchronization completed before final P4.0 policy freeze; isolated HEAD and remote main now match. |
| 2026-07-19 | Existing checker scans only roots named `state`, `runtimeState`, `appState` with regexes | P4.0 will introduce binding-scoped tokenizer/policy tests before implementation. |
| 2026-07-19 | Full-candidate discovery found 118 compatibility paths: 75 production and 43 test writers | P4.0 separates denominators and treats the legacy allowlist as a compatibility projection; `palette_manager.js` and `dev_workspace_shell_builder.js` are now represented. |
| 2026-07-19 | Initial scanner suite reached 29/29 and exposed further fail-closed, alias, destructuring, loop-scope and Reflect gaps through 11 new RED fixtures | P4.0 remains production-zero while the scanner is hardened before the committed policy baseline is generated. |
| 2026-07-19 | Binding-scoped scanner 43/43, manifest 11/11 and exact-subphase route gate 13/13 are green | Policy now fails closed on unknown writer/key/operation/alias/dynamic/ambiguous sites and empty changed-file evidence. |
| 2026-07-19 | Independent review found the custom tokenizer too large and identified grammar/scope blind spots | Replaced grammar and scope parsing with pinned dev-only `acorn@8.17.0` plus `acorn-walk@8.3.5`; P4 keeps mutation classification and authorization policy. |
| 2026-07-19 | Final binding-scoped P4.0 baseline fixes production authority at 75 legacy-direct files and 1,187 `legacy-direct + legacy-target` memberships | Closeout targets are fixed constants: `<=54` production legacy-direct files and `<=949` production legacy memberships. Production legacy sites are frozen at 142 dynamic, 227 alias, 901 ambiguous and 6,692 unsupported occurrences. |
| 2026-07-19 | Eight non-state parameters matched conservative mutation shapes during full-candidate scanning | Registered the eight exact `path#function#parameter` locators in `EXCLUDED_PARAMETER_BINDINGS`; broad path or name exclusions remain prohibited and every future exclusion requires an equally narrow regression fixture. |
| 2026-07-19 | Independent soundness review reproduced false-green paths across binding discovery, import forms, transition history and site multiplicity | Added stable anonymous identities, formal parameter structural paths, dynamic/diagnostic arbitrary-parameter discovery, canonical facade import enforcement, Git-anchored retirement validation and bidirectional exact-site occurrence checks. |
| 2026-07-19 | Final review found mutable progress-checkpoint history and canonical provenance bypasses through local re-export, absolute imports and export escapes | Frozen every committed checkpoint prefix, bound P4.0 to the baseline metrics, rejected local bridges/absolute canonical imports, and classified named/default/returned state-alias exports fail-closed. |
| 2026-07-19 | Parameter ordinal alone caused one destructured state target to claim every sibling in the same formal parameter | Binding identity now includes a stable structural `parameterPath`; refreshed policy and repository checker report zero unknown/stale bindings. |
| 2026-07-19 | `verify:test-import-graph` exposed one stale direct dependency left by upstream commit `4905fb69`; the spec had already removed its `scenario_dispatcher.js` import | Regenerated `tests/e2e/test-import-graph.json` with the canonical builder; the only tracked graph change removes that obsolete edge, and the import-graph check now passes. |
| 2026-07-19 | The named policy package script uses a direct Node wrapper, while the route registry previously exposed only nested test files | Route discovery now records the wrapper entrypoint as a dependency; named-gate reachability passes 3/3 and P4.0 routing covers 31 changed files, 27 P4-owned files, zero unmatched files and zero gaps. |
| 2026-07-19 | Scanner soundness fixtures intentionally contain state-write syntax that the legacy regex gate would classify as production-like test writes | Added an exact three-file fixture exclusion set to the legacy compatibility scanner and locked the compensation contract: every excluded fixture is parsed from the checker source and must enter the complete named AST-policy runner; Python boundary passes 20/20. |
| 2026-07-19 | Functional checkpoint `3f255f5ac837a0c824806c566acb2e918b214701` completed its exact clean matrix | Policy identity reports tree `2cb288e242fbbbac2c99113126add515321b29db`, `trackedClean=true`; policy 185/185, Python 20/20, route 31/27/0/0 and core 78/78 pass. This docs-only attestation records that immutable evidence before exact A verification. |
| 2026-07-19 | Docs-only attestation `f422e4c291b59e17f7d117b0518b6e222c4663e4` completed the same exact clean matrix and was pushed | P4.0 is closed. P4.1 begins with an explicit action delegation contract, one canonical Boot action module and behavior-preserving caller migration. |
| 2026-07-19 | P4.1 functional checkpoint `8a01614fbe98f1ee0faf73f011ee1e065861d29e` completed its exact clean matrix | Boot/startup writes now delegate through `boot_actions.js`; Node 82/82, Python 37/37, policy, route 66/34/0/0, dist drift and `verify:core` 80/80 pass. The first core run exposed three stale P4.0-only Python assertions; the functional checkpoint includes their phase-aware repair and direct P4.1 execution route. |
| 2026-07-19 | P4.2 admission review found legacy retirement could be proven by action membership without proving the old caller invokes that action | P4.2 begins with a production-zero caller-to-action edge ledger and P4.1 backfill before scenario authority is retired. |
| 2026-07-19 | Developer priority requires appearance + transport platformization and serial shared-file integration | P4.4 admission will re-audit that lane; `index.html`, `css/style.css`, and `js/ui/toolbar.js` stay main-thread-only. |

## Live process ownership

| Process | Owner | Log path | State |
| --- | --- | --- | --- |
| Browser / Playwright / dev server | main integration owner | `.runtime/tests/playwright/p4/` | not started |
| P4 policy suite and generated reports | main integration owner | `.runtime/reports/generated/p4-state-actions/` | P4.0 exact C/A PASS; P4.1 exact C PASS |
| Dist / Pages builder | main integration owner | `.runtime/reports/generated/p4-state-actions/` | P4.1 exact C Pages build and dist drift PASS at 927.20 MiB |
| Performance gate | main integration owner | `.runtime/output/perf/` | not started |

## Handoff

P4 uses one active task directory. Phase facts, validation exits, artifact paths, exact SHAs, route gaps, regression coverage and remaining risk are appended here and in `task.md`; parallel summary documents are not created.

## Next step

Commit this docs-only P4.1 attestation A, execute the same exact clean matrix at A, push the branch, then begin the production-zero caller-to-action proof required for P4.2 admission.
