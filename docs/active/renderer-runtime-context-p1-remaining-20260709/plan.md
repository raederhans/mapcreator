# Scenario Forge P1 Remaining Renderer Context Plan

Date: 2026-07-09

Status: in progress; G001/G002 evidence commit `3d4c8d12`; P1.6 is `green`, complete, and ready for integration at functional Lore commit `02cbc3a5ee19716eb8be14a5ed52db877ad25eb4`; P1.7 is next

## Progress

- G001 integration setup and G002 P1.5 acceptance are recorded in Lore evidence commit `3d4c8d12b1a2516b22d45afc64bf11b396d23d5e`.
- P1.5 is `green`: root-owned full `verify:core` passed 53/53 commands from clean `a8f71822`.
- P1.6 code, regression contracts, verification metadata, package entries, architecture-checker title synchronization, and the two checked-in Pages mirrors are implemented in the worktree.
- The root-owned nine-group focused matrix passed; the new named Node suite passed 4/4 and the named Python boundary passed 5/5.
- Architecture, state-write allowlist, test-import graph, supervisor-contracts, and supervisor-plan gates exited 0. Three independent static review lanes returned `APPROVE`.
- The final branch-history adaptive selector exited 0 with `unmatchedChangedFiles=[]`; its artifacts are `.runtime/reports/generated/p1-6-final-adaptive-selection.json`, `.runtime/reports/generated/p1-6-final-adaptive-selection.md`, and `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-6-final-selector.log`.
- The planned pre-edit selector has no durable evidence and is recorded as a process deviation.
- The first clean-HEAD `verify:core` attempt passed 54/55 commands. Its only failure was `verify:dist-drift`: the checked-in `dist/pages-dist-manifest.json` still held the old sizes for the two P1.6 Pages mirrors. The canonical builder changed four size fields only.
- The canonical manifest was amended into the same P1.6 functional commit. A fresh clean-HEAD `npm run verify:core` rerun passed 55/55 with exit 0; the log is `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-6-full-core-rerun.log` and the report is `.runtime/reports/generated/verify-core.json`.
- The post-rerun worktree returned clean before these evidence documents were edited. Committed source/dist Git blobs match: `map_renderer.js` is `b494fe2d97be761963a7b32493fec40ae4034de3`, `renderer_runtime_context.js` is `f680c25e307a91b819ecdd35d8258ef610a7475a`, and the canonical manifest blob is `075ac209a96c88e26d97effa406b3c546de50ebb`.

Approved sources:

- `C:\Users\raede\Desktop\dev\mapcreator\.omx\plans\scenario-forge-p1-remaining-renderer-context-plan.md`
- `C:\Users\raede\Desktop\dev\mapcreator\.omx\plans\prd-scenario-forge-p1-remaining-renderer-context.md`
- `C:\Users\raede\Desktop\dev\mapcreator\.omx\plans\test-spec-scenario-forge-p1-remaining-renderer-context.md`

Architect and Critic approved these sources. Their DRAFT banners are RALPLAN process residue.

## Goal

Accept the remote P1.5 baseline, then complete P1.6, P1.7, P1.8, and P1 Closeout in one linear isolated worktree. `RendererRuntimeContext` remains a read-model boundary; time, event resolution, scheduling, writes, metrics, DOM work, and user-visible effects remain in `map_renderer.js` as the composition root.

## Invariants

- Preserve user-visible behavior and the current click-selection effect order.
- Keep `js/core/map_renderer/public.js`, draw/pass behavior, UI, CSS, scenario data, and dependencies outside the migration scope.
- Add regression coverage for each verified behavior change.
- Register every new test through a named package entry, verification metadata, route selection, and the default `verify:core` group when required.
- Keep selector route gaps at zero and avoid allowlist expansion as a test fix.
- Use Lore commit messages and complete one phase before starting the next.

## Phases

### 0. Integration preflight

- Use `origin/main@a8f71822d705fcd3b26c32db1abd417b41264eb0` as the remote P1.5 base.
- Preserve the dirty parent checkout.
- Record worktree ownership, shared hotspots, verification ownership, and integration order in the registry.

### 1. P1.5 remote acceptance

