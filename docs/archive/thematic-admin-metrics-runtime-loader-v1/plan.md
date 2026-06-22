# Thematic Admin Metrics Runtime Loader v1 Plan

## Goal

Build the narrow runtime data slice that loads and queries admin-level thematic metrics from registered data assets.

## Scope

- Add a read-only loader/query module for `paths.metrics` admin payloads.
- Use runtime manifest asset keys and `data_service` catalog allowlist access.
- Reject grid layers and malformed admin metric payloads before they can enter runtime lookup code.
- Preserve `null` as a missing source value and preserve WGI uncertainty/source row fields.
- Add focused Node behavior tests and a named package script.

## Non-goals

- No renderer integration.
- No UI or layer panel changes.
- No scenario state, download flow, topology, source ingest, or map rendering changes.
- No production mock data.

## Task Checklist

- [x] Create isolated worktree from `main@159870ed`.
- [x] Add catalog metadata reader in `js/core/data_service.js`.
- [x] Add `js/core/thematic_admin_metrics_loader.js`.
- [x] Add `tests/thematic_admin_metrics_loader_behavior.test.mjs`.
- [x] Add `test:node:thematic-admin-metrics-loader`.
- [x] Run targeted syntax and Node tests.
- [x] Run required project gates.
- [x] Run read-only review/QA.
- [x] Archive this task folder after validation.
- [ ] Commit, integrate into `main`, push, and clean the worktree.

## Validation Queue

- `node --check js/core/thematic_admin_metrics_loader.js js/core/thematic_layer_catalog.js js/core/data_service.js js/core/runtime_asset_registry.js`
- `npm run test:node:thematic-admin-metrics-loader`
- `node --test tests/thematic_admin_metrics_loader_behavior.test.mjs`
- `npm run test:node:thematic-layer-catalog`
- `npm run test:node:layer-panel-contracts`
- `npm run test:node:layer-status-diagnostics`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `git diff --check`

## Live Process Ownership

- Owner: main Codex agent.
- Other agents: read-only static review only.
- Current live process: none.

## Validation Results

- Passed: `node --check js/core/thematic_admin_metrics_loader.js js/core/thematic_layer_catalog.js js/core/data_service.js js/core/runtime_asset_registry.js`.
- Passed: `npm run test:node:thematic-admin-metrics-loader` with 19/19 tests.
- Passed: `node --test tests/thematic_admin_metrics_loader_behavior.test.mjs` with 19/19 tests.
- Passed: `npm run test:node:thematic-layer-catalog` with 5/5 tests.
- Passed: `npm run test:node:layer-panel-contracts` with 6/6 tests.
- Passed: `npm run test:node:layer-status-diagnostics` with 6/6 tests.
- Passed: `npm run verify:architecture-boundaries`.
- Passed: `npm run verify:test-import-graph`.
- Passed: `git diff --check`; output only reported existing CRLF conversion warnings for touched Windows files.
- Code review: CLEAR after fixing malformed/duplicate join key rejection plus WGI source field and catalog role/readMode tests.
- Architect review: CLEAR after adding schema version and empty feature payload rejection.
