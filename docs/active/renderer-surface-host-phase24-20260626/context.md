# Renderer Surface Host Phase 24 Context

## Baseline

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-p24-renderer-surface-host-impl`
- Branch: `codex/p24-renderer-surface-host-impl`
- Base: `origin/main@56f22e7380416429d6cc5e2ce58fd8472cae8542`
- Parent checkout: dirty and behind remote; preserved untouched.

## Live Process Ownership

- Main Codex agent owns all tests, builds, browser checks, and command interpretation.
- Subagents are read-only/static:
  - code-mapper: surface handle location map.
  - architect: P24 architecture boundary review.
  - test-engineer: test strategy review.

## Findings

- P23 inventory test currently asserts `map_renderer.js` still owns surface handles and `renderer_surface_host.js` does not exist.
- P24 must invert that contract: host exists and owns handle accessors; old top-level handle declarations disappear from `map_renderer.js`.
- High-risk identifier: `context` appears in many non-surface meanings, so replacements must be scoped carefully.
- Canvas layer manager call sites remain around `ensureCanvasLayers`, `getCanvasLayer`, `resizeCanvasLayers`, and `clearCanvasLayer`.

## Progress Log

- Created clean worktree from `origin/main@56f22e73`.
- Read attachment, project rules, lessons learned, P23 file set, and surface handle references.
- Added `js/core/renderer/renderer_surface_host.js` as a getter-first handle registry with `reset`, `setMany`, and metadata-only `snapshot`.
- Migrated `js/core/map_renderer.js` module-scope surface handle storage to `rendererSurfaceHost`, while keeping `ensureHybridLayers`, `setCanvasSize`, projection/path creation, zoom lifecycle effects, render passes, hit canvas build, selection/fill, scenario refresh, and strategic overlay runtime in the host file.
- Updated `tests/renderer_surface_host_inventory_boundary.test.mjs` from the P23 "reserved module" contract to the P24 implementation contract.
- Updated `tools/check_architecture_boundaries.mjs` so the surface host is required, line-budgeted, isolated from runtime state and renderer semantics, and imported only by `js/core/map_renderer.js`.
- Added `tests/renderer_surface_host_behavior.test.mjs` and package script `test:node:renderer-surface-host`.
- Architect review requested stronger host contracts; added production-import exclusivity and broader semantic blacklists for render/update/hit/selection/export/lifecycle tokens.

## Verification Snapshot

- Passed: `node --test tests/renderer_surface_host_behavior.test.mjs`.
- Passed: `npm run test:node:renderer-surface-host` 12/12.
- Passed: `node --check js/core/renderer/renderer_surface_host.js`.
- Passed: `node --check js/core/map_renderer.js`.
- Passed: `node tools/check_architecture_boundaries.mjs`.
- Passed: `npm run test:node:renderer-surface-host-inventory` 6/6.
- Passed: `npm run test:node:renderer-runtime-state-behavior` 10/10.
- Passed: `npm run test:node:render-transaction-diagnostics` 21/21.
- Passed: `npm run test:node:scenario-refresh-plans` 24/24.
- Passed: `npm run test:node:exact-after-settle-refresh-plans` 9/9.
- Passed: `npm run test:node:canvas-layer-manager` 4/4.
- Passed: `npm run test:node:physical-layer-owner` 6/6.
- Passed: `npm run test:node:river-layer-owner` 8/8.
- Passed: `npm run test:node:border-draw-owner-behavior` 4/4.
- Passed: `npm run test:node:border-mesh-owner-behavior` 4/4.
- Passed: `npm run verify:architecture-boundaries`.
- Passed: `npm run verify:state-write-allowlist`.
- Passed: `npm run verify:test-import-graph`.
- Passed: `npm run verify:pages-dist` with Pages builder, startup shell 39/39, and landing showcase 8/8.
- `npm run verify:dist-drift` regenerated required `dist/app/**` mirrors and failed before staging because generated dist files were intentionally pending in the worktree.
- Passed after staging generated mirrors: `npm run verify:dist-drift`.
- Passed: `npm run test:e2e:dev:tno-ready-state` 5/5 after adding an ignored local `node_modules` junction for Playwright.
- Passed: `npm run test:e2e:smoke` 4/4; observed the known backend auth 401 and D3 unsafe water geometry warnings.
- Passed: `npm run test:e2e:ui-rework-mainline` 5/5.
- Passed: `npm run test:e2e:dev:scenario-chunk-runtime` 8/8.
- Passed: `git diff --check`.

## Review

- Architect lane: requested stronger host boundary contracts; fixed by adding production import exclusivity plus broader semantic blacklists to both inventory and architecture checks.
- Final code-review lane: `REQUEST CHANGES` only for untracked new source/test/dist files before staging; fixed by staging the new source, test, and dist mirror files. No P24 boundary or behavior blocker found.
