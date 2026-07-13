# Scenario Forge P2 Renderer Frame Orchestration Plan

Date: 2026-07-10

Status: complete; P2.1, P2.2a, and P2.2b are implemented and verified. The 2026-07-13 project integration decision accepts the refreshed deterministic, Pages/dist, browser, and standard `perf:gate` evidence for P2 closeout. Specialized Williams performance governance is deferred to the later performance-governance phase.

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

### P2.2a governed Williams rerun prerequisite

The first P2.2a A/B report remains preserved as evidence and is classified `invalid-environment-regime` for phase admission because a machine performance regime switch occurred during B1, the HOI4 direction reversed in the adjacent control comparison, and the whole startup/render chain moved together. P2.2b stays blocked until a new pre-registered experiment reaches an accepted decision.

The replacement experiment uses the tracked `p2-williams-crossover-v1` policy and one explicit live owner:

1. Fixed blocks: `A TH`, `B TH`, `B HT`, `A HT`, `B TH`, `A TH`, `A HT`, `B HT`.
2. Each block/scenario runs one warmup and two measured runs; the block value is their median.
3. Adjacent comparisons always compute `B-A`: `1/2`, `4/3`, `6/5`, `7/8`; the primary estimate is the median of four pair deltas.
4. Same-side/same-order drift is fixed at `A TH 1/6`, `A HT 4/7`, `B TH 2/5`, `B HT 3/8` with startup `5%` and canonical render `10%` ceilings.
5. Practical regression thresholds remain startup `+3% AND +75ms` and canonical render `+5% AND +35ms`. One of four practical pair regressions is diagnostic, two invalidates the experiment, and three or four yields a valid regression failure.
6. Symmetric direction veto, internal two-run outliers, exact identity, exact 32 raw files, manifest hashes, role identity, telemetry, and cleanup all fail closed.
7. Windows telemetry requires five ordered one-second pre and post samples per block. Admission requires complete CPU/Processor Performance/performance-adjusted-frequency coverage, pre-block average CPU at most 25%, adjacent-pair pre CPU difference at most 10 percentage points, adjacent-pair median performance-adjusted-frequency difference at most 5%, global performance-adjusted-frequency drift at most 10%, adjacent-pair available-memory difference at most 5%, and within-block memory change at most 5%. Power-scheme GUID and AC source stay constant across all windows. Missing capability, phase/time drift, structured-port occupancy, or any direct HTTP response invalidates the experiment.
8. Both measurement worktrees are exact detached clean checkouts. Tracked runners are used in place and identified by git blob plus LF-normalized SHA256.
9. Exit codes are `0 accepted`, `2 valid regression`, `3 invalid experiment`, and `1 harness fault`. Legacy pooled medians remain diagnostic-only.

### Windows Job Object containment prerequisite

The rerun01 watcher failure proved that the WMI process-start provider is unavailable to the normal-user execution lane (`HRESULT 0x80041003`). The replacement containment contract uses one tracked C# helper compiled once before any pre-block telemetry. Every workload root is created with `CREATE_SUSPENDED | CREATE_NO_WINDOW`, assigned to a nested Job with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, verified in the Job, then resumed. Breakaway is disabled and no WMI watcher, process-start subscription, process snapshot polling, or `taskkill` runs during measurement.

The helper uses a base64 line protocol for exact Windows argv transport, restricts inherited handles to stdin/stdout/stderr, records source and compiled-binary identity, and fails cleanup closed unless Job close succeeds and every captured descendant is verified gone. The compiled PE is copied before capability probing to the fixed immutable raw-evidence path `tooling/windows-job-runner.exe`; every measured block executes that copy, and offline analysis re-hashes it against preparation, preregistration, block identity, and manifest descriptors. Preparation plus direct per-block Job evidence are required semantic inputs, with schema, timestamps, capability, command identity, root exit, cleanup and canonical-copy equality checked fail-closed. Compile, readiness, capability, stdin transport, or output persistence failure maps to an explicit rejected path. A Windows-only integration test compiles the helper, preserves an exit-7 root result, and proves that a detached descendant is terminated when the Job closes.

This repair authorizes a future fresh rerun after review/integration. It does not admit P2.2b by itself; only a complete accepted Williams report with exit `0` opens that gate.

Static tooling can run `npm run perf:williams-crossover:plan`, `npm run perf:williams-crossover:analyze`, and `npm run test:node:williams-crossover-governance`. Analysis writes `.runtime` reports and therefore requires one output owner; report replacement requires explicit `--overwrite-analysis`. Execute mode reserves a fresh raw root plus fresh JSON/Markdown outputs. The deterministic policy test belongs to the `verify:core` infra group. Live execution is `npm run perf:williams-crossover:run` with the four `WILLIAMS_*` worktree/head environment variables set by the sole live owner. The live lane is main-thread/heavy and owns `perf-dev-server`, `browser-dev-server`, `playwright-browser`, and `.runtime-output`; the live command is excluded from `verify:core`.

### Review and UltraQA

- Run independent code review, first-principles architecture review, and UltraQA after functional checkpoints.
- Repair only verified findings.

### Integration / push / cleanup

- Recheck ancestry and changed-file overlap before integration.
- Push only after verified functional completion.
- Clean the isolated worktree only after integration proof and recovery recording.

## Checklist

- [x] P2.0 docs-only truth reconciliation plan/context/task created.
- [x] Clean deterministic/browser baseline and governed P2.1 acceptance completed; the historical perf-gate red remained preserved.
- [x] P2.1 completed with >=35 extracted lines.
- [x] P2.2a implementation, deterministic/dist, and browser acceptance completed; Williams performance rerun pending.
- [x] Replace the unavailable WMI watcher path with reviewed Windows Job Object containment and deterministic capability coverage.
- [x] P2.2b completed.
- [x] Cumulative extracted lines >=150; `map_renderer.js` is 204 lines smaller than the current origin baseline used by the closeout audit.
- [x] Review and UltraQA completed with zero code or architecture blocker; the former integration objection was limited to the now-deferred specialized performance gate.
- [x] Integration, push, archival, and cleanup authorized by the 2026-07-13 project decision and executed through the isolated recovery branch.

## Stop rules

Stop the current phase if the clean baseline fails; visible math, pass order, or API schemas drift; an owner needs global writes, context effects, public-facade changes, or a broader state-write allowlist; route gaps or unexplained dist drift remain; the same focused test fails three times without an explained external cause; `origin/main` moves across renderer hotspots; or parent WIP is touched.
