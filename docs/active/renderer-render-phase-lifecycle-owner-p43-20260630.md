# Renderer Render Phase Lifecycle Owner P43

## Scope

P43 adds `js/core/map_renderer/render_phase_lifecycle_owner.js` as a narrow owner for render phase lifecycle orchestration.

`render_phase_lifecycle_owner.js` owns render phase value writes, phase-enter timestamps, phase timer clearing, phase idle scheduling, and reset phase state only.

`map_renderer.js` remains the composition root and keeps `clearRenderPhaseTimer()`, `setRenderPhase()`, and `scheduleRenderPhaseIdle()` wrapper names stable.

`drawCanvas()`, `renderPassToCache()`, hit canvas, scenario refresh runtime, exact-after-settle scheduler, strategic overlay runtime, `public.js`, state-write allowlist, and `dist/app/**` stay out of scope.

P41 request boundary and P42 visible-frame diagnostics owners remain narrow and do not import P43.

## Implementation Plan

1. Add a dependency-injected render phase lifecycle owner under `js/core/map_renderer/`.
2. Move only the existing phase/timer lifecycle order from `map_renderer.js` into the owner.
3. Keep concrete runtime writes in `map_renderer.js` injected effects.
4. Add behavior and inventory tests for owner summaries, timer semantics, wrapper delegation, and forbidden boundaries.
5. Extend `tools/check_architecture_boundaries.mjs` and package scripts for P43.

## Validation Plan

- `node --check js/core/map_renderer/render_phase_lifecycle_owner.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/renderer_render_phase_lifecycle_owner_behavior.test.mjs`
- `node --check tests/renderer_render_phase_lifecycle_inventory.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- package JSON parse
- `npm run test:node:renderer-render-phase-lifecycle-owner`
- `npm run test:node:renderer-render-phase-lifecycle-inventory`
- `npm run test:node:renderer-render-request-boundary`
- `npm run test:node:visible-frame-diagnostics`
- `npm run test:node:renderer-render-lifecycle-inventory`
- `npm run test:node:renderer-set-map-data-transaction`
- `npm run test:node:renderer-transaction-reset-hardening-inventory`
- `npm run test:node:render-transaction-diagnostics`
- `npm run test:node:exact-after-settle-refresh-plans`
- `npm run test:node:scenario-refresh-plans`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `npm run verify:state-write-allowlist`
- `git diff --check`

## Delivery Package

Status: ready-for-integration.

Changed summary:

1. Added `createRenderPhaseLifecycleOwner({ state, effects, getters })` for render phase value writes, phase-enter timestamps, timer clearing, idle scheduling, and reset phase state.
2. Kept `map_renderer.js` wrapper names stable and delegated `clearRenderPhaseTimer()`, `setRenderPhase()`, and `scheduleRenderPhaseIdle()` to the owner.
3. Preserved existing idle callback behavior for scenario chunk flush, exact fast path, promotion-active wait, render, and exact-after-settle scheduling through injected effects.
4. Added behavior/inventory tests and architecture-boundary checks for P43, including a `dist/app/**` no-change guard.
5. Left `public.js`, state-write allowlist, `dist/app/**`, draw/pass/hit/scenario/exact/strategic owner files unchanged.

Files changed:

- Core files: `js/core/map_renderer.js`, `js/core/map_renderer/render_phase_lifecycle_owner.js`.
- Test files: `tests/renderer_render_phase_lifecycle_owner_behavior.test.mjs`, `tests/renderer_render_phase_lifecycle_inventory.test.mjs`, `tests/renderer_render_lifecycle_inventory_boundary.test.mjs`, `tests/renderer_startup_transaction_inventory_boundary.test.mjs`.
- Tooling/docs: `package.json`, `tools/check_architecture_boundaries.mjs`, `docs/active/_worktree_registry.md`, this document, `lessons learned.md`.
- Temporary files: none.

Diff summary: `map_renderer.js` now imports and lazily constructs the narrow owner, while keeping concrete runtime writes in injected effects at the composition root. The new owner contains the former phase/timer ordering and returns frozen summaries. P40/P36 inventory tests were synchronized to the new reset/delegation contract. The architecture checker now registers P43 files/scripts, checks full DI wiring, keeps the broad render lifecycle owner absent, and locks the public/state/scenario/exact/strategic/dist boundaries.

Commit status: not committed at the moment this delivery package is written; validation and review fixes are complete, and the next action is a functional Lore commit on branch `codex/p43-render-phase-lifecycle-owner`.

Base divergence: worktree started from `origin/main@fc59d527`; no upstream divergence was detected before final validation.

Conflict risk: yellow with future work touching `js/core/map_renderer.js`, `package.json`, `tools/check_architecture_boundaries.mjs`, renderer inventory tests, or this registry. Green against `public.js`, state-write allowlist, `dist/app/**`, scenario refresh runtime, exact scheduler, setMapData owner, request owner, and visible-frame diagnostics owner because this diff leaves those files unchanged.

Validation passed: `node --check` for owner, renderer, P43 tests, and architecture checker; package JSON parse; P43 behavior `11/11`; P43 inventory `6/6`; P41 request boundary `13/13`; P42 visible-frame diagnostics `14/14`; P40 lifecycle inventory `8/8`; P38 setMapData transaction `18/18`; P39 reset-hardening inventory `8/8`; render transaction diagnostics `21/21`; exact-after-settle refresh plans `9/9`; scenario refresh plans `24/24`; architecture boundaries; test import graph `50` specs; state-write allowlist `115` tracked files; `git diff --check`; `git diff --name-only HEAD -- dist/app ...` returned empty for all forbidden paths.

Review fixes: reset now clears an active timer inside `resetRenderPhaseState()` before restoring idle fields; P43 tests/checker now lock all required DI effects/getters; P43 inventory now guards `dist/app/**` as unchanged.

Not run: optional browser/E2E smoke. P43 is a narrow Node/static renderer phase lifecycle extraction, and the required behavior, inventory, architecture, import graph, state-write, and forbidden-path gates passed.

Recommended next step: commit this branch, fast-forward merge into `main`, run the P43 combined test and architecture boundary gate on `main`, push, then remove the temporary worktree.
