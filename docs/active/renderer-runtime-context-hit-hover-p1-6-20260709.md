# Scenario Forge P1.6 Hit/Hover Runtime Context Migration

Date: 2026-07-09

Status: `green`; complete and ready for integration at functional Lore commit `02cbc3a5ee19716eb8be14a5ed52db877ad25eb4`

Base and branch:

- Initial remote base: `origin/main@a8f71822d705fcd3b26c32db1abd417b41264eb0`.
- Current pre-P1.6 HEAD: G001/G002 evidence commit `3d4c8d12b1a2516b22d45afc64bf11b396d23d5e`.
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-p1-remaining-20260709`.
- Branch: `codex/renderer-runtime-context-p1-remaining-20260709`.

## Outcome boundary

P1.6 adds one frozen `interaction.hitHover` read capsule. Accessor identities stay stable for owner construction, and every accessor reads current live runtime or surface state.

The capsule constants are exactly:

- `renderPhaseIdle`
- `hoverSnapPx`

The capsule readonly accessors are exactly:

- `hasHitCanvasRuntime`
- `isHitCanvasDirty`
- `isHitCanvasBuildDeferred`
- `getRenderPhase`
- `getScheduledHitCanvasBuildHandle`
- `getActiveScenarioId`
- `hasHoverData`
- `isSpecialZoneEditorActive`
- `isReducedHoverPhase`
- `getHoverIds`
- `hasTooltip`
- `getHoveredFacilityEntry`
- `getFeatureForHit`

Validation checks constant values and function shape. JSON-safe diagnostics describe functions by presence/type and leave dynamic accessors uncalled.

## Root-owned capabilities

`map_renderer.js` retains direct injection ownership for clocks and throttle reads, every event resolver, deferred-work scheduling and cancellation, render/hover scheduling, metrics, state writes, click dispatch, cursor and overlay work, tooltip/UI helpers, facility DOM checks, and all mutation effects. The two existing owner modules and their algorithms remain unchanged.

Hit-canvas scheduling keeps `idleTimeoutMs`, `scheduleDeferredWork`, `cancelDeferredWork`, the scheduled-handle writer, and the scheduled draw callback in the composition root. Hover handling keeps `nowMs`, mouse timing, HGO/event/facility/city resolution, tooltip text resolution, all effects, and `buildFacilityEntryKey` in the composition root.

## Changed files

Core:

- `js/core/map_renderer.js`
- `js/core/map_renderer/renderer_runtime_context.js`

Tests:

- `tests/renderer_runtime_context_hit_hover_behavior.test.mjs` — new exact-shape, identity, liveness, fail-fast, diagnostics, and prohibited-capability coverage.
- `tests/test_map_renderer_hit_hover_context_boundary_contract.py` — new composition-root ownership and receiver wiring contract.
- `tests/renderer_runtime_context_interaction_behavior.test.mjs`
- `tests/hit_canvas_scheduling_owner_inventory.test.mjs`
- `tests/map_hover_interaction_owner_inventory.test.mjs`
- `tests/verification_metadata_behavior.test.mjs`
- `tests/verify_core_runner_behavior.test.mjs`

Routing and package:

- `package.json`
- `tools/verification/verification_domains.mjs`
- `tools/check_architecture_boundaries.mjs`

Checked-in Pages mirrors:

- `dist/app/js/core/map_renderer.js`
- `dist/app/js/core/map_renderer/renderer_runtime_context.js`
- `dist/pages-dist-manifest.json` — canonical byte-size inventory regenerated after the first clean-core attempt exposed stale mirror sizes.

Documentation:

- `docs/active/renderer-runtime-context-p1-remaining-20260709/{plan.md,context.md,task.md}`
- `docs/active/_worktree_registry.md`
- this phase record

## Verification registration

- `test:node:renderer-runtime-context-hit-hover` runs `node --test tests/renderer_runtime_context_hit_hover_behavior.test.mjs`.
- `test:python:map-renderer-hit-hover-context-boundary` runs exactly `npm run python -- -m unittest tests.test_map_renderer_hit_hover_context_boundary_contract -q`.
- Both entries use `domain: "renderer-runtime"`, `executionOwner: "child-safe"`, `routeRegistry: true`, and `verifyCoreDefaultGroup: "renderer-owner"`.

## Current verification state

The implementation agent performed static source/diff work only. The root live-process owner completed the P1.6 pre-commit deterministic matrix:

- All nine focused test groups passed. The new named Node capsule suite passed 4/4, and `npm run test:python:map-renderer-hit-hover-context-boundary` passed 5/5.
- `verify:architecture-boundaries`, `verify:state-write-allowlist`, `verify:test-import-graph`, `verify:supervisor-contracts`, and `verify:supervisor-plan` all exited 0.
- Three independent static review lanes returned `APPROVE` for runtime/effect ownership, architecture/first-principles shape, and test/SF-ATS coverage.
- The fresh adaptive selector against the actual P1.6 diff exited 0 with `unmatched=[]`. It wrote `.runtime/reports/generated/p1-6-adaptive-selection.json` and `.runtime/reports/generated/p1-6-adaptive-selection.md`.

Process deviation: the planned pre-edit SF-ATS selector has no durable evidence and receives no execution credit. The fresh actual-diff selector supplied pre-commit routing evidence; the final branch-history selector below supplies acceptance routing proof.

The first clean-HEAD `verify:core` attempt passed 54/55 commands. Its only failure was `verify:dist-drift`: `dist/pages-dist-manifest.json` still recorded the old byte sizes for the two changed mirrors. The canonical builder changed four size fields only, and the generated manifest was amended into the same functional commit.

The canonical manifest was amended into functional Lore commit `02cbc3a5ee19716eb8be14a5ed52db877ad25eb4`. The fresh clean-HEAD `npm run verify:core` rerun passed 55/55 with exit 0. Its log is `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-6-full-core-rerun.log`, and its report is `.runtime/reports/generated/verify-core.json`. The worktree returned clean immediately after the run, before this evidence edit.

The final branch-history adaptive selector exited 0 with `unmatchedChangedFiles=[]`. Its artifacts are `.runtime/reports/generated/p1-6-final-adaptive-selection.json`, `.runtime/reports/generated/p1-6-final-adaptive-selection.md`, and `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-6-final-selector.log`.

Committed source/dist Git blobs match: `map_renderer.js` is `b494fe2d97be761963a7b32493fec40ae4034de3`, `renderer_runtime_context.js` is `f680c25e307a91b819ecdd35d8258ef610a7475a`, and `dist/pages-dist-manifest.json` is `075ac209a96c88e26d97effa406b3c546de50ebb`.

Browser, dev-server, Playwright, `verify:core:main-thread`, perf, scenario-data, and heavy-geo remain explicit unrun lanes. P1.6 deterministic acceptance is complete and green.

## Delivery package

1. The change routes thirteen existing readonly dependencies and two constants through a narrow capsule; owner algorithms and observable interaction behavior stay at their prior implementations.
2. Core, tests, routing/package, docs, and checked-in Pages mirror paths are grouped above; no temporary source-tree file was added.
3. The diff adds the read-model contract, replaces owner-construction closures with stable context function identities, and adds regression/route coverage.
4. The functional patch and canonical manifest are committed together as `02cbc3a5ee19716eb8be14a5ed52db877ad25eb4`.
5. The branch remains linear over `origin/main@a8f71822`; the post-rerun worktree was clean before evidence editing.
6. Direct overlap risk is red for renderer/context/package/metadata/dist/registry and yellow for interaction/hit/hover tests. Parent archive/lessons WIP remains separate.
7. P1.5 full core is green. P1.6 focused/shared gates, final branch-history routing, three static reviews, and clean-HEAD full core 55/55 are green; the retained 54/55 attempt documents the manifest drift root cause.
8. Remaining risk is limited to the explicit unrun main-thread, browser/dev-server/Playwright, perf, scenario-data, and heavy-geo lanes plus future upstream movement.
9. Recommended integration state is `ready-for-integration`; the next linear implementation phase is P1.7.
10. P1.6 phase acceptance is complete.
