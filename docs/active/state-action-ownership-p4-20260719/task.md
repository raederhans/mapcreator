# P4 Global State Action Ownership Task

## Current status

`P4.1 checkpoint-candidate` — Boot/startup action ownership, its monotonic policy checkpoint and focused verification are complete; canonical Pages generation, functional checkpoint C and exact-SHA attestation remain.

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
- [ ] Execute P4.1–P4.5 in order.
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

## P4.1 implementation checkpoint candidate

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
  - `npm run test:node:p4:p4-1`: PASS 81/81 before the compatibility-return regression; the focused Boot suite then passes 11/11.
  - `npm run test:python:p4:p4-1-boundary`: PASS 17/17.
  - `npm run verify:p4:state-writer-policy`: PASS 207/207 plus repository checker.
  - P4.1 route gate: PASS 50 changed / 33 P4-owned / 0 unmatched / 0 gaps.
  - architecture, state-write allowlist, test-import graph, verification metadata, core-runner and supervisor gates: PASS.
- Independent code review: `PASS WITH WATCH`; the public `setBootStateFields` omitted-phase return parity has been restored and regression-tested.

## Open risks and remaining work

- P4.1 still requires canonical Pages generation, functional checkpoint C, exact-C verification, docs-only attestation A, exact-A verification and push.
- P4.2 admission must add caller-to-action call-edge evidence so a retired legacy membership is tied to a concrete delegated action invocation.
- The policy records eight exact locator-scoped non-state exclusions; future exclusions require equally narrow evidence.
- Conservative dynamic/unsupported parameter discovery can create explicit migration friction; every new candidate remains fail-closed and must receive exact authority or a narrow proved exclusion.
- P4.4 requires fresh appearance/transport admission evidence before shared UI files are touched.
- Browser, dist and performance lanes remain outside the production-zero P4.0 evidence scope.
