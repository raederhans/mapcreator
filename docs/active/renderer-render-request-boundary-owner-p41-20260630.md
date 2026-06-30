# Renderer Render Request Boundary Owner P41

## Scope

`render_request_boundary_owner.js` owns request/flush/fallback ordering only.

`map_renderer.js` remains the composition root and keeps public wrapper names stable.

`setRenderPhase()` and `scheduleRenderPhaseIdle()` stay in `map_renderer.js` for P41.

`drawCanvas()`, `renderPassToCache()`, hit canvas, scenario refresh, exact scheduler, strategic owners, `public.js`, state-write allowlist, and `dist/app/**` stay out of scope.

## Implementation Plan

- Add `createRenderRequestBoundaryOwner({ effects, getters })` under `js/core/map_renderer/`.
- Delegate `requestRendererRender()`, `requestInteractionRender()`, and `flushInteractionRender()` from `map_renderer.js` while preserving boolean return semantics for existing callers.
- Return frozen diagnostics summaries from the owner with reason, options, completion flags, effect order, and getter order.
- Add behavior tests for request, flush, fallback, interaction fallback, dependency fail-fast, and forbidden lifecycle tokens.
- Add inventory and architecture-boundary checks so P41 cannot expand into render/draw/pass/hit/scenario/exact/strategic/public/state-write areas.

## Validation Plan

- `node --check` for the new owner, `map_renderer.js`, new tests, P40 inventory test, and architecture checker.
- `npm run test:node:renderer-render-request-boundary-owner`.
- `npm run test:node:renderer-render-request-boundary-inventory`.
- Existing renderer-adjacent gates listed in the request: P40 lifecycle inventory, P38 setMapData transaction, P39 reset-hardening inventory, render transaction diagnostics, render cache owner, transform reuse policy owner, exact-after-settle refresh plans, scenario refresh plans, architecture boundaries, test import graph, state-write allowlist, and `git diff --check`.

## Delivery Package

1. Added a narrow render request boundary owner for request/flush/fallback ordering.
2. Kept the old `map_renderer.js` wrapper names and boolean return semantics.
3. Added behavior coverage for frozen summaries, fallback completion, interaction fallback, and fail-fast dependency injection.
4. Added inventory and architecture-boundary rules that block P41 scope expansion.
5. Left public facade, state-write allowlist, `dist/app/**`, render lifecycle internals, scenario/exact/strategic owners, `setRenderPhase()`, and `scheduleRenderPhaseIdle()` unchanged.

Files: core `js/core/map_renderer.js`, `js/core/map_renderer/render_request_boundary_owner.js`; tests `tests/renderer_render_request_boundary_owner_behavior.test.mjs`, `tests/renderer_render_request_boundary_inventory.test.mjs`; tooling/package `tools/check_architecture_boundaries.mjs`, `package.json`; docs `docs/active/renderer-render-request-boundary-owner-p41-20260630.md`, `docs/active/_worktree_registry.md`, and `lessons learned.md`; temporary files none.

Diff summary: `map_renderer.js` now wires a DI owner and delegates the three existing request wrapper functions; the owner returns frozen summaries while wrappers keep boolean compatibility; external fallback callbacks keep the old no-argument surface; P41 tests and architecture checks lock the narrow boundary. Commit status: functional Lore commit `0fa68761` pushed to `origin/main`; this closeout records post-push truth. Base commit and origin/main were both `28a743c5` at task start, with local dirty files already present outside P41. Potential conflicts: yellow with future renderer/package/checker edits; green against current public-sample/dist/UI WIP by file-path ownership except shared registry.

Validation passed: `node --check js/core/map_renderer/render_request_boundary_owner.js`; `node --check js/core/map_renderer.js`; `node --check tests/renderer_render_request_boundary_owner_behavior.test.mjs`; `node --check tests/renderer_render_request_boundary_inventory.test.mjs`; `node --check tests/renderer_render_lifecycle_inventory_boundary.test.mjs`; `node --check tools/check_architecture_boundaries.mjs`; package JSON parse; `npm run test:node:renderer-render-request-boundary-owner` `9/9`; `npm run test:node:renderer-render-request-boundary-inventory` `4/4`; `npm run test:node:renderer-render-request-boundary` `13/13`; `npm run test:node:renderer-render-lifecycle-inventory` `8/8`; `npm run test:node:renderer-set-map-data-transaction` `18/18`; `npm run test:node:renderer-transaction-reset-hardening-inventory` `8/8`; `npm run test:node:render-transaction-diagnostics` `21/21`; `npm run test:node:render-cache-owner` `6/6`; `npm run test:node:render-transform-reuse-policy-owner` `7/7`; `npm run test:node:exact-after-settle-refresh-plans` `9/9`; `npm run test:node:scenario-refresh-plans` `24/24`; `npm run verify:architecture-boundaries`; `npm run verify:test-import-graph` wrote `50` specs; `npm run verify:state-write-allowlist` passed `115` tracked files; `git diff --check` passed with Windows LF-to-CRLF warnings only. Optional browser/E2E was not run because P41 only changes Node/static renderer request boundary wiring.

Review fix: narrowed external fallback callback surface to `fallback()`, updated inventory/architecture gates to block broad callback API, and expanded registry dirty-truth summary.

Recommended next step: no P41 integration action remains; continue Phase6A/public-sample WIP separately.
