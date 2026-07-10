# Scenario Forge P2 Renderer Frame Orchestration Plan

Date: 2026-07-10

Status: in progress; P2.0 docs-only truth reconciliation is active; later phases remain pending

## Approved source

- `C:\Users\raede\Desktop\dev\mapcreator\.omx\context\scenario-forge-renderer-frame-orchestration-p2-approved-plan.md`

## Goal

Start P2 from clean `origin/main@b14165c0e693a87872361b87ac78dc31cd7a0155`, complete docs-only truth reconciliation first, then run the clean baseline and the three approved renderer owner extractions in one isolated worktree while preserving renderer behavior, pass order, public facade shape, and ownership boundaries.

## Fixed owner path and execution topology

- owner worktree path: `C:\Users\raede\.codex\worktrees\mapcreator-renderer-frame-orchestration-p2-20260710`
- fixed owner files:
  - `js/core/map_renderer/draw_canvas_orchestration_owner.js`
  - `js/core/renderer/cached_pass_compositor_owner.js`
  - `js/core/map_renderer/transformed_frame_compositor_owner.js`
- all owners are constructed by `map_renderer.js`
- `RendererRuntimeContext` remains a read model
- single live-process owner rule applies to baseline, browser, perf, Pages, dist, and full-core runs
- log root: `.runtime/tests/renderer-frame-orchestration-p2-20260710/`

## Behavior invariants

- Preserve `drawCanvas()` undefined return, phase/defer double-read, and effect order.
- Preserve cached pass dynamic active target context, transform math, compose result schema, and export wrapper shape.
- Preserve transformed frame boolean return, HGO/dirty/reuse/order semantics, and composition-root global writes.
- Keep public facade, UI, CSS, scenario data, production owner algorithms, and state-write allowlist scope stable unless a later approved phase proves a required narrow change.
- Upgrade P53, architecture, scenario-chunk, Pages/HGO, runtime-hooks, metadata, route, core-runner, and dist contracts atomically with each implementation phase.

## Phases

### P2.0 docs-only truth reconciliation

- Record the real P1 integrated state, parent/release/P2 worktree truth, and the approved P2 topology in active docs only.
- Keep all production, test, package, dist, README, and lessons surfaces unchanged.
- Complete this phase with selector zero-gap proof on the seven changed docs files and a docs-only Lore commit.

### Clean baseline

- Run under one live-process owner: `verify:core:main-thread`, physical-layer regression, scenario resilience, and `perf:gate`.
- Capture browser and perf baseline evidence before production edits.
- Stop if the clean baseline fails.

### P2.1 draw canvas orchestration owner

- Extract `js/core/map_renderer/draw_canvas_orchestration_owner.js`.
- Preserve `drawCanvas()` undefined return, phase/defer double-read, and effect order.
- Target at least 35 extracted lines and keep cumulative extraction progress on track for at least 150 lines across P2.1 + P2.2a + P2.2b.

### P2.2a cached pass compositor owner

- Extract `js/core/renderer/cached_pass_compositor_owner.js`.
- Preserve dynamic active target context, transform math, compose result schema, and export wrapper.

### P2.2b transformed frame compositor owner

- Extract `js/core/map_renderer/transformed_frame_compositor_owner.js`.
- Preserve boolean return, HGO/dirty/reuse/order semantics, and composition-root global writes.

### Review and UltraQA

- Run independent code review, first-principles architecture review, and UltraQA after functional checkpoints.
- Repair only verified findings.

### Integration / push / cleanup

- Recheck ancestry and changed-file overlap before integration.
- Push only after verified functional completion.
- Clean the isolated worktree only after integration proof and recovery recording.

## Checklist

- [x] P2.0 docs-only truth reconciliation plan/context/task created.
- [ ] Clean baseline completed under one live-process owner.
- [ ] P2.1 completed with >=35 extracted lines.
- [ ] P2.2a completed.
- [ ] P2.2b completed.
- [ ] Cumulative extracted lines >=150.
- [ ] Review and UltraQA completed.
- [ ] Integration, push, and cleanup completed.

## Stop rules

Stop the current phase if the clean baseline fails; visible math, pass order, or API schemas drift; an owner needs global writes, context effects, public-facade changes, or a broader state-write allowlist; route gaps or unexplained dist drift remain; the same focused test fails three times without an explained external cause; `origin/main` moves across renderer hotspots; or parent WIP is touched.
