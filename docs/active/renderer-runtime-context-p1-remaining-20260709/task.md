# Scenario Forge P1 Remaining Renderer Context Task Ledger

Date: 2026-07-09

Current status: G001 integration preflight and G002 P1.5 remote acceptance are complete; P1.5 is `green`; P1.6 is the next pending phase.

## Integration setup

- [x] Validate worktree path, branch availability, origin/main, and exact base.
- [x] Create the isolated worktree and branch at `a8f71822d705fcd3b26c32db1abd417b41264eb0`.
- [x] Preserve parent checkout WIP unchanged.
- [x] Read project rules, P1.5 provenance, approved plan/PRD/test spec, and registry.
- [x] Create plan/context/task records and update registry.
- [x] Create and verify ignored `node_modules` Junction.
- [x] Create and verify `.runtime/tests/renderer-runtime-context-p1-remaining-20260709`.
- [x] Update Junction context from pending to verified.

## P1.5 acceptance gate

- [x] Run the fresh clean full-core gate under root ownership: 53/53 commands, exit 0, including Pages/dist checks.
- [x] Record P1.5 as `green` with report/log paths and post-run clean-state proof.
- [x] Prove both committed source/dist Git-blob pairs match and record the Windows `core.autocrlf` checkout distinction.
- [x] Record independent static `APPROVE`, root-owned effect boundaries, zero selector route gaps, explicit unrun lanes, and registry checkpoint.
- [ ] Create the independent G001/G002 Lore evidence commit under root integration ownership.

Acceptance: satisfied by fresh full-core exit 0 from clean `a8f71822d705fcd3b26c32db1abd417b41264eb0`.

## P1.6 `interaction.hitHover`

- [ ] Run pre-edit SF-ATS dry-run.
- [ ] Add narrow readonly accessors/constants; retain direct root effect injections.
- [ ] Extend existing suites and add/register the canonical Python boundary.
- [ ] Sync Pages mirrors and run root-owned focused/shared gates.
- [ ] Record route gaps, remaining risk, Lore commit, and registry checkpoint.

Acceptance: receiver allowlist and negative effect boundary pass; behavior is stable; route gaps are zero; clean gates pass.

## P1.7 click-selection preflight

- [ ] Extend the sole P54 inventory and add the canonical Python boundary.
- [ ] Freeze ordered anchors and retained effect ownership with production renderer unchanged.
- [ ] Run named entries/shared gates; record route gaps and remaining risk.
- [ ] Create independent Lore commit and registry checkpoint.

Acceptance: canonical files and routes reach default core; ordered inventory and full core pass.

## P1.8 atomic pure owner

- [ ] Add the unique pure owner, behavior test, and one root delegation.
- [ ] Atomically evolve P54 and architecture assertions.
- [ ] Enforce closed schemas and prove returned values control branch admission.
- [ ] Preserve P1.7 order and root effects; sync mirrors and routing.
- [ ] Run gates; record remaining risk, atomic Lore commit, and registry checkpoint.

Acceptance: one consistent commit contains owner, delegation, assertions, and behavior proof; clean gates pass.

## P1 Closeout

- [ ] Record P1.0-P1.8 commits, gates, route status, unrun lanes, risks, and P2 scope.
- [ ] Run final review/bug/first-principles audit.
- [ ] Recheck remote ancestry; integrate serially; push and confirm remote main.
- [ ] Update registry and clean only after recovery hashes are explicit.

## Delivery package fields

- What changed: G001 established the isolated continuation lane; G002 accepted the remote P1.5 baseline as `green`; this checkpoint changes evidence documents only.
- Core/test files: P1.5 product and regression files are already committed in baseline `a8f71822`; this evidence checkpoint adds no code or test changes.
- Docs: `docs/active/renderer-runtime-context-p1-remaining-20260709/{plan.md,context.md,task.md}` and `docs/active/_worktree_registry.md`.
- Temporary: ignored `node_modules` Junction, `.runtime/reports/generated/verify-core.json`, and `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-5-full-core-original.log`.
- Diff/commit/divergence: branch base and current pre-evidence-commit HEAD are `a8f71822d705fcd3b26c32db1abd417b41264eb0`; the four evidence documents await an independent Lore commit. Parent `main@db8bd6c1` retains 19 archive deletions and modified `lessons learned.md` unchanged.
- P1.5 parity: committed source/dist blobs are `24d9718b816c1a4a7f912980d34755eab9620718` for `map_renderer.js` and `27afb4005a05e8a8b8b6d7fab52096dad9e781e2` for `renderer_runtime_context.js`; checkout raw SHA differences follow `core.autocrlf` conversion.
- Overlap: red for future renderer/runtime-context/package/metadata/dist/registry hotspots; green against the parent archive/lessons WIP.
- Validation: root-owned `npm run verify:core` exit 0, 53/53; report and full log recorded; independent static audit `APPROVE`; selector route gaps 0; worktree clean immediately after the run.
- Explicit unrun lanes: `verify:core:main-thread`, browser, dev server, and Playwright.
- Remaining risks: P1.6 receiver/effect boundary, P1.7 canonical routing, P1.8 atomic semantics, and upstream movement.
- Recommended next step: root creates the G001/G002 Lore evidence commit, then begins the P1.6 pre-edit SF-ATS dry-run.
