# TNO political edit progressive recovery task

## Checklist

- [x] Load requested workflow skills.
- [x] Create Codex goal.
- [x] Create execution branch.
- [x] Read project agent rules, agent tiers, and lessons learned.
- [x] Create active task docs.
- [x] Update worktree registry with this branch.
- [x] Implement pending political color edit state.
- [x] Add explicit/pending political foreground paint priority.
- [x] Extend runtime-state tests.
- [x] Extend scenario-chunk contracts.
- [x] Add targeted E2E regression under the existing progressive recovery route.
- [x] Run focused verification.
- [x] Run review / bug self-check and fix findings.
- [x] Update lessons learned only if a durable new lesson appears.
- [x] Prepare delivery package and integration status.
- [x] 2026-06-18 re-audit after module-boundary main integration.
- [x] Confirm current `origin/main@e1f4eb20` already contains the effective TNO recovery code and tests.
- [x] Archive this active task folder after coverage closeout.

## 2026-06-18 Coverage Closeout

1. Changed behavior:
   - No production code was moved in this closeout.
   - `origin/main@e1f4eb20` already contains the TNO pending political color edit behavior and module-boundary split.
   - Parent checkout dirty renderer files are retained only as recovery evidence.
   - Landing work-map dirty assets are covered by main.
   - Active TNO docs are archived under `docs/archive/tno-political-edit-progressive-recovery-20260618/`.

2. Files:
   - Docs: `docs/active/_worktree_registry.md`, this archived task/context/plan folder.
   - Core/test/dist: unchanged by this closeout.

3. Diff summary:
   - Registry now records TNO recovery as covered by main and marks the parent checkout as recovery-only dirty state.
   - Active docs moved to archive.

4. Commit status:
   - Closeout commit is ready on `codex/tno-political-recovery-integration`.

5. Base status:
   - Branch base: `origin/main@e1f4eb2030d7afba0a679e84fab65d398afc90e4`.
   - Parent checkout HEAD: `a4957713cb73fdfb02aa0c4d1c265377b5ceaff5`.
   - `a4957713` is an ancestor of `origin/main`.

6. Potential conflicts:
   - Red if any parent dirty `js/`, `dist/`, `tests/`, or `package.json` file is staged wholesale.
   - Green for this closeout diff because it is docs-only.

7. Verification:
   - 2026-06-18 final evidence logs live under `.runtime/tests/tno-political-recovery/`.
   - `validation-summary.json` records the first batch run, including the initial TNO E2E dependency-resolution failure in the clean worktree.
   - `node --check` targeted JS checks: pass.
   - `npm run test:node:renderer-runtime-state-behavior`: pass.
   - `npm run test:e2e:dev:political-progressive-recovery`: pass, 3/3 in `tno-political-progressive-e2e-junction.log` after adding the temporary ignored `node_modules` junction for dependency resolution.
   - `npm run test:node:scenario-chunk-contracts`: 43/44 in `scenario-chunk-contracts-rerun.log`, with the registered `hoverFacilityAndCityProbeMetricsRemainNamed` failure.
   - `npm run verify:test-import-graph`: pass.
   - `py -3 tools/build_pages_dist.py`: pass.
   - `py -3 -m unittest tests.test_pages_dist_startup_shell -q`: pass, 37 tests.
   - `npm run test:node:landing-showcase-view`: pass, 8/8.
   - `git diff --check`: pass with line-ending warnings only.

8. Remaining risks:
   - Parent checkout still has dirty recovery files and should stay untouched unless a later explicit cleanup task chooses restore/reset boundaries.

9. Recommended next action:
   - Merge the docs-only closeout branch into main after final read-only review pass.

## Delivery Package

