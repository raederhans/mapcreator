# Renderer Render Pass Cache Host Owner P51

## Scope

Task grade: standard implementation with renderer-core risk.

P51 render pass cache host owner adds a narrow host setup owner inside `renderPassToCache`.

`renderPassToCache` remains the stable wrapper. Cache commit/accounting stays in `map_renderer.js`.

Allowed production change:

- `js/core/map_renderer.js`
- `js/core/map_renderer/render_pass_cache_host_owner.js`

Allowed support change:

- `tests/render_pass_cache_host_owner_behavior.test.mjs`
- `tests/render_pass_cache_host_owner_inventory.test.mjs`
- `tests/renderer_render_pass_cache_host_inventory_boundary.test.mjs`
- `package.json`
- `tools/check_architecture_boundaries.mjs`
- `docs/active/_worktree_registry.md`

Closed boundaries:

- No `drawCanvas()` migration.
- No render pass drawing function migration.
- No hit canvas build migration.
- No scenario refresh, exact-after-settle, strategic runtime, public facade, state-write allowlist, or `dist/**` changes.
- No render cache dirty/signature/reference-transform commit migration.

## First-Principles Plan

The problem is small: `renderPassToCache` currently mixes host setup with cache commit accounting. P51 only moves the host setup shell so later work can reason about cache commit separately.

Smallest safe move:

1. Add `createRenderPassCacheHostOwner({ effects, getters })`.
2. Require injected functions with fail-fast validation.
3. Implement `prepareRenderPassHost({ passName, transform, drawFn })`.
4. Return a frozen host summary with `drawResult`, `k`, skip status, and effect/getter order.
5. Keep `function renderPassToCache(passName, drawFn, transform, timings)` in `map_renderer.js`.
6. Keep commit/accounting after the host summary inside `map_renderer.js`.

## Cleanup Plan

Fallback-like inventory:

- Required dependencies fail fast with `TypeError`.
- Missing pass canvas/context returns explicit skipped summaries.
- No broad compatibility fallback, swallowed error, public facade exposure, or state-write allowlist entry is added.

Smell order:

1. Add focused behavior tests for host setup order and skip paths.
2. Extract only the host setup code.
3. Update inventory and architecture gates to allow exactly the new owner.
4. Run targeted renderer static and node gates before broader architecture gates.

## Task Checklist

- [x] Read P50 preflight and current renderer source.
- [x] Confirm current dirty parent checkout and create isolated P51 worktree from `origin/main@2354adb1`.
- [x] Assign static-only subagents for code map, test coverage, and first-principles review.
- [x] Implement host owner.
- [x] Wire stable wrapper in `map_renderer.js`.
- [x] Add behavior and inventory tests.
- [x] Update architecture checker and scripts.
- [x] Run validation.
- [x] Review for bugs and complete delivery package.

## Live Process Ownership

Main Codex thread owns all node tests, architecture checks, and any live process.

Subagents are static-only and must not run or monitor live tests.

## Current Findings

- `renderPassToCache` currently acquires the pass canvas, gets the 2D context, looks up layout, enters `withRenderTarget`, computes `k`, and calls `drawFn(k)`.
- The `hgoPreview` pass computes `k` as `Math.max(0.0001, Number(transform?.k || 1))`.
- Normal passes compute `k` through `prepareTargetContext(passContext, transform, layout)`.
- Cache commit/accounting starts after `drawResult.committed === false` handling and stays in `map_renderer.js` for P51.
- Post-review behavior coverage executes the extracted `renderPassToCache` wrapper source with stubbed dependencies, covering host skip, `committed === false`, and political fine-cache commit/accounting branches without exporting new test-only API.

## Validation

Passed:

