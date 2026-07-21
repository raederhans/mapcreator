# P4 Global State Action Ownership Task

## Current status

`P4.2a functional candidate` — six Scenario action modules, atomic apply/rollback and schema-2 caller-to-action proof are implemented; pre-commit Node/Python/policy/route checks and Pages generation pass, while exact C/A acceptance remains.

## Checklist

- [x] Verify current `origin/main`, parent WIP, registry and worktree topology.
- [x] Create isolated P4 branch/worktree.
- [x] Establish one P4 active `plan/context/task` control surface.
- [x] Add P4.0 RED fixtures for binding isolation and mutation forms.
- [x] Add machine-readable writer policy and inventory/check tools.
- [x] Lock default-key ownership and compatibility allowlist projection.
- [x] Register package scripts, verification metadata, selector and supervisor routes.
- [x] Produce P4.0 baseline report and zero-gap adaptive evidence.
- [x] Commit checkpoint C, verify exact `SHA_C`, commit attestation A, verify exact `SHA_A`, push.
- [x] Complete P4.1 Boot/startup actions.
- [x] Add P4.2 admission caller-to-action edge scanner, ledger schema and P4.1 backfill contracts.
- [ ] Complete P4.2a scenario readiness/activation/presentation/request actions and atomic apply/rollback wiring.
- [ ] Execute P4.2–P4.5 in order.
- [ ] Complete review, UltraQA, full acceptance, main integration and safe cleanup.

## Validation evidence

| Command or check | Result |
| --- | --- |
| `git fetch --all --prune` | PASS; isolated branch synchronized to `origin/main@68a62e540104025e1b3e976f77589f8b3eff2f36` |
| `git worktree add -b codex/state-action-ownership-p4-20260719 ... origin/main` | PASS |
| Parent checkout inspection | User WIP identified and left untouched |
| `git merge --ff-only origin/main` in isolated P4 worktree | PASS; advanced `07d95eaa → 78f9a575` with zero P4 path overlap |
| Initial scanner behavior suite | PASS 29/29 before adversarial expansion |
| Expanded scanner fixtures | Expected RED: 30/40 pass; 10 scanner gaps reproduced |
| Policy manifest behavior fixture | Expected RED on missing policy module, then GREEN 6/6 after minimal pure policy core |
| `npm run verify:state-write-allowlist` | PASS before AST reconciliation; current compatibility projection contains 118 tracked paths |
| Binding-scoped scanner | PASS 98/98 |
| Scanner soundness | PASS 7/7; stable anonymous identities, formal `parameterIndex`, structural `parameterPath`, dynamic/diagnostic arbitrary discovery and payload exclusion |
| Policy soundness | PASS 12/12; canonical import/re-export paths, exact-site multiplicity, frozen checkpoint history and Git-anchored transition history |
| Named-gate reachability | PASS 3/3; package script delegates to the complete runner default suite and the route registry discovers its direct Node wrapper entrypoint |
| Policy manifest | Focused compatibility/import cases PASS 12/12 |
| Exact-subphase route checker | PASS 13/13; empty changed-file evidence fails closed |
| `npm run verify:p4:state-writer-policy` | PASS 185/185 plus closed-world repository checker; reports under `.runtime/reports/generated/p4-state-actions/P4.0/` |
| `npm run test:python:p4:state-write-boundary` | PASS 20/20; legacy regex fixture exclusions are exact and compensated by the complete named AST-policy runner |
| `npm run test:node:verification-metadata` | PASS 22/22 |
| `npm run test:node:verify-core-runner` | PASS 8/8 |
| `npm run verify:supervisor-contracts` | PASS; 41 domains, 13/13 schema contracts and 4/4 routing contracts |
| `npm run verify:test-import-graph` | Initial check reproduced one upstream stale direct edge for `city_lights_layer_regression.spec.js`; canonical regeneration removed only the obsolete `scenario_dispatcher.js` edge and the check now passes for 51 specs |
| `npm run verify:p4:routes -- --phase P4.0 --json` | PASS; 31 changed, 27 P4-owned, 0 unmatched, 0 route gaps; direct state ownership and expected-command coverage both cover all 27 P4-owned files |
| Adaptive workspace dry-run | PASS; 31 changed, 211 recommendations, 203 child-safe, 8 main-thread, 0 unmatched |
| Independent code + architecture review | CLEAR; frozen checkpoint history, canonical provenance, exact legacy fixture exclusions and runner reachability verified |
| P4.0 frozen production denominator | 75 legacy-direct files; 475 legacy-direct + 712 legacy-target = 1,187 memberships |
| P4 closeout targets | Fixed constants: `<=54` production legacy-direct files; `<=949` production legacy memberships (`floor(1,187 × 0.8)`) |
| Binding-scoped site baselines | Production legacy: 142 dynamic, 227 alias, 901 ambiguous, 6,692 unsupported; semantic multisets preserve occurrence counts and source fingerprints |
| Parser foundation | Pinned dev-only `acorn@8.17.0` and `acorn-walk@8.3.5`; repository policy owns mutation classification and authority |
| Default state ownership | 16 factory groups; 9 explicit keys; 402 pre-compat keys; 86 hooks; 488 post-compat keys; 0 collisions |
| Production `js/**` diff | Empty |