1. Changed behavior:
   - Added pending political color edit state to the render pass cache.
   - Marked targeted color refreshes as pending edits and kept them through same-scenario color rebuild revision bumps.
   - Blocked progressive admin0 coarse skip while pending color edits need a fine render confirmation.
   - Cleared pending edit ids only after matching ids are actually drawn by full or partial political repaint.
   - Painted explicit visual overrides and pending color edit ids after underlays and ordinary detail features so overlapping fallback/detail geometry cannot cover the user's edit.
   - Scoped pending edit ids to resolved/renderable features, so stale ids do not keep progressive recovery disabled.

2. Files:
   - Core: `js/core/map_renderer.js`, `js/core/state/renderer_runtime_state.js`.
   - Dist mirror: `dist/app/js/core/map_renderer.js`, `dist/app/js/core/state/renderer_runtime_state.js`.
   - Pages dist sync from current main source: `dist/app/index.html`, `dist/app/js/core/renderer/color_resolution_strategy.js`, `dist/app/js/core/scenario/presentation_ocean_fill_restore.js`, `dist/app/js/core/state/ui_state.js`, `dist/app/js/ui/i18n.js`, `dist/app/js/ui/i18n_catalog.js`, `dist/app/js/ui/scenario_controls.js`, `dist/pages-dist-manifest.json`.
   - Tests: `tests/scenario_chunk_contracts.test.mjs`, `tests/renderer_runtime_state_behavior.test.mjs`, `tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js`, `tests/e2e/support/political-pixel-probe.js`.
   - Script metadata: `package.json`.
   - Docs: `docs/active/tno-political-edit-progressive-recovery/*`, `docs/active/_worktree_registry.md`.
   - Temporary diagnostics: deleted before closeout.

3. Diff summary:
   - Political pass lifecycle now carries pending edit ids, revision, scenario id, and reason.
   - Political draw ordering now uses underlay, normal detail, foreground edit buckets.
   - Pending edit id replacement prunes stale ids, and partial no-op repaint no longer clears pending edits without rendered-id proof.
   - E2E pixel probe imports `projectGeoToScreen()` from the renderer to sample the real active projection.

4. Commit status:
   - Clean integration worktree is prepared on `codex/tno-political-color-recovery-integration`; commit pending final review.
   - Original checkout remains mixed with unrelated landing/dist WIP and should not be staged wholesale.

5. Base status:
   - Branch: `codex/tno-political-color-recovery-integration`.
   - Base / HEAD / main: `a4957713cb73fdfb02aa0c4d1c265377b5ceaff5`.
   - No branch commit divergence yet.

6. Potential conflicts:
   - Red: `js/core/map_renderer.js` and `dist/app/js/core/map_renderer.js` are shared renderer hot files.
   - Yellow: `package.json` and Pages dist files are also dirty from nearby landing work.
   - File-overlap review is required before staging or merging.

7. Verification:
   - `node --check` for changed JS/E2E files: pass.
   - `npm run test:node:renderer-runtime-state-behavior`: pass, 9/9.
   - Bundled Python color-resolution boundary unittest: pass.
   - `npm run test:node:scenario-chunk-contracts`: 43/44 pass; known unrelated `hoverFacilityAndCityProbeMetricsRemainNamed` failure remains.
   - `node --test --test-name-pattern "renderer shell fallback policy" tests/scenario_chunk_contracts.test.mjs`: pass, 1/1.
   - Source-shape review check for foreground-before-underlay, pending Set replacement, renderable pending ids, and partial no-op pending retention: pass.
   - `npm run test:e2e:dev:political-progressive-recovery`: pass, 3/3.
   - Clean worktree `npm run verify:pages-dist` with local shapely venv: pass; Python startup shell unittest 37 tests OK with 6 skipped, landing showcase view 6/6 pass.
   - `git diff --check`: pass with CRLF warnings only.

8. Remaining risks:
   - Full scenario chunk contract suite still has the known unrelated `hoverFacilityAndCityProbeMetricsRemainNamed` failure.
   - Original checkout has unrelated landing/dist changes; clean integration branch should be used for commit/merge.

9. Recommended next action:
   - Commit the clean integration branch after final static review.
   - Merge/push from the clean integration branch if final review remains clear.