- Inspect the interaction read model, receiver wiring, tests, metadata, package scripts, Pages mirrors, and active documentation.
- Run focused contracts, selector/supervisor gates, Pages/dist checks, `verify:core:list`, and full `verify:core`.
- Record `green` only when full core exits 0.
- Record `accepted_with_external_blocker` only after commands 1-52 pass on the baseline run and two additional clean reruns; command 53 is exactly `npm run verify:pages-dist`; every attempt binds to `HEAD=a8f71822`; both reruns reproduce the same unchanged-Landing-only path set and assertion family; every row records exact exit code, OS build, Node/npm/Python versions, dependency state, and lockfile hash; every Landing path has before/after SHA-256 and diff classification; both P1.5 source/dist pairs are byte-identical; the staged Landing path set is empty; and the integration owner records the approved disposition.
- Any different path set, assertion family, earlier failure, missing field, parity failure, staged Landing output, or verified P1.5 defect keeps the phase open. A verified defect receives a P1.5-only fix and regression update.

Execution checkpoint (G001/G002):

- G001 completed the isolated worktree, branch, exact-base, parent-WIP preservation, registry, Junction, log-root, and live-owner preflight.
- G002 accepted P1.5 as `green` from clean `HEAD=a8f71822d705fcd3b26c32db1abd417b41264eb0`: root-owned `npm run verify:core` exited 0 with 53/53 commands, including `verify:pages-dist` and `verify:dist-drift`.
- Evidence is stored in `.runtime/reports/generated/verify-core.json` and `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-5-full-core-original.log`; the worktree returned clean after the run, before these evidence documents were restored for their Lore commit.
- Committed source/dist Git blobs match for both P1.5 pairs: `map_renderer.js` is `24d9718b816c1a4a7f912980d34755eab9620718` and `renderer_runtime_context.js` is `27afb4005a05e8a8b8b6d7fab52096dad9e781e2`. Checkout raw SHA differences come from `core.autocrlf` line-ending conversion.
- Independent static audit returned `APPROVE`. Effects, handlers, timing, scheduling, metrics, and click selection remain composition-root owned. Selector route gaps are zero.
- Explicit P1.5 unrun lanes remain `verify:core:main-thread`, browser, dev server, and Playwright. P1.6 later completed green; P1.7 is the next pending phase.

### 2. P1.6 hit/hover read capsule

- Add the minimum frozen `interaction.hitHover` read model containing stable constants and readonly state/surface accessors.
- Keep clocks, event parsers/resolvers, schedulers, metrics, writes, cursor/overlay work, tooltip/UI work, and DOM effects in the composition root.
- Extend the existing hit-canvas and hover inventories, add the planned Node/Python boundary contracts, register routes, synchronize Pages mirrors, and run focused plus full gates.
- Define `test:python:map-renderer-hit-hover-context-boundary` as `npm run python -- -m unittest tests.test_map_renderer_hit_hover_context_boundary_contract -q`; metadata, routing, and acceptance use this named npm entry.

Execution checkpoint:

- Process deviation: the planned pre-edit SF-ATS dry-run has no durable evidence. This gap is recorded explicitly rather than credited as an executed gate.
- The final branch-history selector exited 0 with `unmatchedChangedFiles=[]` and wrote `.runtime/reports/generated/p1-6-final-adaptive-selection.{json,md}` plus `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-6-final-selector.log`.
- All nine focused test groups passed, including the new Node capsule suite at 4/4 and the named Python boundary at 5/5.
- `verify:architecture-boundaries`, `verify:state-write-allowlist`, `verify:test-import-graph`, `verify:supervisor-contracts`, and `verify:supervisor-plan` all exited 0.
- Three independent static reviewers returned `APPROVE` for the runtime boundary, architecture/first-principles shape, and test/SF-ATS coverage.
- Functional Lore commit `02cbc3a5ee19716eb8be14a5ed52db877ad25eb4` includes the canonical manifest amend. The fresh clean-HEAD `npm run verify:core` rerun passed 55/55 with exit 0 and returned the worktree to clean state before evidence editing.
- Committed Git-blob parity is green for both source/dist pairs: `map_renderer.js` at `b494fe2d97be761963a7b32493fec40ae4034de3` and `renderer_runtime_context.js` at `f680c25e307a91b819ecdd35d8258ef610a7475a`; manifest blob `075ac209a96c88e26d97effa406b3c546de50ebb` anchors the accepted size inventory.
- P1.6 is `green`, complete, and ready for integration. The next phase is P1.7 click-selection preflight.

### 3. P1.7 click-selection preflight

