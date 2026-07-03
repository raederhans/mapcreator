# Renderer Render Pass Commit Accounting Owner P52

## Scope

Task grade: standard implementation with renderer-core risk.

P52 render pass commit/accounting owner moves only the post-draw commit portion of `renderPassToCache` into a bounded owner:

- `drawResult.committed === false` metric recording.
- pass reference transform commit.
- political pass generation/stage/full/fine metadata commit.
- pass signature and dirty flag commit.
- political fine-cache partial dirty clear and warmup scheduling.
- pass timing, perf counters, and `contextScenarioReuseCount` reset.

Allowed production change:

- `js/core/map_renderer.js`
- `js/core/map_renderer/render_pass_commit_accounting_owner.js`

Allowed support change:

- `tests/render_pass_commit_accounting_owner_behavior.test.mjs`
- `tests/render_pass_commit_accounting_owner_inventory.test.mjs`
- `tests/render_pass_cache_host_owner_behavior.test.mjs`
- `tests/render_pass_cache_host_owner_inventory.test.mjs`
- `tests/renderer_render_pass_cache_host_inventory_boundary.test.mjs`
- `package.json`
- `tools/check_architecture_boundaries.mjs`
- `docs/active/renderer-render-pass-commit-accounting-owner-p52-20260702.md`
- `docs/active/_worktree_registry.md`

Closed boundaries:

- No `drawCanvas()` migration.
- No render pass drawing function migration.
- No pass canvas/context/layout/target setup migration beyond the existing P51 host owner.
- No hit canvas build migration.
- No public facade, state-write allowlist, or `dist/**` changes.
- No scenario refresh, exact-after-settle, strategic runtime, public facade, state-write allowlist, or `dist/**` changes.

## Current P51 baseline

P51 is landed on default main as commit `725abb4a305a03687e7bca358ff918ba659cfef1`.

Current baseline before P52:

- `function renderPassToCache(passName, drawFn, transform, timings)` remains in `js/core/map_renderer.js`.
- `createRenderPassCacheHostOwner` owns pass canvas acquisition, 2D context acquisition, layout lookup, target context preparation, `withRenderTarget`, and `drawFn(k)`.
- `renderPassToCache` calls `getRenderPassCacheHostOwner().prepareRenderPassHost(...)` and exits early when the host result is skipped.
- render pass drawing functions remain in `map_renderer.js`.
- `render_pipeline_passes.js`, `render_pipeline_catalog.js`, and `render_pass_catalog.js` remain authoritative for pass execution and pass definitions.

## Commit/accounting owner boundary

`createRenderPassCommitAccountingOwner({ effects, getters })` owns only the post-host commit/accounting step through `commitRenderPass({ passName, transform, drawResult, timings, passStart, hostSummary })`.

Injected effects:

- `recordRenderPerfMetric`
- `setPassReferenceTransform`
- `setPassFullReferenceTransform`
- `clearPassFullReferenceTransforms`
- `schedulePoliticalPathWarmup`
- `recordPassTiming`
- `incrementPerfCounter`

Injected getters:

- `getRenderPassCacheState`
- `getVisibleFrameIdentity`
- `getRenderPassSignature`
- `getPassCounterNames`
- `nowMs`

The owner returns a frozen summary with commit status, skip reason, dirty/signature/timing flags, political fine-cache readiness, and effect/getter order.

`renderPassToCache` remains the stable wrapper. Its responsibility after P52 is to:

1. Ask the P51 host owner to prepare the pass host and invoke `drawFn(k)`.
2. Return early when host setup skips.
3. Delegate the host draw result and `passStart` to the P52 commit/accounting owner.

## Guardrails

- P51 host owner remains bounded to host setup and avoids commit/accounting tokens.
- P52 commit/accounting owner avoids host setup tokens, DOM/global renderer objects, `drawCanvas`, drawing functions, hit canvas build, scenario refresh, exact scheduler, and strategic overlay owners.
- Public facade remains unchanged.
- State-write allowlist remains unchanged.
- `dist/**` remains unchanged.
- No broad `renderer_render_lifecycle_owner` is introduced.

## Validation

Required validation commands:

