# Renderer Transaction Reset Owner P49

## Objective

Move the shared reset sequencing for `resetRendererTransactionState`, `resetRendererRefreshTransactionState`, and `markRendererTopologyChanged` into a narrow owner while keeping `js/core/map_renderer.js` as the composition root for runtime and module-local writes.

## Scope

Production:
- `js/core/map_renderer.js`
- `js/core/map_renderer/renderer_transaction_reset_owner.js`

Tests and tooling:
- `tests/renderer_transaction_reset_owner_behavior.test.mjs`
- `tests/renderer_transaction_reset_hardening_inventory_boundary.test.mjs`
- `tools/check_architecture_boundaries.mjs`
- `package.json`

Docs:
- `docs/active/renderer-transaction-reset-owner-p49-20260701.md`
- `docs/active/_worktree_registry.md`

## Preserved Behavior

- `resetRendererTransactionState` still runs refresh reset before topology change.
- `resetRendererRefreshTransactionState` still preserves the dynamic border, phase timer, UI refresh, optional hover overlay, render phase, diagnostics, staged task, exact-after-settle, P47 hit canvas scheduling cancellation, optional secondary spatial build, deferred flag, layer resolver, dev interaction, dev clipboard, and physical land clip reset order.
- `markRendererTopologyChanged` still resets exact refresh optimization, resets visible internal border mesh signature, bumps topology revision, optionally marks hit canvas dirty, and resets hit canvas topology revision.
- P47 hit canvas scheduling owner remains the scheduled hit canvas cancellation boundary.
- `set_map_data_transaction_owner.js` continues calling injected `resetRendererTransactionState`.
- `scenario_refresh_runtime.js` continues receiving `resetRendererTransactionState` by injection.
- No public facade, state-write allowlist, dist, scenario refresh runtime, or exact scheduler migration is part of P49.

## Validation Plan

- `node --check js/core/map_renderer/renderer_transaction_reset_owner.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/renderer_transaction_reset_owner_behavior.test.mjs`
- `node --check tests/renderer_transaction_reset_hardening_inventory_boundary.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
- `npm run test:node:renderer-transaction-reset-owner`
- `npm run test:node:renderer-transaction-reset-hardening-inventory`
- `npm run test:node:renderer-set-map-data-transaction`
- `npm run test:node:renderer-startup-transaction-owner`
- `npm run test:node:renderer-startup-transaction-inventory`
- `npm run test:node:hit-canvas-scheduling-owner-suite`
- `npm run test:node:renderer-render-phase-lifecycle`
- `npm run test:node:render-transaction-diagnostics`
- `npm run test:node:scenario-refresh-plans`
- `npm run test:node:exact-after-settle-refresh-plans`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `npm run verify:state-write-allowlist`
- `git diff --check`

## Progress

- 2026-07-01: P49 started from `origin/main@1fc19e97bd102083f4739d8053d306504ad39d13`, after confirming P47 and P48 are on default main.
- 2026-07-01: Implemented the narrow reset owner, updated P49/P47 inventory gates, and completed the full Node/static validation plan. Log: `.runtime/tests/p49-validation-20260701.log`.
- 2026-07-01: Functional commit `9c9996ccebda7ac5e8ffab71753da0f7a762eb78` was pushed to `origin/codex/p49-renderer-transaction-reset-owner-20260701` and fast-forwarded to `origin/main`.
