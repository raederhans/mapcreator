# Renderer Visible Frame Diagnostics Owner P42

## Scope

`visible_frame_diagnostics_owner.js` owns visible-frame diagnostic payload and metric ordering only.

`map_renderer.js` remains the composition root and keeps first-visible wrapper names stable.

`render_transaction_diagnostics.js` keeps visible-frame snapshot, warning, and identity-only recording ownership.

`drawCanvas()`, `renderPassToCache()`, hit canvas, scenario refresh, exact scheduler, strategic owners, `public.js`, state-write allowlist, and `dist/app/**` stay out of scope.

Metric names, reason strings, paintSource values, blockReason values, and payload keys remain compatible with the pre-P42 wrappers.

## Implementation Plan

- Add `createVisibleFrameDiagnosticsOwner({ effects, getters })` under `js/core/renderer/`.
- Delegate `recordVisibleFrameTransactionMetric()`, `noteFirstVisibleFrameBlocked()`, `markFirstVisibleFramePainted()`, and `resetFirstVisibleFramePainted()` from `map_renderer.js`.
- Keep visible-frame facts and render-state reads in injected `map_renderer.js` getters.
- Return frozen owner summaries with status, reason, first-visible action, diagnostic/metric flags, effect order, getter order, and counter order.
- Add behavior and inventory tests for payload compatibility, first-visible guard behavior, fail-fast dependency injection, and forbidden lifecycle migration.

## Validation Plan

- `node --check` for the new owner, `map_renderer.js`, new tests, and architecture checker.
- Package JSON parse.
- P42 owner and inventory tests.
- Existing renderer-adjacent gates listed by the request: P40 lifecycle inventory, render transaction diagnostics, P38 setMapData transaction, P39 reset-hardening inventory, exact-after-settle refresh plans, scenario refresh plans, architecture boundaries, test import graph, state-write allowlist, and `git diff --check`.

## Delivery Package

1. Added a narrow visible-frame diagnostics owner for payload/counter/metric ordering.
2. Kept visible-frame render facts, draw paths, cache/canvas behavior, and public facade in their existing files.
3. Preserved first-visible accepted, blocked, reset, and transaction metric payload shapes through injected effects/getters.
4. Added behavior and inventory coverage for P42 boundaries.
5. Left `dist/app/**`, state-write allowlist, scenario refresh runtime, exact-after-settle scheduler, strategic runtime, `drawCanvas()`, `renderPassToCache()`, and hit canvas build unchanged.

Files:

- Core: `js/core/renderer/visible_frame_diagnostics_owner.js`, `js/core/map_renderer.js`.
- Tests: `tests/visible_frame_diagnostics_owner_behavior.test.mjs`, `tests/visible_frame_diagnostics_owner_inventory.test.mjs`, `tests/scenario_chunk_contracts.test.mjs`.
- Tooling/package: `tools/check_architecture_boundaries.mjs`, `package.json`.
- Docs: `docs/active/renderer-visible-frame-diagnostics-owner-p42-20260630.md`, `docs/active/_worktree_registry.md`.
- Temporary files: none.

Diff summary: `map_renderer.js` now delegates visible-frame transaction, blocked, first-paint, and reset wrappers to an injected diagnostics owner. The new owner records the same visible-frame transaction diagnostics, render perf metrics, counters, first-visible hook payload, paint source, reason, block reason, committed identity, and commit-key signature through explicit effects/getters. Static contracts were updated to follow the current P38/P41/P42 owner boundaries instead of old inline anchors, and the P42 architecture checker now scopes old inline forbidden-token checks to the migrated wrapper slice.

Commit status: this package is intended to be included in the P42 functional Lore commit from branch `codex/p42-visible-frame-diagnostics-owner`; no self-hash is recorded inside the same commit.

Base divergence: the P42 worktree started from `origin/main@419c6ba0`, then rebased cleanly onto `origin/main@74bc91ff` before final validation. Parent `main@74bc91ff` is aligned with `origin/main@74bc91ff`.

Potential conflicts: yellow for future edits to `js/core/map_renderer.js`, `tools/check_architecture_boundaries.mjs`, `package.json`, `tests/scenario_chunk_contracts.test.mjs`, or this registry. Green by path against the integrated Phase6A/public-sample source and generated dist.

Validation passed:

- `node --check js/core/renderer/visible_frame_diagnostics_owner.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/visible_frame_diagnostics_owner_behavior.test.mjs`
- `node --check tests/visible_frame_diagnostics_owner_inventory.test.mjs`
- `node --check tests/scenario_chunk_contracts.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `npm run test:node:visible-frame-diagnostics` (`9/9` owner behavior, `5/5` inventory)
- `npm run test:node:scenario-chunk-contracts` (`57/57`)
- `npm run test:node:renderer-render-lifecycle-inventory` (`8/8`)
- `npm run test:node:render-transaction-diagnostics` (`21/21`)
- `npm run test:node:renderer-set-map-data-transaction` (`18/18`)
- `npm run test:node:renderer-transaction-reset-hardening-inventory` (`8/8`)
- `npm run test:node:exact-after-settle-refresh-plans` (`9/9`)
- `npm run test:node:scenario-refresh-plans` (`24/24`)
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph` (`50` specs)
- `npm run verify:state-write-allowlist` (`115` tracked files)
- `git diff --check` with Windows LF-to-CRLF warnings only.

Not run: browser/dev-server/E2E smoke. P42 only moves Node/static visible-frame diagnostics orchestration behind injected effects and does not touch `dist/app/**`, Pages assets, browser entrypoints, or live runtime startup paths.

Review fixes: staged-new-file reminder accepted for final commit discipline; behavior tests now cover cache `lastAction` reason fallback and explicit details overriding identity/frame-state fields; architecture-boundary P42 forbidden-token checks are scoped through the migrated wrapper slice.

Recommended next step: commit P42, push to `origin/main`, fast-forward the parent main checkout when safe, write final registry closeout, then remove the temporary P42 worktree after remote state is confirmed.