- `node --check js/core/map_renderer/render_pass_commit_accounting_owner.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/render_pass_commit_accounting_owner_behavior.test.mjs`
- `node --check tests/render_pass_commit_accounting_owner_inventory.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
- `npm run test:node:render-pass-commit-accounting-owner`
- `npm run test:node:render-pass-commit-accounting-inventory`
- `npm run test:node:render-pass-cache-host-owner-suite`
- `npm run test:node:renderer-render-pass-cache-host-inventory`
- `npm run test:node:render-cache-owner`
- `npm run test:node:render-transaction-diagnostics`
- `npm run test:node:render-transform-reuse-policy-owner`
- `npm run test:node:render-pipeline-catalog`
- `npm run test:node:renderer-render-lifecycle-inventory`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `npm run verify:state-write-allowlist`
- `git diff --check`

Passed:

- `node --check js/core/map_renderer/render_pass_commit_accounting_owner.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/render_pass_commit_accounting_owner_behavior.test.mjs`
- `node --check tests/render_pass_commit_accounting_owner_inventory.test.mjs`
- `node --check tests/render_pass_cache_host_owner_behavior.test.mjs`
- `node --check tests/renderer_render_pass_cache_host_inventory_boundary.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- package JSON parse
- `npm run test:node:render-pass-commit-accounting-owner`
- `npm run test:node:render-pass-commit-accounting-inventory`
- `npm run test:node:render-pass-cache-host-owner-suite`
- `npm run test:node:renderer-render-pass-cache-host-inventory`
- `npm run test:node:render-cache-owner`
- `npm run test:node:render-transaction-diagnostics`
- `npm run test:node:render-transform-reuse-policy-owner`
- `npm run test:node:render-pipeline-catalog`
- `npm run test:node:renderer-render-lifecycle-inventory`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `npm run verify:state-write-allowlist`
- `npm run -s test:adaptive -- --files ...` dry-run, planned 209 commands
- `git diff --check`

Skipped:

- Browser/Playwright smoke. P52 changes a narrow render pass wrapper/owner and deterministic Node/static gates cover the moved commit/accounting behavior.
- `verify:pages-dist`. P52 explicitly forbids `dist/**`; `git diff --name-only -- dist js/core/map_renderer/public.js tools/eslint-rules/state-writer-allowlist.json` returned no paths.

## Delivery Package

1. Added `createRenderPassCommitAccountingOwner` for post-draw render pass commit/accounting.
2. Updated `renderPassToCache` to keep the P51 host wrapper and delegate draw-result accounting to P52.
3. Added behavior and inventory tests for normal, declined, political fine/non-fine, and `contextScenario` accounting paths.
4. Updated P51/P50 inventory contracts and architecture checker so host setup and commit/accounting are separate owners.
5. Added named package scripts and active P52 documentation.

Files:

- Core: `js/core/map_renderer.js`, `js/core/map_renderer/render_pass_commit_accounting_owner.js`
- Tests: `tests/render_pass_commit_accounting_owner_behavior.test.mjs`, `tests/render_pass_commit_accounting_owner_inventory.test.mjs`, `tests/render_pass_cache_host_owner_behavior.test.mjs`, `tests/render_pass_cache_host_owner_inventory.test.mjs`, `tests/renderer_render_pass_cache_host_inventory_boundary.test.mjs`
- Tooling: `tools/check_architecture_boundaries.mjs`, `package.json`
- Docs: `docs/active/renderer-render-pass-commit-accounting-owner-p52-20260702.md`, `docs/active/_worktree_registry.md`
- Temporary files: none

Diff summary:

- Production code adds one 161-line owner and replaces the inline post-draw commit/accounting block in `renderPassToCache` with `getRenderPassCommitAccountingOwner().commitRenderPass(...)`.
- P51 host setup owner remains unchanged and host-only.
- `drawCanvas`, render pass drawing functions, hit canvas build, scenario refresh, exact scheduler, strategic runtime, public facade, state-write allowlist, and `dist/**` remain unchanged.

Commit status:

- Ready for direct default-main landing before P53.

Base status:

- Base is P51 `origin/main@725abb4a305a03687e7bca358ff918ba659cfef1`.
- Parent checkout `main@16abfd5f` remains dirty and untouched.

Potential conflicts:

- Red with concurrent edits to `js/core/map_renderer.js`, `package.json`, `tools/check_architecture_boundaries.mjs`, or `docs/active/_worktree_registry.md`.
- Yellow with SF-ATS/P8 package and test-routing worktrees.
- Green with UI/landing/dist lanes because P52 leaves those paths unchanged.

Recommendation:

- Land P52 on default main, then start P53 drawCanvas orchestration preflight from the P52 baseline.
