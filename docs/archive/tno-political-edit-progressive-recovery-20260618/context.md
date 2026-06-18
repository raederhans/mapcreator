# TNO political edit progressive recovery context

## 2026-06-17 Start

- Branch: `codex/tno-political-color-recovery`
- Base commit: `a4957713cb73fdfb02aa0c4d1c265377b5ceaff5`
- Main worktree was clean before branch creation.
- Codex goal created for implementation, verification, documentation, review, commit, and integration-ready delivery.
- OMX CLI state writes were not used as the primary tracker because existing local workflow state rejected new `ultrawork` / `ultraqa` state writes.
- Main Codex agent owns all live test, build, dev server, and browser processes.
- Subagents are limited to read-only static review and test-shape advice.

## Evidence Snapshot

- `refreshResolvedColorsForFeatures()` already updates resolved colors and adds `partialPoliticalDirtyIds`.
- `drawScenarioPoliticalBackgroundFills()` allows progressive admin0 background when the dirty reason is not exactly `refresh-colors`.
- `drawPoliticalPass()` skips the fine feature fill/stroke loops when the background summary reports `progressive-coarse-underlay`.
- `invalidateRenderPasses()` can clear partial dirty ids and overwrite the political dirty reason for non-preserving invalidation reasons.
- Prior final-pixel color-source fixes cover full visual color resolution but do not prove immediate post-edit frame behavior.

## Baseline Risk

- Previous static run of `npm run test:node:scenario-chunk-contracts` had one unrelated failure: `hoverFacilityAndCityProbeMetricsRemainNamed`.
- Execution will rerun focused gates and treat that failure as a baseline blocker only if it overlaps this change.

## 2026-06-17 Implementation Findings

- The original external plan was correct about the progressive recovery skip: after a color refresh, later political invalidations can make the progressive background path eligible and skip the fine feature loop.
- Static review found that `rebuildResolvedColors()` bumps `colorRevision`; pending edit state must retarget to the new revision during same-scenario color rebuilds.
- Runtime E2E diagnostics found an additional same-pass ordering issue: `FR_ARR_18002` was drawn with `#ff00aa`, then later `#0f0f65` fills/strokes covered the sampled France pixels.
- The final implementation keeps pending color edits in render pass cache, blocks progressive coarse skip while pending, clears only after the matching ids are actually rendered, and paints explicit/pending color edits after underlay and ordinary detail entries.
- `projectGeoToScreen()` is exported so the pixel probe samples the renderer's active projection instead of rebuilding a parallel projection inside the test.

## 2026-06-17 Review Fixes

- Static review found three valid follow-up issues: primary fallback features with explicit/pending edits were still bucketed as underlay; partial repaint no-op could force-clear pending edits without rendered-id proof; missing/stale ids could be marked pending.
- Fixes applied: foreground edit classification now wins before underlay classification, partial no-op leaves pending intact, and `refreshResolvedColorsForFeatures()` marks only resolved/renderable pending ids while replacing the pending Set to prune stale ids.
- Added behavior coverage where a primary fallback feature with a visual override or pending edit sorts after shell underlay and ordinary detail entries.

## 2026-06-17 Clean Integration Worktree

- Created isolated worktree `C:\Users\raede\.codex\worktrees\mapcreator-tno-political-color-recovery-integration` on branch `codex/tno-political-color-recovery-integration` from `main@a4957713`.
- Moved only the political renderer source/test/docs changes into the clean worktree; the original checkout still contains unrelated landing/dist WIP.
- `package.json` was hunk-scoped to the political progressive recovery E2E grep update; the unrelated landing work-map script was not carried into this branch.
- `npm run verify:pages-dist` was rerun with a local `.runtime/python/pages-dist-shapely-venv` that installs `shapely`; this is a temporary ignored validation environment, not a production dependency.
- Pages build also synchronized dist files from `main@a4957713` blank_base source changes (`index.html`, scenario controls, i18n, style defaults, and pages manifest). These dist changes are generated delivery-surface sync, not landing WIP assets.

## 2026-06-17 Verification

