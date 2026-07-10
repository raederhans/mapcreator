# Scenario Forge P2 Renderer Frame Orchestration Task Ledger

Date: 2026-07-10

Current status: P2.0 docs-only truth reconciliation in progress from clean `origin/main@b14165c0e693a87872361b87ac78dc31cd7a0155`.

## P2.0 docs-only truth reconciliation

- [x] Read current registry and P1 plan/context/task.
- [x] Read the approved P2 plan title, execution topology, fixed owner topology, and stop conditions.
- [x] Update current truth surfaces for parent, release residue, P1 cleanup, and P2 startup.
- [x] Create P2 plan/context/task with fixed owner path, invariants, log root, single live-process owner, stop rules, and staged checklist.
- [ ] Run stale-closeout grep on current truth files only.
- [ ] Run `git diff --check`.
- [ ] Run selector with `--changed-file` for all seven docs files and confirm `unmatchedChangedFiles=[]`.
- [ ] Stage only the seven docs files and inspect staged diff.
- [ ] Create the docs-only Lore commit.

## Clean baseline

- [ ] Run `verify:core:main-thread`, physical-layer regression, scenario resilience, and `perf:gate` under one live-process owner.
- [ ] Record browser baseline.
- [ ] Record perf baseline.

## P2.1 draw canvas orchestration owner

- [ ] Extract `js/core/map_renderer/draw_canvas_orchestration_owner.js`.
- [ ] Preserve `drawCanvas()` undefined return, phase/defer double-read, and effect order.
- [ ] Reach at least 35 extracted lines.

## P2.2a cached pass compositor owner

- [ ] Extract `js/core/renderer/cached_pass_compositor_owner.js`.
- [ ] Preserve active target context, transform math, compose result schema, and wrapper shape.

## P2.2b transformed frame compositor owner

- [ ] Extract `js/core/map_renderer/transformed_frame_compositor_owner.js`.
- [ ] Preserve boolean return, HGO/dirty/reuse/order semantics, and composition-root global writes.

## Review / UltraQA / integration

- [ ] Reach cumulative extracted lines >=150.
- [ ] Run independent code review, first-principles review, and UltraQA.
- [ ] Recheck integration ancestry and overlap.
- [ ] Push verified result.
- [ ] Clean isolated worktree after recovery recording.
