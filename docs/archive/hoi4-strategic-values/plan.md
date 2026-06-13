# HOI4 Strategic Values Plan

## Objective

Deliver the full HOI4 strategic values feature for `hoi4_1936` and `hoi4_1939`.

The feature ingests HOI4 state `victory_points`, `manpower`, `resources`, and
`buildings`, emits `strategic_values.by_feature.json`, and exposes three runtime
surfaces:

- Strategic choropleth lens for manpower, resources, infrastructure, and factories.
- Victory point weighting for scenario city ranking.
- Strategic resource marker layer.

## Boundaries

- Primary source is the local Steam HOI4 install discovered by the existing builder.
- `hoi4_1936` and `hoi4_1939` are in scope.
- `tno_1962` and `hgo_1936` remain future work.
- Scenario outputs are governed by scenario manifest and contract checks.
- No new dependency is planned.
- Long tests, builds, dev server, browser smoke, and perf runs are owned by the main thread only.
- Shared files `index.html`, `css/style.css`, and `js/ui/toolbar.js` are edited by the main thread only.

## Phases

1. Parser and model contract
   - Extend `StateRecord`.
   - Parse VP pairs, `add_victory_points`, resources, base buildings, and dated building overrides.
   - Add targeted parser tests.

2. Strategic builder, artifact, and scenario contracts
   - Add pure strategic payload builder.
   - Wire `compile_scenario_bundle()` and `tools/build_hoi4_scenario.py`.
   - Emit `strategic_values.by_feature.json`.
   - Add manifest, expectation, bundle, and strict-contract checks.

3. Runtime loading, state, and project persistence
   - Normalize strategic payloads.
   - Add optional layer config, revisions, runtime reset/snapshot/restore, and project import/export fields.

4. Choropleth lens
   - Add metric allowlist and color resolver hook.
   - Add toolbar controls and tests.

5. Victory point city ranking
   - Inject VP-derived city properties and cache invalidation.
   - Adjust city sort weight and tests.

6. Strategic resource markers
   - Render precomputed resource point markers with zoom/tier gates.
   - Add tests for pure marker decisions.

7. I18n, dist, validation, review, and delivery
   - Update i18n catalog/manual translations.
   - Build real HOI4 scenario outputs and Pages dist.
   - Run UltraQA matrix and final review.
   - Commit, push, and merge/deliver according to repository state.

## Acceptance Criteria

- Parser/model unit tests pass.
- Both HOI4 scenarios build with `--skip-atlas`.
- Both scenario bundle checks pass.
- Both strict scenario contract checks pass.
- Runtime Node tests for optional layer, choropleth, city ranking, resource markers, and file roundtrip pass.
- `npm run verify:state-write-allowlist` passes.
- `python tools/i18n_audit.py` passes.
- `python tools/build_data_catalog.py` and `python tools/data_health.py` pass.
- `npm run verify:pages-dist` passes.
- E2E city rendering and perf gate are run when feasible; any environment blocker is recorded with exact evidence.

## UltraQA Matrix

- Baseline parser fixtures for simple HOI4 syntax.
- Hostile parser fixtures for dated override, nested building blocks, comments, and `add_victory_points`.
- Strategic artifact hostile checks for missing/low-confidence VP matches and baseline hash mismatch.
- Runtime hostile checks for scenario id mismatch, bad payload shape, stale cache revisions, and inactive manifest.
- UI/state hostile checks for old project import, missing optional layer, and disabled feature path.
- Delivery hostile checks for source/dist drift and generated manifest hash consistency.

## Current Status

- [x] Isolated worktree created from `origin/main`.
- [x] Project rules, lessons, and agent tier guidance read.
- [x] User-provided plan read as guiding material.
- [x] Phase 1 parser and model contract.
- [x] Phase 2 strategic builder and scenario contracts.
- [x] Phase 3 runtime loading, state, and persistence.
- [x] Phase 4 choropleth lens.
- [x] Phase 5 VP city ranking.
- [x] Phase 6 resource markers.
- [x] Phase 7 validation matrix and Pages dist.
- [x] Final review fixes.
- [x] Archive task docs.
- [x] Rebase onto latest `origin/main`.
- [x] Resynchronize HOI4 build snapshots and audit payloads after rebase.
- [ ] Amend final verified changes, push, and delivery.
