# Renderer Startup Transaction Owner P36

## Scope

Move only the `initMap` reset transaction after projection/path initialization into an effects-injected owner.

## Baseline Evidence

- P35 is present at `origin/main@12890fc6`.
- P35 preflight doc: `docs/active/renderer-startup-transaction-preflight-20260629.md`.
- P35 inventory test: `tests/renderer_startup_transaction_inventory_boundary.test.mjs`.
- P36 worktree: `C:\Users\raede\.codex\worktrees\mapcreator-p36-renderer-startup-transaction-owner`.
- Base branch/commit: `origin/main@12890fc6`.

## Plan

1. Add `js/core/renderer/renderer_startup_transaction_owner.js` with `createRendererStartupTransactionOwner({ state = {}, getters = {}, effects = {} } = {})`.
2. Wire `map_renderer.js` so `initMap` still owns the lifecycle order and delegates only the reset transaction block through `runInitMapResetTransaction({ debugMode })`.
3. Add behavior tests for exact order, topology/hit revision effects, surface bridge position, cancel/reset order, diagnostic summary, and missing required effect failures.
4. Update inventory/architecture/package gates so P36 ownerization is locked.
5. Regenerate `dist/app/**` mirrors and run the required validation set.

## Guardrails

- Keep facility card setup, `ensureHybridLayers`, surface/context acquisition, projection/path initialization, pointer styles, later interaction infrastructure, `fitProjection`, `initZoom`, `bindEvents`, and initial render in `map_renderer.js`.
- Keep the new owner import-safe and free of `map_renderer.js`, `drawCanvas`, `renderPassToCache`, `buildHitCanvas`, `setMapData`, scenario refresh/chunk, exact scheduler internals, strategic overlay runtime, `initZoom`, and `bindEvents`.
- Main thread owns all live tests/browser validation.

## Progress

- [x] Confirmed P35 on `origin/main@12890fc6`.
- [x] Created isolated P36 worktree.
- [x] Located exact `initMap` reset transaction boundaries.
- [x] Implement owner and wiring.
- [x] Add tests/gates/package script.
- [x] Sync dist.
- [x] Run validation.
- [x] Review and archive closeout.