- `node --check js/core/map_renderer.js`: pass.
- `node --check dist/app/js/core/map_renderer.js`: pass.
- `node --check tests/scenario_chunk_contracts.test.mjs`: pass.
- `node --check tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js`: pass.
- `node --check tests/e2e/support/political-pixel-probe.js`: pass.
- `npm run test:node:renderer-runtime-state-behavior`: pass, 9/9.
- Bundled Python `-m unittest tests.test_map_renderer_color_resolution_strategy_boundary_contract -q`: pass, 1 test.
- `npm run test:node:scenario-chunk-contracts`: 43/44 pass; the single failure remains the known unrelated `hoverFacilityAndCityProbeMetricsRemainNamed` assertion.
- `node --test --test-name-pattern "renderer shell fallback policy" tests/scenario_chunk_contracts.test.mjs`: pass, 1/1.
- Source-shape review check for foreground-before-underlay, pending Set replacement, renderable pending ids, and partial no-op pending retention: pass.
- `npm run test:e2e:dev:political-progressive-recovery`: pass, 3/3, including the new France post-edit pixel regression.
- `npm run verify:pages-dist`: build step completed, Python unittest stopped on missing local `shapely` dependency in `tests.test_pages_dist_startup_shell`.
- `npm run test:node:landing-showcase-view`: 7/8 pass; the single failure is the unrelated landing work-card TNO map asset assertion.
- `git diff --check`: pass, with CRLF conversion warnings only.

## 2026-06-17 Clean Worktree Verification

- `node --check js/core/map_renderer.js`: pass.
- `node --check dist/app/js/core/map_renderer.js`: pass.
- `node --check tests/scenario_chunk_contracts.test.mjs`: pass.
- `node --check tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js`: pass.
- `node --check tests/e2e/support/political-pixel-probe.js`: pass.
- `npm run test:node:renderer-runtime-state-behavior`: pass, 9/9.
- `node --test --test-name-pattern "renderer shell fallback policy" tests/scenario_chunk_contracts.test.mjs`: pass, 1/1.
- Bundled Python `-m unittest tests.test_map_renderer_color_resolution_strategy_boundary_contract -q`: pass, 1 test.
- `npm run test:node:scenario-chunk-contracts`: 43/44 pass; the single failure remains the known unrelated `hoverFacilityAndCityProbeMetricsRemainNamed` assertion.
- `npm run test:e2e:dev:political-progressive-recovery`: pass, 3/3.
- `npm run verify:pages-dist` with the local shapely venv on PATH: pass; Python startup shell unittest 37 tests OK with 6 skipped, landing showcase view 6/6 pass.

## 2026-06-18 Coverage Closeout After Module Boundary

- Parent checkout remained on `codex/tno-political-color-recovery` with dirty mixed WIP.
- `git worktree list`, `git status --short`, `git diff --name-only`, and `git diff --stat` were run before edits.
- `git merge-base HEAD origin/main` in the parent checkout equals `a4957713cb73fdfb02aa0c4d1c265377b5ceaff5`, proving the parent branch HEAD is already contained by current `origin/main@e1f4eb2030d7afba0a679e84fab65d398afc90e4`.
- `origin/main` already contains `pendingPoliticalColorEdit*`, `isPoliticalForegroundFeature`, progressive recovery pending guards, runtime-state tests, E2E checks, and scenario-chunk contract assertions.
- The remaining parent renderer diff would undo module-boundary extraction of `scenario_refresh_plans.js` and `interaction_hit_candidates.js`, so no code was migrated from the parent checkout.
- Parent landing work-map assets and builder match `origin/main`; module-boundary active docs are covered by `docs/archive/module-boundary-slimming-20260618/`.
- Clean worktree `C:\Users\raede\.codex\worktrees\mapcreator-tno-political-recovery-integration` was created from `e1f4eb20` for this docs-only closeout.
- Validation completed from the clean worktree: targeted JS syntax checks, renderer runtime-state behavior, import graph, Pages dist builder, Pages startup shell 37 tests, landing showcase 8/8, and `git diff --check` passed.
- The first batch `validation-summary.json` still records the initial TNO E2E dependency-resolution failure; the final TNO political progressive E2E evidence is `tno-political-progressive-e2e-junction.log`, which passed 3/3 after a temporary ignored `node_modules` junction let the clean worktree resolve the already-installed Playwright dependency.
- `npm run test:node:scenario-chunk-contracts` remains 43/44 in `scenario-chunk-contracts-rerun.log` with the registered `hoverFacilityAndCityProbeMetricsRemainNamed` failure at `tests/scenario_chunk_contracts.test.mjs:999`.