- `node --check js/core/map_renderer/render_pass_cache_host_owner.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/render_pass_cache_host_owner_behavior.test.mjs`
- `node --check tests/render_pass_cache_host_owner_inventory.test.mjs`
- `node --check tests/renderer_render_pass_cache_host_inventory_boundary.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- Package JSON and state-write allowlist JSON parse
- `npm run -s test:node:render-pass-cache-host-owner`
- `npm run -s test:node:render-pass-cache-host-owner-inventory`
- `npm run -s test:node:renderer-render-pass-cache-host-inventory`
- `npm run -s test:node:render-pass-cache-host-owner-suite`
- `npm run -s verify:architecture-boundaries`
- `npm run -s test:node:render-cache-owner`
- `npm run -s test:node:render-transform-reuse-policy-owner`
- `npm run -s verify:state-write-allowlist`
- `npm run -s verify:test-import-graph`
- `npm run -s test:adaptive -- --files js/core/map_renderer.js js/core/map_renderer/render_pass_cache_host_owner.js tests/render_pass_cache_host_owner_behavior.test.mjs tests/render_pass_cache_host_owner_inventory.test.mjs tests/renderer_render_pass_cache_host_inventory_boundary.test.mjs tools/check_architecture_boundaries.mjs package.json`
- `node tools/select_verification_targets.mjs --check`
- `node tools/select_verification_targets.mjs docs/active/_worktree_registry.md docs/active/renderer-render-pass-cache-host-owner-p51-20260702.md js/core/map_renderer.js js/core/map_renderer/render_pass_cache_host_owner.js package.json tests/render_pass_cache_host_owner_behavior.test.mjs tests/render_pass_cache_host_owner_inventory.test.mjs tests/renderer_render_pass_cache_host_inventory_boundary.test.mjs tools/check_architecture_boundaries.mjs`
- `npm run -s test:node:render-pipeline-catalog`
- `npm run -s test:node:render-invalidation-catalog`
- `npm run -s test:node:render-transaction-diagnostics`
- `py -3 -m unittest tests.test_map_renderer_strategic_overlay_render_owner_boundary_contract -q`
- `npm run -s test:node:transport-overview-line-contract`
- `npm run -s verify:test:e2e-layers`
- `npm run -s verify:test-timeout-inventory`
- `npm run -s verify:test-timeout-guardrails`
- `npm run -s verify:test-console-allowlist`
- `git diff --check`

Skipped:

- Browser/Playwright main-thread smoke from selector recommendations. P51 changed a narrow wrapper/owner and deterministic Node/static gates covered the moved host setup. The selector listed browser checks as main-thread serial with `.runtime-output`, browser dev server, and Playwright locks.
- CI workflow changes. Existing verification selector builds Node routes from `package.json`; direct selector evidence maps `js/core/map_renderer/render_pass_cache_host_owner.js` to `test:node:render-pass-cache-host-owner` and `test:node:render-pass-cache-host-owner-suite`. Editing shared CI workflow files is outside the P51 allowed production/support scope.

Route gaps:

- `docs/active/_worktree_registry.md` and this P51 active doc were unmatched by selector routing. Production and test files were matched.

## Review Follow-up

Static reviewer result: no blocking issue found.

Actions taken:

- Added extracted-wrapper behavior tests for `renderPassToCache` skip, declined commit, and political fine-cache commit/accounting paths.
- Re-ran `npm run -s test:node:render-pass-cache-host-owner`, `npm run -s test:node:render-pass-cache-host-owner-suite`, `npm run -s verify:architecture-boundaries`, `npm run -s verify:test-import-graph`, `node tools/select_verification_targets.mjs --check`, and `git diff --check`.
- Confirmed selector routes the new owner source to the new owner script and suite through dynamic package script route generation.

## Delivery Package

1. Changed `renderPassToCache` to call a P51 host owner for canvas/context/layout/target/draw callback setup.
2. Added `createRenderPassCacheHostOwner` with fail-fast injected dependencies and frozen summaries.
3. Added behavior and inventory tests for skip paths, ordering, `hgoPreview` k normalization, draw result passthrough, wrapper commit branches, and boundary exclusions.
4. Updated the older P50 inventory test and architecture checker to lock the new P51 split.
5. Updated package scripts, active P51 notes, and worktree registry.

Files:

- Core: `js/core/map_renderer.js`, `js/core/map_renderer/render_pass_cache_host_owner.js`
- Tests: `tests/render_pass_cache_host_owner_behavior.test.mjs`, `tests/render_pass_cache_host_owner_inventory.test.mjs`, `tests/renderer_render_pass_cache_host_inventory_boundary.test.mjs`
- Tooling: `tools/check_architecture_boundaries.mjs`, `package.json`
- Docs: `docs/active/renderer-render-pass-cache-host-owner-p51-20260702.md`, `docs/active/_worktree_registry.md`
- Temporary files: none

Diff summary:

- Production code adds one 147-line owner and replaces the inline host setup inside `renderPassToCache` with `getRenderPassCacheHostOwner().prepareRenderPassHost(...)`.
- Cache dirty/signature/reference-transform commits, political metadata, pass timings, counters, and contextScenario reuse accounting remain in `map_renderer.js`.
- `drawCanvas`, pass drawing functions, hit canvas build, scenario refresh, exact scheduler, strategic runtime, public facade, state-write allowlist, and `dist/**` remain unchanged.

Commit status:

- Prepared for direct default-main landing before P52 because P52 requires the P51 owner to be present on the default-main baseline.

Base status:

- Base is `origin/main@2354adb13940462335eafd1f383b45d80812466b`.
- Parent checkout `main@16abfd5f` remains dirty and behind remote; it was not modified.

Potential conflicts:

- Red with concurrent edits to `js/core/map_renderer.js`, `package.json`, `tools/check_architecture_boundaries.mjs`, or `docs/active/_worktree_registry.md`.
- Yellow with SF-ATS/P8 package and test-routing worktrees.
- Green with UI/landing/dist lanes because P51 intentionally leaves those paths unchanged.

Recommendation:

- Use this P51 commit as the default-main baseline for P52. Keep later package/registry conflicts explicit when integrating unrelated SF-ATS or P8 worktrees.
