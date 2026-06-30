# Task

## Current Status

ready-for-integration

## Acceptance

1. `initMap` wrapper and lifecycle order stay stable.
2. Startup reset transaction moves into `renderer_startup_transaction_owner.js`.
3. Owner is effects-injected and import-safe.
4. Render, hit-canvas, scenario, exact scheduler, strategic overlay, zoom, binding, and public facade semantics stay outside the owner.
5. Dist gates pass.

## Validation Queue

- `node --check js/core/renderer/renderer_startup_transaction_owner.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/renderer_startup_transaction_owner_behavior.test.mjs`
- `node --check tests/renderer_startup_transaction_inventory_boundary.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `npm run test:node:renderer-startup-transaction-owner`
- `npm run test:node:renderer-startup-transaction-inventory`
- `npm run test:node:renderer-surface-lifecycle`
- `npm run test:node:renderer-projection-path-lifecycle`
- `npm run test:node:renderer-svg-surface-lifecycle`
- `npm run test:node:renderer-fit-projection-lifecycle`
- `npm run test:node:renderer-viewport-update-owner`
- `npm run test:node:renderer-runtime-state-behavior`
- `npm run test:node:render-transaction-diagnostics`
- `npm run verify:architecture-boundaries`
- `npm run verify:state-write-allowlist`
- `npm run verify:test-import-graph`
- `git diff --check`
- `npm run verify:pages-dist`
- `npm run verify:dist-drift`
- `npm run test:e2e:dev:tno-ready-state`
- `npm run test:e2e:smoke`

## Validation Results

- `node --check` passed for the owner, renderer, behavior test, inventory test, and architecture checker.
- `npm run test:node:renderer-startup-transaction-owner` passed `8/8`.
- `npm run test:node:renderer-startup-transaction-inventory` passed `9/9`.
- Renderer lifecycle/regression Node gates passed: surface lifecycle `13/13`, projection/path lifecycle `14/14`, SVG lifecycle `12/12`, fitProjection lifecycle `23/23`, viewport update owner `5/5`, runtime state `10/10`, render transaction diagnostics `21/21`.
- Static gates passed: architecture boundaries, state-write allowlist `115` tracked files, test import graph `50` specs, and `git diff --check`.
- `npm run verify:pages-dist` passed with startup shell `41/41`, landing showcase `13/13`, and total Pages size `926.94 MiB`.
- `npm run verify:dist-drift` passed after staging the generated dist mirrors.
- Browser confidence passed: TNO ready-state `5/5`, smoke `4/4` against `http://127.0.0.1:8000`.

## Review Results

- Code review returned COMMENT with one low-severity registry closeout finding; the P36 implementation itself was merge-ready.
- Architecture review returned WATCH because the older P33 bridge-order inventory still uses a legacy string-anchor shape while the new P36 behavior/architecture gates now own the startup transaction ordering. This is documented as a maintenance risk and kept out of code scope because P36's allowed test files were limited.

## Delivery Package

1. Added `renderer_startup_transaction_owner.js` as an import-safe, effects-injected owner for the post-projection `initMap` reset transaction.
2. Wired `map_renderer.js` so projection/path initialization still runs first, then `runInitMapResetTransaction({ debugMode })`, then pointer/touch setup and later lifecycle steps.
3. Added behavior and inventory coverage for exact effect order, bridge position, fail-fast effects, forbidden owner tokens, package wiring, and architecture boundaries.
4. Regenerated `dist/app/**` mirrors and `dist/pages-dist-manifest.json`.
5. Archived P36 closeout docs and updated the worktree registry.

Core files: `js/core/renderer/renderer_startup_transaction_owner.js`, `js/core/map_renderer.js`, `dist/app/js/core/renderer/renderer_startup_transaction_owner.js`, `dist/app/js/core/map_renderer.js`, `dist/pages-dist-manifest.json`.
Test files: `tests/renderer_startup_transaction_owner_behavior.test.mjs`, `tests/renderer_startup_transaction_inventory_boundary.test.mjs`.
Tooling/docs: `tools/check_architecture_boundaries.mjs`, `package.json`, `docs/archive/renderer-startup-transaction-owner-p36-20260630/*`, `docs/active/_worktree_registry.md`.

Diff summary: the reset transaction sequence after projection/path initialization moved into an effects-only owner; concrete runtime state writes remain injected from `map_renderer.js`; P36 tests and architecture gates now lock the owner boundary and dist mirrors are synced.

Commit status: ready for a P36 Lore commit on `codex/p36-renderer-startup-transaction-owner`; base is `origin/main@12890fc6`.

Current main divergence: local parent checkout has unrelated dirty docs, so P36 was completed in an isolated worktree based on current `origin/main`.

Potential conflicts: yellow with future renderer extraction lanes touching `js/core/map_renderer.js`, `tools/check_architecture_boundaries.mjs`, `package.json`, startup transaction tests, generated dist, or the registry; green against unrelated landing/docs WIP.

Unverified risk: older P33 bridge-order inventory test naming still reflects the pre-P36 boundary. The new P36 behavior test and architecture boundary now own the precise startup reset ordering.

Recommended next step: commit this branch, push it, fast-forward `origin/main` from the P36 branch after confirming remote still equals `12890fc6`, then clean the isolated worktree after remote confirmation.