- Keep production renderer behavior unchanged.
- Extend the real P54 inventory and add the canonical Python click-selection transaction boundary.
- Register the exact `click-selection-transaction` package, metadata, route, and default-core names.
- Lock branch/effect ordering and the future owner input/output boundary before implementation.
- Reuse the sole P54 Node file `tests/renderer_click_selection_transaction_inventory_boundary.test.mjs` through `npm run test:node:renderer-click-selection-transaction-inventory`.
- Canonical Python layers are: file `tests/test_map_renderer_click_selection_transaction_boundary_contract.py`; package/commandRef `test:python:map-renderer-click-selection-transaction-boundary`; metadata/route ID `verify-core:test:python:map-renderer-click-selection-transaction-boundary`; default group `renderer-owner`. The package body is `npm run python -- -m unittest tests.test_map_renderer_click_selection_transaction_boundary_contract -q`.

### 4. P1.8 pure transaction seam

- Atomically add the unique pure click-selection owner, its single root call, behavior tests, P54 presence assertions, and architecture assertions.
- The owner accepts a resolved hit plus frozen readonly modifiers and returns the closed `{ decision, target }` contract.
- Root admission must consume the returned target and decision while all lookup, async hydration, writes, history, dirty state, render, metrics, and DOM effects stay root-owned.
- The exact entry is `resolveClickSelectionDecision(resolvedHit, readonlyModifiers) -> { decision, target }`; root freezes ctrl/meta/shift/alt booleans and passes no DOM event or runtime state.
- `decision` is exactly `{ devSelectionRequested: boolean }`. Empty target is exactly `{ kind: "empty" }`. Land/water/special targets are exactly `{ kind, id, countryCode, runtimeCountryCode }`, with unavailable identities set to `null`. Feature objects, DOM/event values, callbacks, nested objects, and extension keys are rejected.
- Root uses only returned `target.kind`/`target.id` for empty/special/water/land admission and only returned `decision.devSelectionRequested` for the dev-selection branch. Raw hit data is available after admission for root-owned lookup, hydration, refreshed-hit work, and effects.
- Preserve order: readonly/tool/editor/HGO/facility guards -> root hit resolution -> pure call -> returned admission -> empty clear or `updateDevSelectedHit` -> membership -> special effects -> water effects -> land clearing -> feature lookup -> decision-driven dev selection -> async hydration -> refreshed-hit resolution/lookup -> preset/eraser/eyedropper/fill -> history, dirty, sidebar, render, metrics.

### 5. P1 Closeout and integration

- Record P1.0-P1.8 truth, commits, validation, explicit unrun lanes, remaining risks, and staged P2 scope.
- Run final first-principles review, ai-slop-cleaner, independent code review, Architect review, and UltraQA.
- Push the verified linear branch, confirm remote `main`, update registry truth, preserve recovery commits, and remove the isolated worktree only after integration is proven.

## Live-process ownership

The root Codex thread is the sole owner of long tests, full-core runs, Pages/dist builders, browser checks, logs, polling, retries, and process termination. Other agents may inspect source and completed artifacts only.

Log root: `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/`.

Recorded P1.5 acceptance log: `p1-5-full-core-original.log`. Reserved later-phase logs: `p1-6.log`, `p1-7.log`, `p1-8.log`, and `full-core.log`.

## SF-ATS, commits, and integration

- Run SF-ATS selector dry-run before phase edits and against actual phase changes. Any unmatched production file blocks the phase.
- P1.6 records one process deviation: its pre-edit selector has no durable evidence. The final branch-history selector is the authoritative routing proof and reports `unmatchedChangedFiles=[]`.
- Pages/dist is required for browser-loaded renderer source changes. Deterministic checks are completion evidence.
- Every phase receives an intent-first Lore commit with rationale, constraints, rejected alternatives, confidence, scope risk, directive, tested evidence, and honest not-tested lanes.
- When full core needs clean HEAD, create the functional phase commit after focused checks, run the clean gate, then record final evidence without mixing later-phase code.
- Stage exact paths. Keep parent WIP and unrelated Landing outputs outside commits. Recheck origin before integration, integrate serially, push once, verify remote main, then clean with recovery hashes recorded.

P1.6 explicit unrun lanes remain `verify:core:main-thread`, browser, dev server, Playwright, perf, scenario-data, and heavy-geo.

## Stop rules

Stop the phase for an unexplained full-core/Pages blocker, nonzero route gaps, effects entering context, visible behavior or semantic change, a semantic shared-hotspot conflict, upstream movement, unrelated WIP, three repeated failures of one edited test, or ambiguous live ownership. Root records the resolved cause and revised gate before resuming.
