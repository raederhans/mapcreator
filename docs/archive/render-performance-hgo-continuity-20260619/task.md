# HGO Render Continuity Task Tracker

## Checklist

- [x] Load requested `ultraqa` and `ultragoal` skills.
- [x] Load execution skills required by project rules: `ultrawork` and `ralph`.
- [x] Read `AGENTS.md`, `lessons learned.md`, and `docs/shared/agent-tiers.md`.
- [x] Create isolated worktree from current `main` HEAD.
- [x] Create durable goal and execution context.
- [x] Update worktree registry with this active branch.
- [x] Add focused tests for HGO ready-gate and staged commit behavior.
- [x] Implement HGO ready-gate, active pass filtering, and cache commit status.
- [x] Run first targeted Node/Python verification.
- [x] Run final QA matrix.
- [x] Complete independent review lane.
- [x] Commit the isolated worktree changes.
- [x] Re-check parent `main` integration safety.
- [x] Fast-forward merge through clean integration worktree.
- [x] Archive task docs after integration.

## Delivery Package

### Changes

- HGO preview owner filters `hgoPreview` out of vector active pass lists when HGO is not ready.
- HGO preview frame committer stages projected raster output, validates projected/resolved pixel stats, and commits only valid frames.
- HGO runtime hook keeps `targetCanvas` in the payload while `commitToTargetCanvas:false` forces projected rendering to return a buffer for staged commit.
- HGO preview allows a complete low-ratio projected first frame, then applies the 0.85 resolved-ratio gate to protect already committed HGO frames.
- Renderer pass cache skips reference/signature/dirty updates when a draw function returns `committed:false`.
- Ordinary interaction composite no longer depends on `hgoPreview`; HGO ready path remains HGO-only.
- Exact-after-settle target policy ignores dirty pass names outside the active idle list, and `map_renderer.js` owns the transform bucket helper used during startup/runtime identity checks.

### Files

- Core: `js/core/hgo_runtime_preview.js`, `js/core/map_renderer.js`, `js/core/map_renderer/exact_after_settle_refresh_plans.js`, `js/core/map_renderer/hgo_runtime_preview_render_owner.js`, `js/core/map_renderer/hgo_runtime_preview_frame_commit.js`
- Dist mirror: `dist/app/js/core/hgo_runtime_preview.js`, `dist/app/js/core/map_renderer.js`, `dist/app/js/core/map_renderer/exact_after_settle_refresh_plans.js`, `dist/app/js/core/map_renderer/hgo_runtime_preview_render_owner.js`, `dist/app/js/core/map_renderer/hgo_runtime_preview_frame_commit.js`, `dist/pages-dist-manifest.json`
- Data contract: `data/manifest.json`
- Tests: `tests/hgo_runtime_preview.node.test.mjs`, `tests/hgo_raster_renderer.node.test.mjs`, `tests/exact_after_settle_refresh_plans_behavior.test.mjs`, `tests/scenario_chunk_contracts.test.mjs`, `tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`, `tests/test_pages_dist_startup_shell.py`
- Docs/state: `docs/archive/render-performance-hgo-continuity-20260619/*`, `docs/active/_worktree_registry.md`
- Local ignored test helper: `node_modules` junction to the parent checkout, used only so Playwright can resolve existing dependencies in this isolated worktree.

### Diff Summary

- Current integration branch: `codex/hgo-render-continuity-main-integration`
- Feature branch: `codex/hgo-render-continuity`
- Base commit: `bf76965df72d67211258120c8c9d0f1fc71f959d`
- Base/main divergence: worktree branch is based on current local `main` at the same base commit.
- Diff size before commit: source, dist mirror, data manifest, tests, and active docs changed; two new committed files are the source/dist HGO frame committer modules.
- Commit status: functional commit `123d0b6f` records the runtime, dist, data-contract, and test changes. Feature branch closeout commit `312821df` records the ready-for-integration package.

### Verification

- PASS: `npm run test:node:hgo-runtime-preview` after review fixes (21/21)
- PASS: `npm run test:node:hgo-raster-renderer` (20/20)
- PASS: `npm run test:node:hgo-projection-model` (9/9)
- PASS: `npm run test:node:hgo-identity-resolver` (8/8)
- PASS: `npm run test:node:exact-after-settle-refresh-plans` (7/7)
- PASS: `npm run python -- -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_map_renderer_render_cache_owner_boundary_contract tests.test_map_renderer_public_contract -q` (16/16)
- PASS: `npm run test:node:scenario-chunk-contracts` (44/44)
- PASS: `npm run verify:hgo-runtime-poc`
- PASS: `npm run verify:pages-dist`
- PASS: `npm run test:e2e:dev:political-progressive-recovery` with `PLAYWRIGHT_TEST_SERVER_PORT=8812` and `MAPCREATOR_DEV_PORT=8812` (3/3)
- PASS: `npm run verify:test-import-graph`
- PASS: `npm run verify:architecture-boundaries`
- PASS: `npm run python -- -m unittest tests.test_runtime_hooks_boundary_contract -q` (5/5)
- PASS: `node --check` on affected source, dist mirror, and Node test files
- PASS: `git diff --check`
- PASS: independent review lane after review fixes; no new blocking issues were reported.
- PASS: post-merge `npm run test:node:hgo-runtime-preview` (21/21)
- PASS: post-merge `npm run test:node:scenario-chunk-contracts` (44/44)

### Integration Risk

- Shared hot files: `js/core/map_renderer.js`, HGO preview owner, render pass/exact-after-settle policy tests, Pages dist mirrors.
- File overlap with the parent dirty checkout: parent checkout dirty files are docs/archive and `lessons learned.md`; this branch is isolated from the runtime/source paths in that dirty set. The registry/docs area should be integrated through a clean path.
- Semantic risk: yellow, because renderer pass lifecycle, HGO preview and exact-after-settle policy are tightly related.
- Remaining unverified risk: full browser sweep was intentionally skipped; the focused E2E covered the known political progressive recovery surface. One prior 8811 run had a transient post-edit color sample failure; a fresh 8812 rerun passed the same 3 tests.

### Integration Recommendation

The feature branch was fast-forwarded through a clean integration worktree because the parent `main` checkout currently carries unrelated docs/archive and `lessons learned.md` changes. Push the clean integration branch to `origin/main`, then clean the temporary worktrees after final status confirmation.
