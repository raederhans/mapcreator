# Scenario Forge P1.6 Hit/Hover Runtime Context Migration

Date: 2026-07-09

Status: functional patch committed; canonical manifest rework and clean-HEAD full-core rerun pending

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

Process deviation: the planned pre-edit SF-ATS selector has no durable evidence and receives no execution credit. The fresh actual-diff selector closes the current routing risk while preserving an honest process record.

The first clean-HEAD `verify:core` attempt passed 54/55 commands. Its only failure was `verify:dist-drift`: `dist/pages-dist-manifest.json` still recorded the old byte sizes for the two changed mirrors. The canonical builder changed four size fields only, so the generated manifest is being amended into the same functional commit.

P1.6 remains open. The root integration owner still needs to rerun clean-HEAD `verify:core`, prove committed source/dist blob parity, and record the final evidence/registry checkpoint.

Browser, dev-server, Playwright, `verify:core:main-thread`, perf, scenario-data, and heavy-geo lanes remain outside the planned P1.6 deterministic lane.

## Delivery package

1. The change routes thirteen existing readonly dependencies and two constants through a narrow capsule; owner algorithms and observable interaction behavior stay at their prior implementations.
2. Core, tests, routing/package, docs, and checked-in Pages mirror paths are grouped above; no temporary source-tree file was added.
3. The diff adds the read-model contract, replaces owner-construction closures with stable context function identities, and adds regression/route coverage.
4. The functional patch is committed; the canonical manifest and evidence wording are being folded into that same commit through amend.
5. The branch remains linear over `origin/main@a8f71822`; the final amended P1.6 hash is recorded after the clean rerun.
6. Direct overlap risk is red for renderer/context/package/metadata/dist/registry and yellow for interaction/hit/hover tests. Parent archive/lessons WIP remains separate.
7. P1.5 full core is green. P1.6 focused/shared gates, actual-diff routing, and three static reviews are green; the first clean core reached 54/55 and isolated the manifest-only drift.
8. Remaining risks are the clean full-core rerun, committed source/dist blob parity, final registry truth, and upstream movement.
9. Recommended integration is the same-commit manifest amend, followed by clean-HEAD full core and a final evidence checkpoint before P1.7.
10. Current state is ready for the clean rerun after amend; P1.6 phase acceptance waits for that result.