## P4.0 exact checkpoint C

- Functional SHA: `3f255f5ac837a0c824806c566acb2e918b214701`
- Verification tree: `2cb288e242fbbbac2c99113126add515321b29db`
- Environment: Node `v22.23.0`; npm `11.18.0`; Python `3.12.10`
- `node tools/check_state_writer_policy.mjs --phase P4.0 --require-clean`: PASS; `verificationSha` equals functional SHA and `trackedClean=true`
- `npm run verify:p4:state-writer-policy`: PASS 185/185 plus repository checker
- `npm run test:python:p4:state-write-boundary`: PASS 20/20
- Branch-history route gate: PASS 31 changed / 27 P4-owned / 0 unmatched / 0 gaps
- Branch-history adaptive dry-run: PASS 31 changed / 211 recommendations / 0 unmatched
- Shared metadata, core-runner, architecture, allowlist, import-graph, selector and supervisor gates: PASS
- `npm run verify:core`: PASS 78/78; Pages dist `927.20 MiB`
- Report SHA256:
  - policy report: `39aeb3fe93932364956b6421e7560d236d269f7ef5133b1556c02225e1904430`
  - named policy TAP: `c26aa8b3d09f8376633ef7cbdc6e0454854bac86e04cdeb393f14b786074c35a`
  - P4 route report: `be18dca7f341b5a381f4a29f1a4f014c44fd6a0c6cac7ffbd0934b8b620c48ea`
  - adaptive exact-C report: `00f9bb11a20fd90be589c535fe0018c38c1c5e497b0fb0be6c1e76c71a40d5b1`
  - verify-core report: `df0c3f591ac12da53f63c7a8361cacb01846397a1b490185e1ccf57a7f82ee64`

## P4.0 exact attestation A

- Attestation SHA: `f422e4c291b59e17f7d117b0518b6e222c4663e4`
- Verification tree: `018d2e33a82f7d00f5c6b66529c310f86e3ccb15`
- `node tools/check_state_writer_policy.mjs --phase P4.0 --require-clean`: PASS; `verificationSha` equals attestation SHA and `trackedClean=true`
- `npm run verify:p4:state-writer-policy`: PASS 185/185 plus repository checker
- `npm run test:python:p4:state-write-boundary`: PASS 20/20
- Branch-history route gate: PASS 31 changed / 27 P4-owned / 0 unmatched / 0 gaps
- Branch-history adaptive dry-run: PASS 31 changed / 211 recommendations / 0 unmatched
- Shared metadata, core-runner, architecture, allowlist, import-graph, selector and supervisor gates: PASS
- `npm run verify:core`: PASS 78/78; Pages dist `927.20 MiB`; dist drift zero
- Report SHA256:
  - policy report: `313d5662208c36a8888e738607a8c650efe4e4bf6c6a31ea10c699efa4dcfa44`
  - P4 route report: `be18dca7f341b5a381f4a29f1a4f014c44fd6a0c6cac7ffbd0934b8b620c48ea`
  - adaptive exact-A report: `00f9bb11a20fd90be589c535fe0018c38c1c5e497b0fb0be6c1e76c71a40d5b1`
  - verify-core report: `df0c3f591ac12da53f63c7a8361cacb01846397a1b490185e1ccf57a7f82ee64`
- Remote recovery branch: `origin/codex/state-action-ownership-p4-20260719`

## P4.1 implementation and exact checkpoint C

- Canonical action owner: `js/core/state/actions/boot_actions.js`
- Compatibility facade: `js/core/state/boot_state.js` retains defaults, normalization, reads and delegated public helpers.
- Delegation authority: 17 registered action exports covering 22 Boot/startup keys; action diagnostics remain zero.
- Caller migration covers startup boot overlay/support, post-ready scheduling, UI-shell boot/debug seed, sample-project state, scenario bundle/startup hydration and the main startup promotion result.
- Policy progression:
  - production legacy direct files: `75 → 75`
  - production legacy memberships: `1187 → 1151`
  - production alias sites: `227 → 222`
  - production ambiguous sites: `901 → 900`
  - production unsupported sites: `6692 → 6662`
  - frozen P4.0 denominator and closeout target remain `1187` and `949`.
