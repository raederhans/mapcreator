# Phase 2C Task Tracker

## Checklist

- [x] Create isolated worktree from current `origin/main`.
- [x] Load `ultragoal` and `ultraqa` workflows.
- [x] Read project lessons and related Phase 1.5/2A context.
- [x] Start read-only static subagents for code mapping, test strategy, and architecture invariants.
- [x] Reproduce single failing grep and capture trace/artifact paths. Current main did not reproduce; single grep passed.
- [x] Add or enable four-point diagnostics.
- [x] Decide wait/probe versus production draw/cache.
- [x] Implement minimal scoped fix.
- [x] Add or extend regression coverage.
- [x] Run requested validation set.
- [x] Run final review and first-principles bug check.
- [x] Prepare delivery package and integration recommendation.

## Delivery Package Draft

### What changed

1. Classified the residual failure as a production draw/cache bug.
2. Kept progressive coarse recovery, but blocked the fine-loop skip when a visible political feature has an explicit visual or feature color override.
3. Added post-edit E2E diagnostics at before edit, after resolved-color refresh, after chunk promotion, and after stable paint wait.
4. Added `waitForPostEditPoliticalPaint` so the pixel probe samples after the target revision has reached a political pass commit.
5. Extended the existing scenario chunk contracts with a post-edit override regression and a static guard for the progressive recovery condition. The E2E now locks the edited target to `FR_ARR_18002` and derives its probe from that feature geometry.

### Files touched

- Core: `js/core/map_renderer.js`; generated mirror `dist/app/js/core/map_renderer.js`; `dist/pages-dist-manifest.json`.
- Tests: `tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js`; `tests/scenario_chunk_contracts.test.mjs`.
- Docs: `docs/active/_worktree_registry.md`; `docs/active/tno-post-edit-draw-probe-determinism-phase2c-20260623/*`; `lessons learned.md`.
- Temporary runtime artifacts: logs under `.runtime/tests/`; local ignored `node_modules` junction to parent dependency directory.

### Diff summary

- Renderer: add visible political foreground override detection and use it only for progressive coarse-skip candidates.
- E2E: add full color coverage wait, four-point snapshots, post-edit paint wait, richer failure diagnostics, a race fix for zoom diagnostic snapshot capture, and target-geometry probing for `FR_ARR_18002`.
- Node contracts: expose fill color helper in the harness, add lower-level post-edit override regression, and lock the progressive skip condition.
- Dist: regenerated Pages dist from the final source tree.

### Commit state

Functional commit `8130f496` was pushed to `origin/main`. The closeout commit moves this task folder to archive and updates registry truth.

### Base divergence

Base is `origin/main@75ffdaa7`. Current branch has local source, test, dist, and docs changes on top of that base.

### Overlap scan

Risk is yellow because `js/core/map_renderer.js` and scenario chunk E2E are shared renderer hot paths. The change avoids Thematic, Appearance, Map Content UI, and 1936/1939 Red Sea paths.

### Validation

- `node --check tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js` passed.
- `node --check tests/scenario_chunk_contracts.test.mjs` passed.
- `node --test tests/scenario_chunk_contracts.test.mjs` passed: 56/56.
- Focused grep passed after target lock: `tno post-edit keeps political detail fill before progressive recovery skip`, 1/1, log `.runtime/tests/playwright/phase2c-single-grep-target-final.log`.
- `npm run test:e2e:dev:scenario-chunk-runtime` passed after target lock: 8/8, log `.runtime/tests/playwright/phase2c-full-target-final.log`.
- Required Node set passed: `scenario-refresh-plans`, `scenario-chunk-contracts`, `scenario-chunk-promotion-helpers`, `render-transaction-diagnostics`, `scenario-lifecycle-runtime-behavior`, `palette-runtime-bridge`.
- Direct Python boundary set passed: 55/55.
- `npm run verify:pages-dist` passed: startup shell 39/39 and landing showcase 8/8.

### Risks

- A broader manual Python boundary run including `tests.test_scenario_renderer_bridge_boundary_contract` still fails on current-base contract drift unrelated to Phase 2C files.
- The E2E diagnostic helper is intentionally verbose because it preserves the failure evidence requested for this specific regression.

### Recommendation

Phase 2C is integrated. Keep Phase 2B Red Sea as the next separate lane.