- Focused verification:
  - `npm run test:node:p4:p4-1`: PASS 82/82.
  - `npm run test:python:p4:p4-1-boundary`: PASS 37/37, including the phase-aware general state-write boundary.
  - `npm run verify:p4:state-writer-policy`: PASS 208/208 plus repository checker.
  - P4.1 route gate: PASS 66 changed / 34 P4-owned / 0 unmatched / 0 gaps.
  - architecture, state-write allowlist, test-import graph, verification metadata, core-runner and supervisor gates: PASS.
- Independent code review: `PASS WITH WATCH`; the public `setBootStateFields` omitted-phase return parity has been restored and regression-tested.

### Exact checkpoint C

- Functional SHA: `8a01614fbe98f1ee0faf73f011ee1e065861d29e`
- Verification tree: `b433e9a62f64ca23fad1c75bc58b738df3f73b6d`
- `npm run verify:p4:p4-1`: PASS; exact identity remained tracked-clean across all four phase commands.
- `npm run verify:dist-drift`: PASS; canonical Pages dist remains 927.20 MiB.
- `npm run verify:core`: PASS 80/80.
- The initial core attempt exposed three stale P4.0-only assertions in `test_state_write_guardrail_contract.py`. Checkpoint C contains the phase-aware contract repair, adds that suite to the P4.1 exact Python command, and routes it through `verify:p4:p4-1`.
- Report SHA256:
  - phase verification: `32e8e57c033d9bdfbf58e81ec94f244acd820d33de06e7632b23f0d121f713fc`
  - policy report: `b1b3d10f8b73643b2832523ec519ed036ca51148ee2b7e335e19c5fdb78176ec`
  - adaptive route report: `b765ed2f4d778c3940c9fe8fc87bb7e7bbdf63632be57bf36344d6f5c1144a7b`
  - verify-core report: `2c66bd1e2ac44c48e41ea98b78543ec79709199d12583118535149c7ed3243fa`

## P4.2a admission evidence

- Caller-to-action scanner accepts only canonical named imports, exact/defaulted full-root targets and registered action exports.
- The policy ledger requires semantic liveness for every historical retirement and exact source identity for the current phase.
- P4.1 backfill is fixed at 36 entries with `retiredInPhase=P4.1`, `recordedInPhase=P4.2a`, `backfilled=true`.
- New P4.2a retirements use `retiredInPhase=recordedInPhase=P4.2a`, `backfilled=false`.
- Phase admission registers seven action modules: one Boot module from P4.1 and six Scenario modules introduced in P4.2a. A future-phase module present on disk now fails closed.
- Scenario readiness, activation, presentation, palette, request and rollback writes commit through explicit target-first actions. Prepare uses snapshot-restored transactional staging with observer, persistence and default-palette publication suppressed; validation precedes commit; observers publish after commit; restore preserves absent-property semantics.
- Same-target cache and Promise reuse preserve the active apply epoch. New and queued transactions allocate a fresh epoch; deferred metadata and optional-layer writes require matching scenario, request and epoch.
- Latest-target arbitration clears a stale queued target when the user returns to the active target, and cache reuse is disabled while another apply owns the transaction so the final request remains authoritative.
- Schema-2 policy contains 200 writers and 148 caller-to-action entries: 36 P4.1 backfills plus 112 P4.2a retirements.
- Current checkpoint metrics are 75 production legacy-direct files, 1,039 legacy memberships, 142 dynamic sites, 222 alias sites, 681 ambiguous sites and 4,111 unsupported sites.
- Policy snapshot reuse removes the checker’s duplicate writer scan: `139,970 ms → 75,147 ms` (`1.86×`) while preserving 5,967,610 output bytes and SHA256 `7b9e65bd09e849c5c8376834f5085a00dba87327bcf8c130a951961f8b4a6f79`.
- Targeted Scenario apply ownership passes 8/8 and the complete P4.2a Node matrix passes 87/87. The P4 Python boundary/policy matrix passes 58/58. Batch-scanner and runner reachability pass 8/8. Exact P4.2a routing reports 59 changed paths, 36 P4-owned paths, zero unmatched files and zero route gaps.

## Open risks and remaining work

- The policy records eight exact locator-scoped non-state exclusions; future exclusions require equally narrow evidence.
- Conservative dynamic/unsupported parameter discovery can create explicit migration friction; every new candidate remains fail-closed and must receive exact authority or a narrow proved exclusion.
- Action-proof helper traversal remains the dominant local policy-tooling cost: `map_renderer.js` measures about 60.75 seconds and `scenario/chunk_runtime.js` about 7.4 seconds. Exact-context memoization requires a dedicated follow-up because helper output depends on alias state, parameter classifications, reachability and enclosing identity.
- P4.2a still requires the clean checkpoint C and attestation A matrices: exact phase verification, Scenario resilience Playwright, dist drift and `verify:core`.
- P4.4 requires fresh appearance/transport admission evidence before shared UI files are touched.
- Main-thread browser/performance/heavy-geo lanes outside the Scenario resilience acceptance case remain deferred to their owning phases.
