# Architecture Debt Decoupling Context

## 2026-05-19 start

- Goal created in Codex for broad architecture decoupling and stability work.
- `omx ultragoal create-goals` created `.omx/ultragoal/brief.md`, `.omx/ultragoal/goals.json`, and `.omx/ultragoal/ledger.jsonl`; G001 is in progress.
- The active Codex goal was created before the ultragoal handoff, so the Codex objective text is equivalent but not byte-identical to the generated aggregate payload. Keep this visible when checkpointing.
- Current git status before code edits: only `.omx/metrics.json` is modified. Treat it as unrelated runtime state unless this task explicitly needs it.
- Live process ownership: main thread owns every live test, browser smoke, build, dev server, and benchmark. Subagents are static/read-only only.
- Shared-file rule: `index.html`, `css/style.css`, and `js/ui/toolbar.js` require serial main-thread integration.

## Initial findings

- `docs/archive/appearance-transport-platformization/plan.md` says the earlier appearance + transport platformization backlog was completed and archived. This task must use live code facts instead of replaying the old roadmap.
- `docs/active/app-performance-overhaul/plan.md` is still open and repeats that parent thread owns live tests and perf gates.
- Top static hotspots by line count include:
  - `js/core/map_renderer.js` at 24286 lines.
  - `js/ui/toolbar/transport_workbench_controller.js` at 3592 lines.
  - `js/ui/toolbar.js` at 3520 lines.
  - `js/ui/toolbar/appearance_controls_controller.js` at 2620 lines.
  - `js/core/renderer/transport_overview_render_owner.js` at 1767 lines.
- First implementation slice target: move transport workbench static control schemas out of `transport_workbench_controller.js` into the existing descriptor module. This is the smallest clear responsibility split: descriptor owns static UI/schema description; controller owns runtime state, rendering, preview, and events.

## Phase 1 implementation

- Moved transport workbench static control schemas and energy subtype option formatting to `js/ui/toolbar/transport_workbench_descriptor.js`.
- Moved transport workbench default configs, baseline configs, section defaults, and density-family set to `js/ui/toolbar/transport_workbench_descriptor.js`.
- `js/ui/toolbar/transport_workbench_controller.js` now imports those static contracts and keeps runtime normalization, DOM rendering, preview orchestration, and events.
- Controller line count dropped from 3592 to 2868 after the two static-data splits.
- Boundary tests now assert that descriptor owns `TRANSPORT_WORKBENCH_CONTROL_SCHEMAS`, `TRANSPORT_WORKBENCH_DEFAULT_CONFIGS`, and `TRANSPORT_WORKBENCH_SECTION_DEFAULTS`, while controller consumes them.
- Main-thread verification run:
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check js/ui/toolbar/transport_workbench_descriptor.js`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract -q`
  - `node --input-type=module -e "const descriptor = await import('./js/ui/toolbar/transport_workbench_descriptor.js'); ..."`
- Verification result: syntax checks passed, descriptor import smoke passed, and 51 Python contract tests passed.
- The module import smoke prints the existing Node warning about package type auto-detection because `package.json` does not declare `type: module`; this task did not change package metadata.
- `test-engineer` subagent returned an OMX state cleanup report instead of the requested test matrix. No project code was changed by that subagent.

## Static subagent findings

- JS hotspot ranking: `js/core/map_renderer.js`, `js/ui/toolbar.js`, `js/core/renderer/transport_overview_render_owner.js`, `js/ui/toolbar/transport_workbench_controller.js`, `js/ui/toolbar/appearance_controls_controller.js`.
- Python/tooling hotspot ranking: `init_map_data.py`, `tools/build_data_catalog.py`, `tools/data_health.py`, `map_builder/scenario_bundle_platform.py`, `tools/build_pages_dist.py`.
- Next safe frontend candidate: `appearance_controls_controller.js` panel-domain split, after a fresh boundary test plan.
- Next Python candidate requires more caution because `init_map_data.py` and pages/catalog tools touch build and publish owners.

## Phase 1 review

- Code-review and architecture-review subagents both cleared the transport workbench descriptor split after `buildEnergyFacilitySubtypeControlOptions` became an explicit descriptor export/import.
- Remaining guardrail: `transport_workbench_descriptor.js` should stay limited to static catalogs and side-effect-free option formatting. Runtime state mutation, DOM rendering, async loading, and apply flows remain controller or runtime-owner responsibilities.

## Phase 2 candidate

- Target: move city-points theme option metadata, default theme styles, and theme hint formatting out of `js/ui/toolbar/appearance_controls_controller.js`.
- Rationale: this data is pure descriptor/catalog state. The controller should consume it while keeping DOM synchronization, runtime state updates, and event binding.
- Live process ownership remains main thread only; subagents are read-only/static for this phase.

## Phase 2 implementation

- Added `js/ui/toolbar/appearance_city_points_descriptor.js` for city-points theme options, default marker colors, and bilingual hint formatting.
- `appearance_controls_controller.js` now imports city-points descriptor helpers and keeps DOM option synchronization, runtime state mutation, and event binding.
- Added `js/ui/toolbar/appearance_transport_summary.js` for transport filtered counts, render-metric summary text, line-class coverage text, and transport summary formatting.
- `appearance_controls_controller.js` now keeps a thin `buildTransportFamilySummaryText` wrapper that derives narrow summary inputs from `runtimeState`.
- Architecture review flagged whole-`runtimeState` input as residual coupling. The summary owner now receives narrow inputs: transport collections, metrics, zoom scale, visual mode, and translator.
- Controller line count moved from 2620 at audit time to 2322 after the city-points and transport-summary splits.
- `transport_workbench_descriptor.js` now deep-freezes exported defaults, baseline configs, section defaults, and control schemas. The density-family contract exposes a read-only `.has()` surface instead of a mutable exported `Set`.
- Main-thread verification run:
  - `node --check js/ui/toolbar/appearance_controls_controller.js`
  - `node --check js/ui/toolbar/appearance_city_points_descriptor.js`
  - `node --check js/ui/toolbar/appearance_transport_summary.js`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract -q`
  - `node --test tests/physical_layer_contracts.test.mjs`
  - `python -m unittest tests.test_transport_facility_interactions_contract.TransportFacilityInteractionsContractTest.test_toolbar_summary_uses_filtered_transport_counts tests.test_ui_rework_plan03_support_transport_contract.UiReworkPlan03SupportTransportContractTest.test_appearance_transport_summary_reports_class_source_and_phase -q`
  - `python -m unittest tests.test_transport_facility_interactions_contract -q`
  - `node --test tests/transport_overview_line_strategy_scope_contract.node.test.mjs`
  - `node --input-type=module -e "const descriptor = await import('./js/ui/toolbar/transport_workbench_descriptor.js'); ..."`
  - descriptor import smokes for city-points and transport-summary helpers.
- Final focused verification result: 60 Python contract tests passed, 18 Node contract tests passed, syntax checks passed, and `git diff --check` reported only existing Windows line-ending warnings.
- `python -m unittest tests.test_ui_rework_plan03_support_transport_contract tests.test_global_transport_builder_contracts tests.test_transport_facility_interactions_contract -q` exposed two existing sidebar copy assertion failures in `test_adaptive_popover_and_palette_contracts_are_wired`; the failing assertions target `js/ui/sidebar.js`, which is outside this phase's edited files. The phase-specific transport summary contract passes.

## Phase 3 candidate

- Target: reduce `js/core/renderer/transport_overview_render_owner.js` without moving draw-pass orchestration.
- Chosen slice: facility display policy. This moves deterministic density buckets, stable sort key selection, airport/port compact labels, and adaptive facility label text into `js/core/renderer/transport_facility_display_policy.js`.
- Boundary: `transport_overview_render_owner.js` still owns projection, canvas drawing, atlas state, hover entries, metrics, and draw pass orchestration.
- Verification run:
  - `node --check js/core/renderer/transport_overview_render_owner.js js/core/renderer/transport_facility_display_policy.js`
  - `node --test tests/transport_facility_render_owner_behavior.test.mjs`
- Initial verification result: 14 Node facility behavior tests passed. The test still prints the existing atlas error-state diagnostic while exercising the error path.

## Phase 3 validation update

- Fixed test ownership drift exposed by the split:
  - `tests/test_global_transport_builder_contracts.py` now checks hidden-summary reason text in `appearance_transport_summary.js`.
  - The road bridge contract now checks the current active-pack-required gate in `transport_capability_registry.js` instead of splitting on stale source text.
  - `tests/test_toolbar_split_boundary_contract.py` now expects frozen city-points descriptor exports.
- Tightened descriptor/policy boundaries:
  - `appearance_city_points_descriptor.js` exports frozen option/style catalogs.
  - `transport_facility_display_policy.js` now uses coordinate stable keys only when real coordinates exist, and keeps feature id as the empty-coordinate fallback.
  - `transport_overview_visibility_policy.js` now owns the shared transport overview line/point include rules. Render owner and appearance summary both call this policy instead of duplicating filter logic.
- Main-thread verification run:
  - `node --check js/core/renderer/transport_overview_render_owner.js js/core/renderer/transport_facility_display_policy.js js/core/renderer/transport_overview_visibility_policy.js js/ui/toolbar/appearance_controls_controller.js js/ui/toolbar/appearance_transport_summary.js js/ui/toolbar/appearance_city_points_descriptor.js js/ui/toolbar/transport_workbench_controller.js js/ui/toolbar/transport_workbench_descriptor.js`
  - `node --test tests/transport_facility_render_owner_behavior.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs`
  - `python -m unittest tests.test_global_transport_builder_contracts tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_facility_interactions_contract -q`
  - `node --test tests/physical_layer_contracts.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs tests/transport_facility_render_owner_behavior.test.mjs`
  - `git diff --check`
- Verification result: syntax checks passed, 117 Python contract tests passed, 32 Node contract tests passed, and `git diff --check` reported only existing Windows line-ending warnings.
- Code-review lane returned APPROVE with a low-risk note that some boundary tests still use source-string assertions.
- Architecture lane returned WATCH for two boundary risks. Follow-up completed:
  - Renamed the facility policy to `transport_facility_display_policy.js` to match density + label responsibility.
  - Moved shared transport overview line/point visibility include rules into `transport_overview_visibility_policy.js`.
  - `appearance_transport_summary.js` now formats summary text over narrow inputs and delegates filtered counts to the shared visibility policy.
- Re-verification after WATCH fixes:
  - `node --check js/core/renderer/transport_overview_render_owner.js js/core/renderer/transport_facility_display_policy.js js/core/renderer/transport_overview_visibility_policy.js js/ui/toolbar/appearance_transport_summary.js`
  - `node --test tests/transport_facility_render_owner_behavior.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs`
  - `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_facility_interactions_contract tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract -q`
  - `python -m unittest tests.test_ui_rework_plan03_support_transport_contract.UiReworkPlan03SupportTransportContractTest.test_appearance_transport_summary_reports_class_source_and_phase -q`
  - `node --test tests/physical_layer_contracts.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs tests/transport_facility_render_owner_behavior.test.mjs`
- Re-verification result: syntax checks passed, affected Python contracts passed, targeted UI rework transport-summary test passed, and 32 Node contracts passed. Full `tests.test_ui_rework_plan03_support_transport_contract` still has the previously recorded unrelated sidebar copy assertions in `test_adaptive_popover_and_palette_contracts_are_wired`.
- Follow-up architecture review cleared the source boundary changes but kept WATCH because checked-in `dist/app` still reflected the old inline renderer logic.
- Main thread refreshed Pages dist with `npm run verify:pages-dist`.
- Pages dist result: `tools/build_pages_dist.py` completed, output size is 954.65 MiB, and `tests.test_pages_dist_startup_shell` ran 13 tests OK.
- Dist sync evidence: `dist/app/js/core/renderer/transport_facility_display_policy.js` and `dist/app/js/core/renderer/transport_overview_visibility_policy.js` now exist, and `dist/app/js/core/renderer/transport_overview_render_owner.js` imports both new policy modules.
- Note: `build_pages_dist.py` rebuilds the checked-in Pages app from the current source tree, so it refreshed a broad `dist/app` surface beyond the hand-edited files.
- Final post-WATCH architecture review result: CLEAR. The reviewer confirmed source and dist both use `transport_facility_display_policy.js`, `transport_overview_visibility_policy.js`, and shared summary/render visibility policy imports.

## Phase 4 candidate

- Target: continue shrinking `js/core/renderer/transport_overview_render_owner.js` without moving draw-pass orchestration.
- Chosen slice: road/rail line-label policy. This moves label text, label grid size, road label class priority, projected line geometry, projected line length, and label anchor selection into `js/core/renderer/transport_line_label_policy.js`.
- Boundary: `transport_overview_render_owner.js` still owns current projection state, canvas drawing, line style, label candidate placement, metrics, and draw pass orchestration.
- Test-engineer static review agreed this should extend `tests/transport_overview_line_strategy_scope_contract.node.test.mjs` rather than creating a new test system.
- Main-thread verification run:
  - `node --check js/core/renderer/transport_overview_render_owner.js js/core/renderer/transport_line_label_policy.js`
  - `node --test tests/transport_overview_line_strategy_scope_contract.node.test.mjs`
  - `python -m unittest tests.test_global_transport_builder_contracts.GlobalTransportBuilderContractsTest.test_road_renderer_consumes_roads_with_inline_ref_name_labels -q`
  - `npm run verify:pages-dist`
  - `node --check js/core/renderer/transport_overview_render_owner.js js/core/renderer/transport_line_label_policy.js dist/app/js/core/renderer/transport_overview_render_owner.js dist/app/js/core/renderer/transport_line_label_policy.js`
  - `node --test tests/physical_layer_contracts.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs tests/transport_facility_render_owner_behavior.test.mjs`
  - `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_facility_interactions_contract tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract -q`
  - `git diff --check`
- Verification result: source/dist syntax checks passed, Pages dist build passed with 13 startup shell tests OK, 33 Node contract tests passed, 117 Python contract tests passed, and `git diff --check` reported only existing Windows line-ending warnings.
- Dist sync evidence: `dist/app/js/core/renderer/transport_line_label_policy.js` now exists, and `dist/app/js/core/renderer/transport_overview_render_owner.js` imports it.
- Code-review initially requested changes because a local road `classPriority` map still remained in `transport_overview_render_owner.js`. The fix moved the remaining priority lookup to `getRoadLabelClassPriority()` from `transport_line_label_policy.js`, updated the Python boundary contract to prevent local priority maps from returning, refreshed dist, and reran focused checks.
- Phase 4 final code-review result: APPROVE. The reviewer confirmed source/dist owners both use `getRoadLabelClassPriority()` and no new issues remain.
- Final Phase 4 main-thread closeout rerun:
  - `node --check js/core/renderer/transport_overview_render_owner.js js/core/renderer/transport_line_label_policy.js dist/app/js/core/renderer/transport_overview_render_owner.js dist/app/js/core/renderer/transport_line_label_policy.js`
  - `node --test tests/physical_layer_contracts.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs tests/transport_facility_render_owner_behavior.test.mjs`
  - `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_facility_interactions_contract tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract -q`
  - `git diff --check`
- Final Phase 4 closeout result: syntax checks passed, 33 Node contract tests passed, 117 Python contract tests passed, and `git diff --check` reported only Windows line-ending warnings.

## Phase 5 candidate

- Target: continue shrinking `js/core/renderer/transport_overview_render_owner.js` without changing draw-pass orchestration.
- Chosen slice: visual-style policy. This moves primary color normalization, airport/port point style tokens, and road/rail line style tokens into `js/core/renderer/transport_overview_style_policy.js`.
- Boundary: `transport_overview_render_owner.js` still owns runtime family config lookup, canvas drawing, station overlay style composition, hover entries, metrics, and draw-pass orchestration.
- Static explore lane ranked this as the highest-value low-risk split because it is a pure helper block and currently sits ahead of line stroke drawing.
- Test-engineer lane recommended extending `tests/transport_overview_line_strategy_scope_contract.node.test.mjs` for line visual tokens and keeping facility render behavior tests for point/icon drawing.
- Implementation:
  - Added `js/core/renderer/transport_overview_style_policy.js` for airport/port/rail/road visual token calculation.
  - `transport_overview_render_owner.js` now imports style helpers and keeps draw-pass orchestration.
  - Added `ColorManager.getHexRelativeLuminance()` and `ColorManager.mixHexColors()` so style policy does not own duplicate color primitives.
  - Kept `state_defaults.js` primary-color normalization local because existing data-URL test harnesses load that module with patched imports; adding a new relative import broke `tests/palette_runtime_bridge.node.test.mjs`.
- Tests updated:
  - `tests/transport_overview_line_strategy_scope_contract.node.test.mjs` now covers style policy visual tokens.
  - `tests/test_global_transport_builder_contracts.py` now checks render owner consumes style policy and that style policy avoids canvas/runtime dependencies.
  - `tests/palette_runtime_bridge.node.test.mjs` now covers the centralized `ColorManager` hex color primitives.
- Main-thread verification run so far:
  - `node --check js/core/color_manager.js js/core/state_defaults.js js/core/renderer/transport_overview_style_policy.js js/core/renderer/transport_overview_render_owner.js tests/palette_runtime_bridge.node.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs`
  - `npm run test:node:palette-runtime-bridge`
  - `npm run test:node:transport-overview-line-contract`
  - `npm run test:node:transport-facility-render-owner`
  - `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_facility_interactions_contract tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract -q`
  - `npm run verify:pages-dist`
  - `node --check js/core/color_manager.js js/core/renderer/transport_overview_style_policy.js js/core/renderer/transport_overview_render_owner.js dist/app/js/core/color_manager.js dist/app/js/core/renderer/transport_overview_style_policy.js dist/app/js/core/renderer/transport_overview_render_owner.js`
  - `git diff --check`
- Verification result so far: syntax checks passed, 17 palette Node tests passed, 18 transport line Node tests passed, 14 facility render Node tests passed, 118 Python contract tests passed, Pages dist build passed with 13 startup shell tests OK, and `git diff --check` reported only Windows line-ending warnings.
- Follow-up architecture review result: WATCH without current Phase blocker. The remaining concern is long-term drift between `state_defaults.js` local primary-color fallback handling and `ColorManager.normalizeHexColor`; this stays out of Phase 5 because directly importing `ColorManager` into `state_defaults.js` breaks the data-URL test harness. The next clean slice is an import-safe pure hex helper shared by both owners.
- Follow-up code-review result: APPROVE after adding intent-to-add for the new source/dist/doc files. Ordinary `git diff` now includes the new policy files while `git diff --cached --name-only` remains empty.
- Final combined Node verification:
  - `node --test tests/palette_runtime_bridge.node.test.mjs tests/physical_layer_contracts.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs tests/transport_facility_render_owner_behavior.test.mjs`
- Final combined Node result: 51 tests passed.

## Phase 6 candidate

- Target: resolve the Phase 5 architecture WATCH without broadening renderer scope.
- Chosen slice: import-safe hex color utility. This adds `js/core/color_hex_utils.js` with no imports, then has `ColorManager` and `state_defaults.js` share the same hex normalization/mix/luminance primitives.
- Boundary: color utility owns pure hex parsing and math only. `ColorManager` keeps palette/runtime cache APIs; `state_defaults.js` keeps transport style default normalization; renderer style policy still consumes `ColorManager`.
- Implementation:
  - Added `js/core/color_hex_utils.js`.
  - `ColorManager.normalizeHexColor()`, `hexToRgb()`, `rgbToHex()`, `srgbToLinear()`, `getHexRelativeLuminance()`, and `mixHexColors()` now delegate to the helper.
  - `state_defaults.js` imports `normalizeHexColorWithFallback()` and uses it in `normalizeTransportOverviewPrimaryColor()`.
  - `normalizeTextureHexColor()` now also delegates to `normalizeHexColorWithFallback()`, closing the remaining local hex parser from the initial Phase 6 static architecture review.
  - `tests/palette_runtime_bridge.node.test.mjs` now patches `./color_hex_utils.js` into its data-URL harness.
  - `tests/test_transport_facility_interactions_contract.py` now checks that transport primary-color and texture-color normalization use the shared helper.
- Main-thread verification run:
  - `node --check js/core/color_hex_utils.js js/core/color_manager.js js/core/state_defaults.js tests/palette_runtime_bridge.node.test.mjs`
  - `npm run test:node:palette-runtime-bridge`
  - `python -m unittest tests.test_transport_facility_interactions_contract.TransportFacilityInteractionsContractTest.test_state_and_i18n_cover_transport_primary_color_and_more_fields -q`
  - `node --test tests/palette_runtime_bridge.node.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs tests/transport_facility_render_owner_behavior.test.mjs`
  - `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_facility_interactions_contract tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract -q`
  - `npm run verify:pages-dist`
  - `node --check js/core/color_hex_utils.js js/core/color_manager.js js/core/state_defaults.js js/core/renderer/transport_overview_style_policy.js dist/app/js/core/color_hex_utils.js dist/app/js/core/color_manager.js dist/app/js/core/state_defaults.js dist/app/js/core/renderer/transport_overview_style_policy.js`
  - `node --check js/core/color_hex_utils.js js/core/color_manager.js js/core/state_defaults.js dist/app/js/core/color_hex_utils.js dist/app/js/core/color_manager.js dist/app/js/core/state_defaults.js`
  - `git diff --check`
- Verification result so far: syntax checks passed, 17 palette Node tests passed, 49 combined Node tests passed, 118 Python contract tests passed, Pages dist build passed with 13 startup shell tests OK, source/dist color utility imports are visible in grep, and `git diff --check` reported only Windows line-ending warnings.
- Phase 6 review status:
  - Initial architecture review result: WATCH without blocker. It confirmed the Phase 5 color drift risk was resolved, then found `normalizeTextureHexColor()` still had a local hex parser.
  - Follow-up fix: `normalizeTextureHexColor()` now delegates to the same import-safe helper with texture default `#475569`.
  - Final read-only code-review result: APPROVE. The reviewer confirmed `color_hex_utils.js` is import-safe, `ColorManager` delegates shared primitives, both `state_defaults.js` color normalizers use the shared helper, the data-URL harness patches the new import, and source/dist files are synchronized.

## Phase 7 candidate

- Target: continue shrinking `js/core/renderer/transport_overview_render_owner.js` without touching canvas drawing, hover composition, or label placement.
- Chosen slice: zoom/threshold visibility helpers. This moves the actively used label zoom threshold helper into `js/core/renderer/transport_overview_visibility_policy.js` and deletes stale, now-unused threshold helpers that only remained in the render owner.
- Boundary: visibility policy owns pure visibility thresholds and line inclusion filtering. `transport_overview_render_owner.js` still owns runtime state lookup, canvas drawing, overlay collection routing, hover entries, and metrics.
- Static explore lane recommended this as the lowest-risk remaining `transport_overview_render_owner.js` split because these helpers are pure and do not use canvas, projection, hover state, or runtime mutation.
- Tests updated:
  - `tests/transport_overview_line_strategy_scope_contract.node.test.mjs` now imports `getTransportOverviewLabelZoomConfig()` and line inclusion helpers from `transport_overview_visibility_policy.js`, calls `shouldIncludeTransportOverviewLineFeature()` directly, and covers invalid class, missing `reveal_rank`, boundary rank, and label zoom values.
  - `tests/test_global_transport_builder_contracts.py` now checks that label zoom lives in visibility policy, the stale threshold helpers are absent, and `getTransportOverviewImportanceThresholdRank()` remains canonical in `transport_capability_registry.js`.
- Main-thread verification run:
  - `node --check js/core/renderer/transport_overview_visibility_policy.js js/core/renderer/transport_overview_render_owner.js tests/transport_overview_line_strategy_scope_contract.node.test.mjs`
  - `node --test tests/transport_overview_line_strategy_scope_contract.node.test.mjs`
  - `python -m unittest tests.test_global_transport_builder_contracts.GlobalTransportBuilderContractsTest.test_rail_renderer_threshold_order_keeps_all_as_broadest_setting -q`
  - `node --test tests/palette_runtime_bridge.node.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs tests/transport_facility_render_owner_behavior.test.mjs`
  - `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_facility_interactions_contract tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract -q`
  - `npm run verify:pages-dist`
  - `node --check js/core/renderer/transport_overview_visibility_policy.js js/core/renderer/transport_overview_render_owner.js dist/app/js/core/renderer/transport_overview_visibility_policy.js dist/app/js/core/renderer/transport_overview_render_owner.js tests/transport_overview_line_strategy_scope_contract.node.test.mjs`
  - `git diff --check`
- Verification result so far: syntax checks passed, 19 transport overview Node tests passed, 50 combined Node tests passed, 118 Python contract tests passed, Pages dist build passed with 13 startup shell tests OK, source/dist owner and visibility policy files match, and `git diff --check` reported only Windows line-ending warnings.
- First failed check: the new Node threshold test initially used exact deep equality for `2.9`, while the existing arithmetic returns `2.9000000000000004`. The implementation was unchanged; the test now uses existing `assertClose()` for these floating-point thresholds.
- Phase 7 review status:
  - Initial read-only code-review result: WATCH. It found an over-broad render-owner import, a Node test that duplicated line filtering instead of calling visibility policy, and a duplicate `getTransportOverviewImportanceThresholdRank()` semantic split.
  - Follow-up fix: render-owner imports now include only used helpers, Node line threshold checks call `shouldIncludeTransportOverviewLineFeature()`, stale threshold helpers were deleted, and `getTransportOverviewImportanceThresholdRank()` stays canonical in `transport_capability_registry.js`.
  - Final read-only code-review result: APPROVE. The reviewer confirmed render owner imports are narrow, visibility policy stays pure, line inclusion is centralized, tests call the policy entrypoint, and source/dist files are synchronized.

## Phase 8 candidate

- Target: continue shrinking `js/core/renderer/transport_overview_render_owner.js` without moving canvas text drawing or hover composition.
- Chosen slice: facility label layout rules. This moves label candidate filtering/sorting, label bbox overlap, and label placement candidate generation into `js/core/renderer/transport_facility_display_policy.js`.
- Boundary: display policy owns pure facility display decisions. `transport_overview_render_owner.js` still owns canvas font setup, `strokeText()` / `fillText()`, occupied box state, metrics, hover entries, and icon sizing.
- Implementation:
  - Added `getTransportFacilityLabelCandidates()`, `doTransportFacilityLabelBoxesOverlap()`, and `findTransportFacilityLabelPlacement()` to `transport_facility_display_policy.js`.
  - `drawTransportFacilityLabels()` now delegates pure candidate and placement decisions to display policy while retaining actual drawing in render owner.
  - Existing render-owner label count behavior and bbox collision behavior are still covered by the facility render owner tests.
- Tests updated:
  - `tests/transport_facility_render_owner_behavior.test.mjs` now covers candidate ordering, zoom/label-size filtering, placement world coordinate conversion, and bbox overlap edge behavior.
  - `tests/test_transport_facility_interactions_contract.py` now checks that render owner consumes the facility display policy for label layout and does not redefine the old local placement helpers.
- Main-thread verification run:
  - `node --check js/core/renderer/transport_facility_display_policy.js js/core/renderer/transport_overview_render_owner.js tests/transport_facility_render_owner_behavior.test.mjs`
  - `node --test tests/transport_facility_render_owner_behavior.test.mjs`
  - `python -m unittest tests.test_transport_facility_interactions_contract.TransportFacilityInteractionsContractTest.test_transport_overview_owner_delegates_facility_display_policy -q`
  - `node --test tests/palette_runtime_bridge.node.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs tests/transport_facility_render_owner_behavior.test.mjs`
  - `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_facility_interactions_contract tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract -q`
  - `npm run verify:pages-dist`
  - `node --check js/core/renderer/transport_facility_display_policy.js js/core/renderer/transport_overview_render_owner.js dist/app/js/core/renderer/transport_facility_display_policy.js dist/app/js/core/renderer/transport_overview_render_owner.js tests/transport_facility_render_owner_behavior.test.mjs`
  - `git diff --check`
- Verification result so far: syntax checks passed, 14 facility render Node tests passed, 50 combined Node tests passed, 119 Python contract tests passed, Pages dist build passed with 13 startup shell tests OK, source/dist facility display policy and render owner files match, and `git diff --check` reported only Windows line-ending warnings.
- Final read-only code-review result: APPROVE. The reviewer confirmed display policy remains pure, render owner only consumes the new helpers, world coordinate conversion and bbox overlap semantics are preserved, tests cover the boundary, and source/dist files are synchronized.

## Phase 9 candidate

- Target: continue shrinking `js/core/renderer/transport_overview_render_owner.js` while keeping actual canvas path/stroke lifecycle in the owner.
- Chosen slice: road/rail line stroke spec calculations. This moves screen-pixel-to-canvas width conversion, dash conversion, and casing/inner stroke spec assembly into `js/core/renderer/transport_line_label_policy.js`.
- Boundary: line policy owns pure line label/geometry/stroke calculations. `transport_overview_render_owner.js` still owns `context.save()`, `context.setLineDash()`, `pathCanvas(feature)`, `context.stroke()`, dash reset, metrics, and draw-pass orchestration.
- Implementation:
  - Added `resolveTransportOverviewLineCoordinateWidth()`, `resolveTransportOverviewLineDash()`, and `buildTransportOverviewLineStrokeSpecs()` to `transport_line_label_policy.js`.
  - `drawTransportOverviewLineSet()` now asks line policy for casing/inner stroke specs, then performs the existing canvas drawing loop locally.
- Tests updated:
  - `tests/transport_overview_line_strategy_scope_contract.node.test.mjs` now covers width floor conversion, dash filtering/scaling, and casing/inner stroke spec output.
  - `tests/test_global_transport_builder_contracts.py` now checks that render owner consumes `buildTransportOverviewLineStrokeSpecs()` and no longer defines local line width/dash helpers.
- Main-thread verification run:
  - `node --check js/core/renderer/transport_line_label_policy.js js/core/renderer/transport_overview_render_owner.js tests/transport_overview_line_strategy_scope_contract.node.test.mjs`
  - `node --test tests/transport_overview_line_strategy_scope_contract.node.test.mjs`
  - `python -m unittest tests.test_global_transport_builder_contracts.GlobalTransportBuilderContractsTest.test_road_renderer_consumes_roads_with_inline_ref_name_labels -q`
  - `node --test tests/palette_runtime_bridge.node.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs tests/transport_facility_render_owner_behavior.test.mjs`
  - `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_facility_interactions_contract tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract -q`
  - `npm run verify:pages-dist`
  - `node --check js/core/renderer/transport_line_label_policy.js js/core/renderer/transport_overview_render_owner.js dist/app/js/core/renderer/transport_line_label_policy.js dist/app/js/core/renderer/transport_overview_render_owner.js tests/transport_overview_line_strategy_scope_contract.node.test.mjs`
  - `git diff --check`
- Verification result so far: syntax checks passed, 20 transport overview Node tests passed, 51 combined Node tests passed, 119 Python contract tests passed, Pages dist build passed with 13 startup shell tests OK, source/dist line policy and render owner files match, and `git diff --check` reported only Windows line-ending warnings.
- Phase 9 review status:
  - Initial read-only code-review result: WATCH only because the reviewer did not run tests/build. It found no code issues and confirmed policy purity, owner canvas lifecycle, old stroke spec semantics, and source/dist sync.
  - Follow-up read-only result after main-thread verification evidence: APPROVE. The reviewer accepted the main-thread syntax, Node, Python, Pages dist, source/dist, and diff-check results as closing the WATCH gap.

## Phase 10 candidate

- Target: trim `js/core/map_renderer.js` without moving transport rendering behavior or draw-order ownership.
- Chosen slice: remove thin local transport overview facade wrappers. These wrappers only proxied `getTransportOverviewRenderOwner().drawRoadsLayer()`, `drawRailwaysLayer()`, `drawAirportsLayer()`, and `drawPortsLayer()`.
- Boundary: `map_renderer.js` still owns the marker pass order and interactive flag propagation. `transport_overview_render_owner.js` remains the transport drawing owner.
- Implementation:
  - Removed local `getTransportOverviewStyleConfig()`, `drawAirportsLayer()`, `drawPortsLayer()`, `drawRailwaysLayer()`, and `drawRoadsLayer()` wrappers from `js/core/map_renderer.js`.
  - `drawContextMarkersPass()` now obtains `const transportOverviewOwner = getTransportOverviewRenderOwner();` once and calls the owner methods directly in the existing roads, railways, airports, ports order.
  - `tests/test_global_transport_builder_contracts.py` now checks the direct owner calls and guards against reintroducing the removed local wrappers.
- Main-thread verification run:
  - `node --check js/core/map_renderer.js`
  - `python -m unittest tests.test_global_transport_builder_contracts.GlobalTransportBuilderContractsTest.test_road_renderer_consumes_roads_with_inline_ref_name_labels -q`
  - `node --test tests/transport_overview_line_strategy_scope_contract.node.test.mjs tests/transport_facility_render_owner_behavior.test.mjs`
  - `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_facility_interactions_contract tests.test_map_renderer_asset_url_and_facility_surface_contract -q`
  - `npm run verify:pages-dist`
  - `python -m py_compile tests/test_global_transport_builder_contracts.py`
  - `git diff --no-index -- js/core/map_renderer.js dist/app/js/core/map_renderer.js`
  - `git diff --check`
- Verification result so far: syntax checks passed, targeted Python contract passed, 34 transport overview/facility Node tests passed, 71 Python contracts passed, Pages dist build passed with 13 startup shell tests OK, source/dist `map_renderer.js` match, and `git diff --check` reported only Windows line-ending warnings.
- Initial Phase 10 read-only code-review result: WATCH. The code path was clear, but the Python boundary test only blocked the road wrapper and style wrapper from returning.
- Follow-up fix: the same boundary test now blocks reintroducing the airport, port, rail, and road local transport facade wrappers in `map_renderer.js`.
- Follow-up verification:
  - `python -m py_compile tests/test_global_transport_builder_contracts.py`
  - `python -m unittest tests.test_global_transport_builder_contracts.GlobalTransportBuilderContractsTest.test_road_renderer_consumes_roads_with_inline_ref_name_labels -q`
  - `rg` confirmed source/dist `map_renderer.js` only contain direct `transportOverviewOwner.draw*` calls for this marker pass.
- Follow-up verification result: Python syntax check passed and the targeted boundary contract passed.
- Final Phase 10 read-only code-review result: APPROVE. The reviewer confirmed the wrapper-return guard now covers airport, port, rail, road, and style facade helpers; source/dist direct owner call order remains roads, railways, airports, ports.

## Phase 11 candidate

- Target: continue trimming `js/core/map_renderer.js` through stale facade/proxy removal.
- Chosen slice: border draw helper facade wrappers. `drawMeshCollection()`, `declutterProjectedPolyline()`, `getProjectedPolylineMetrics()`, `buildRenderableBoundaryMesh()`, and `getBoundaryMeshTransform()` were unused local proxy constants; `getViewportAwareCoastlineCollection()` had one caller.
- Boundary: `border_draw_owner.js` remains the owner of border drawing, mesh decluttering, viewport-aware coastline LOD, and mesh transforms. `map_renderer.js` keeps render-pass orchestration and calls the owner directly where needed.
- Implementation:
  - Removed the six local border draw proxy constants from `js/core/map_renderer.js`.
  - `drawScenarioCoastalAccentLayer()` now directly calls `getBorderDrawOwner().getViewportAwareCoastlineCollection(getCoastlineCollectionForZoom(k), k)`.
  - Updated `tests/test_map_renderer_border_draw_owner_boundary_contract.py` so it guards against reintroducing those local proxy constants and still confirms the owner owns the helper functions.
  - While running broader border contracts, found a real contract drift: `map_renderer.js` calls `getBorderMeshOwner().getFrontlineOwnershipContext()`, but `border_mesh_owner.js` no longer exported it after frontline mesh generation was retired.
  - Added `getFrontlineOwnershipContext()` back to `border_mesh_owner.js`, delegating to `getDynamicBorderOwnershipContext(state)`, while keeping `getFrontlineMesh()` disabled and cache-clearing as the current behavior test requires.
  - Updated `tests/test_map_renderer_border_mesh_owner_boundary_contract.py` and `tests/border_mesh_owner_behavior.test.mjs` to encode the current contract: frontline context exists, frontline mesh remains retired.
- Main-thread verification run:
  - `node --check js/core/map_renderer.js`
  - `python -m py_compile tests/test_map_renderer_border_draw_owner_boundary_contract.py`
  - `python -m unittest tests.test_map_renderer_border_draw_owner_boundary_contract -q`
  - `node --test tests/physical_layer_contracts.test.mjs tests/border_mesh_owner_behavior.test.mjs`
  - `python -m unittest tests.test_map_renderer_border_draw_owner_boundary_contract tests.test_map_renderer_border_mesh_owner_boundary_contract tests.test_map_renderer_interaction_border_snapshot_orchestration_contract -q`
  - `node --check js/core/map_renderer.js js/core/renderer/border_mesh_owner.js tests/border_mesh_owner_behavior.test.mjs`
  - `python -m py_compile tests/test_map_renderer_border_draw_owner_boundary_contract.py tests/test_map_renderer_border_mesh_owner_boundary_contract.py`
  - `npm run verify:pages-dist`
  - `git diff --no-index -- js/core/map_renderer.js dist/app/js/core/map_renderer.js`
  - `git diff --no-index -- js/core/renderer/border_mesh_owner.js dist/app/js/core/renderer/border_mesh_owner.js`
  - `git diff --check`
- Verification result so far: syntax checks passed, 7 Python border contracts passed, 6 Node physical/border mesh tests passed, Pages dist build passed with 13 startup shell tests OK, source/dist `map_renderer.js` and `border_mesh_owner.js` match, and `git diff --check` reported only Windows line-ending warnings.
- Final Phase 11 read-only code-review result: APPROVE. The reviewer confirmed the direct coastline LOD owner call keeps the same owner lifecycle and getter semantics, the restored frontline ownership context does not re-enable frontline mesh generation, and the tests cover wrapper-return and retired-mesh boundaries.

## Phase 12 candidate

- Target: reduce `js/ui/toolbar/appearance_controls_controller.js` by moving DOM-independent display formatting into existing narrow modules.
- Chosen slice:
  - `formatCityPointsDensityValue()` moved to `js/ui/toolbar/appearance_city_points_descriptor.js`.
  - `formatTransportPercent()`, `formatTransportScopeLabel()`, and `formatTransportThresholdLabel()` moved to `js/ui/toolbar/appearance_transport_summary.js`.
- Boundary: `appearance_controls_controller.js` still owns DOM reads/writes, runtime state normalization, event binding, dirty/render hooks, and history integration. Descriptor/summary modules only receive values and return strings.
- Implementation:
  - Added the four pure display formatter exports to the existing descriptor/summary modules.
  - Updated `appearance_controls_controller.js` imports and removed local formatter definitions.
  - Extended existing toolbar, transport summary, and Node contract tests to assert the new formatter owners and behavior.
- Main-thread verification run:
  - `node --check js/ui/toolbar/appearance_controls_controller.js js/ui/toolbar/appearance_city_points_descriptor.js js/ui/toolbar/appearance_transport_summary.js tests/transport_overview_line_strategy_scope_contract.node.test.mjs`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py tests/test_transport_facility_interactions_contract.py tests/test_ui_rework_plan03_support_transport_contract.py`
  - `node --test tests/transport_overview_line_strategy_scope_contract.node.test.mjs`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_facility_interactions_contract.TransportFacilityInteractionsContractTest.test_toolbar_summary_uses_filtered_transport_counts tests.test_ui_rework_plan03_support_transport_contract.UiReworkPlan03SupportTransportContractTest.test_appearance_transport_summary_reports_class_source_and_phase -q`
  - `npm run verify:pages-dist`
  - `git diff --no-index -- js/ui/toolbar/appearance_controls_controller.js dist/app/js/ui/toolbar/appearance_controls_controller.js`
  - `git diff --no-index -- js/ui/toolbar/appearance_city_points_descriptor.js dist/app/js/ui/toolbar/appearance_city_points_descriptor.js`
  - `git diff --no-index -- js/ui/toolbar/appearance_transport_summary.js dist/app/js/ui/toolbar/appearance_transport_summary.js`
  - `git diff --check`
- Verification result so far: syntax checks passed, 21 Node transport/appearance tests passed, 41 Python toolbar/transport contracts passed, Pages dist build passed with 13 startup shell tests OK, source/dist files match, and `git diff --check` reported only Windows line-ending warnings.
- Final Phase 12 read-only code-review result: APPROVE. The reviewer confirmed behavior equivalence, correct descriptor/summary ownership, no runtimeState/DOM/global dependencies in the moved formatter modules, and sufficient formatter plus boundary coverage.

## Phase 13 candidate

- Target: continue trimming `js/core/map_renderer.js` through one-line proxy removal.
- Chosen slice: remove the local `renderSpecialZones` proxy. It only forwarded to `getStrategicOverlayHelpersOwner().renderSpecialZones()` and had one caller in `renderSpecialZonesIfNeeded()`.
- Boundary: `map_renderer.js` still owns dirty/signature gating in `renderSpecialZonesIfNeeded()`. `strategic_overlay_helpers.js` remains the owner of the actual special-zone rendering.
- Implementation:
  - `renderSpecialZonesIfNeeded()` now calls `getStrategicOverlayHelpersOwner().renderSpecialZones()` directly.
  - Removed the local `const renderSpecialZones = (...args) => ...` proxy from `map_renderer.js`.
  - Updated `tests/test_map_renderer_strategic_overlay_helpers_boundary_contract.py` to guard against reintroducing that proxy and confirm direct owner call remains wired.
- Main-thread verification run:
  - `node --check js/core/map_renderer.js`
  - `python -m py_compile tests/test_map_renderer_strategic_overlay_helpers_boundary_contract.py`
  - `python -m unittest tests.test_map_renderer_strategic_overlay_helpers_boundary_contract tests.test_map_renderer_strategic_overlay_runtime_owner_boundary_contract -q`
  - `npm run verify:pages-dist`
  - `git diff --no-index -- js/core/map_renderer.js dist/app/js/core/map_renderer.js`
  - `rg -n "const renderSpecialZones = \\(\\.\\.\\.args\\)|getStrategicOverlayHelpersOwner\\(\\)\\.renderSpecialZones\\(\\);|renderSpecialZones\\(\\);" js/core/map_renderer.js dist/app/js/core/map_renderer.js tests/test_map_renderer_strategic_overlay_helpers_boundary_contract.py`
  - `git diff --check`
- Verification result so far: syntax check passed, 4 strategic overlay Python contracts passed, Pages dist build passed with 13 startup shell tests OK, source/dist `map_renderer.js` match, and `git diff --check` reported only Windows line-ending warnings.
- Initial Phase 13 read-only code-review result: WATCH. The runtime path was equivalent, but the boundary test only blocked one exact `const renderSpecialZones = (...args) => ...` string.
- Follow-up fix: the strategic overlay helper boundary test now uses regex guards against local `const`/`let`/`var` and `function` proxy reintroductions for `renderSpecialZones`, and verifies `renderSpecialZonesIfNeeded()` directly calls the owner before updating `lastSpecialZonesOverlaySignature`.
- Follow-up verification:
  - `python -m py_compile tests/test_map_renderer_strategic_overlay_helpers_boundary_contract.py`
  - `python -m unittest tests.test_map_renderer_strategic_overlay_helpers_boundary_contract tests.test_map_renderer_strategic_overlay_runtime_owner_boundary_contract -q`
  - `git diff --check`
- Follow-up verification result: Python syntax passed, 4 strategic overlay contracts passed, and `git diff --check` reported only Windows line-ending warnings.

## Phase 14 candidate

- Target: continue the same `js/core/map_renderer.js` strategic overlay proxy cleanup.
- Chosen slice: remove local `renderOperationalLinesOverlay` and `renderOperationGraphicsOverlay` proxy constants. Each only forwarded to `getStrategicOverlayHelpersOwner()` and had one caller.
- Boundary: `map_renderer.js` still owns dirty/signature gating in `renderOperationalLinesIfNeeded()` and `renderOperationGraphicsIfNeeded()`. `strategic_overlay_helpers.js` owns actual rendering. `renderUnitCountersOverlay()` remains local because it also calls `bindUnitCounterOverlayInteractions()`.
- Implementation:
  - `renderOperationGraphicsIfNeeded()` now calls `getStrategicOverlayHelpersOwner().renderOperationGraphicsOverlay()` directly.
  - `renderOperationalLinesIfNeeded()` now calls `getStrategicOverlayHelpersOwner().renderOperationalLinesOverlay()` directly.
  - Removed the two local proxy constants from `map_renderer.js`.
  - Updated `tests/test_map_renderer_strategic_overlay_helpers_boundary_contract.py` to guard against proxy reintroduction and assert direct owner calls inside the IfNeeded functions.
- Main-thread verification run:
  - `node --check js/core/map_renderer.js`
  - `python -m py_compile tests/test_map_renderer_strategic_overlay_helpers_boundary_contract.py`
  - `python -m unittest tests.test_map_renderer_strategic_overlay_helpers_boundary_contract tests.test_map_renderer_strategic_overlay_runtime_owner_boundary_contract -q`
  - `npm run verify:pages-dist`
  - `git diff --no-index -- js/core/map_renderer.js dist/app/js/core/map_renderer.js`
  - `rg -n "const renderOperationalLinesOverlay = \\(\\.\\.\\.args\\)|const renderOperationGraphicsOverlay = \\(\\.\\.\\.args\\)|getStrategicOverlayHelpersOwner\\(\\)\\.render(OperationGraphics|OperationalLines)Overlay\\(\\);" js/core/map_renderer.js dist/app/js/core/map_renderer.js tests/test_map_renderer_strategic_overlay_helpers_boundary_contract.py`
  - `git diff --check`
- Verification result so far: syntax check passed, 4 strategic overlay Python contracts passed, Pages dist build passed with 13 startup shell tests OK, source/dist `map_renderer.js` match, and `git diff --check` reported only Windows line-ending warnings.
- Final Phase 13/14 read-only code-review result: APPROVE. The reviewer confirmed all three direct owner calls preserve dirty/signature gates and owner lazy lifecycle, the old wrappers were zero-argument pass-throughs, `renderUnitCountersOverlay()` appropriately remains local because it binds interactions, and the regex boundary tests now guard against proxy reintroduction.

## Phase 15 candidate

- Target: finish the same strategic overlay proxy cleanup without touching the unit-counter rendering path.
- Chosen slice: remove local `syncUnitCounterScalesDuringZoom` proxy. It only forwarded to `getStrategicOverlayHelpersOwner().syncUnitCounterScalesDuringZoom()` and had one caller in `updateMap()`.
- Boundary: `map_renderer.js` still owns zoom update sequencing in `updateMap()`. `strategic_overlay_helpers.js` owns the unit-counter scale synchronization itself. `renderUnitCountersOverlay()` remains local because it still binds interactions after owner rendering.
- Implementation:
  - `updateMap()` now calls `getStrategicOverlayHelpersOwner().syncUnitCounterScalesDuringZoom()` directly.
  - Removed the local `const syncUnitCounterScalesDuringZoom = (...args) => ...` proxy from `map_renderer.js`.
  - Updated `tests/test_map_renderer_strategic_overlay_helpers_boundary_contract.py` to guard against reintroducing that proxy and confirm the direct owner call remains before special-zone pattern sync.
- Main-thread verification run:
  - `node --check js/core/map_renderer.js`
  - `python -m py_compile tests/test_map_renderer_strategic_overlay_helpers_boundary_contract.py`
  - `python -m unittest tests.test_map_renderer_strategic_overlay_helpers_boundary_contract tests.test_map_renderer_strategic_overlay_runtime_owner_boundary_contract -q`
  - `npm run verify:pages-dist`
  - `git diff --no-index -- js/core/map_renderer.js dist/app/js/core/map_renderer.js`
  - `git diff --check`
- Verification result so far: syntax check passed, 4 strategic overlay Python contracts passed, Pages dist build passed with 13 startup shell tests OK, source/dist `map_renderer.js` match, and `git diff --check` reported only Windows line-ending warnings.
- Final Phase 15 read-only code-review result: APPROVE. The reviewer confirmed direct owner calling is equivalent, owner lazy lifecycle is unchanged, no `this` binding issue exists, `renderUnitCountersOverlay()` correctly remains local for interaction binding, and the boundary test now blocks proxy reintroduction while checking the full zoom-update order through `drawCanvas()`.

## Phase 16 candidate

- Target: continue removing one-line `map_renderer.js` owner proxies where the owner boundary is already covered by a focused contract test.
- Chosen slice: remove local `drawCityLabelsFromEntries` proxy. It only forwarded to `getCityLabelOwner().drawCityLabelsFromEntries()` and had one caller in `drawLabelsPass()`.
- Boundary: `map_renderer.js` still owns label-pass gating, marker drawing, and performance metrics. `city_label_owner.js` owns city label drawing.
- Implementation:
  - `drawLabelsPass()` now calls `getCityLabelOwner().drawCityLabelsFromEntries()` directly.
  - Removed the local `const drawCityLabelsFromEntries = (...args) => ...` proxy from `map_renderer.js`.
  - Updated `tests/test_map_renderer_city_label_owner_boundary_contract.py` to guard against local proxy reintroduction and assert the direct owner call.
- Main-thread verification run:
  - `node --check js/core/map_renderer.js`
  - `python -m py_compile tests/test_map_renderer_city_label_owner_boundary_contract.py`
  - `python -m unittest tests.test_map_renderer_city_label_owner_boundary_contract -q`
  - `npm run verify:pages-dist`
  - `git diff --no-index -- js/core/map_renderer.js dist/app/js/core/map_renderer.js`
  - `git diff --check`
- Verification result so far: syntax check passed, 1 city-label boundary contract passed, Pages dist build passed with 13 startup shell tests OK, source/dist `map_renderer.js` match, and `git diff --check` reported only Windows line-ending warnings.
- Phase 16 read-only code-review result: WATCH only for context ordering. The reviewer confirmed code equivalence, argument and return-value preservation, unchanged owner lazy lifecycle, no `this` binding issue, and sufficient proxy-regression coverage. The context ordering issue was fixed by moving Phase 13/14 closeout back under the correct phase before this Phase 16 closeout.
- Final Phase 16 closeout: WATCH resolved after context cleanup.

## Phase 17 candidate

- Target: continue removing local `map_renderer.js` owner pass-throughs where the rendering owner already owns the detailed logic.
- Chosen slice: remove local render pipeline pass proxies for `getIdleRenderPassDefinitions`, `prepareIdleRenderPassDefinition`, and `ensureIdleRenderPasses`.
- Boundary: `map_renderer.js` still owns exact-after-settle scheduling, deferred refresh scheduling, and draw-pass orchestration. `render_pipeline_passes.js` owns idle pass definitions, pass preparation, and idle pass execution.
- Implementation:
  - Removed the three local proxy constants from `map_renderer.js`.
  - Updated each call site to call `getRenderPipelinePassesOwner().getIdleRenderPassDefinitions()`, `getRenderPipelinePassesOwner().prepareIdleRenderPassDefinition(...)`, or `getRenderPipelinePassesOwner().ensureIdleRenderPasses(...)` directly.
  - Updated focused boundary and chunk contract tests to assert direct owner calls and block proxy reintroduction.
- Main-thread verification run:
  - `node --check js/core/map_renderer.js tests/scenario_chunk_contracts.test.mjs`
  - `python -m py_compile tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`
  - `python -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q`
  - `node --test tests/scenario_chunk_contracts.test.mjs`
  - `npm run verify:pages-dist`
  - `git diff --no-index -- js/core/map_renderer.js dist/app/js/core/map_renderer.js`
  - `git diff --check`
- Verification result so far: syntax checks passed, 1 render-pipeline boundary contract passed, 29 scenario chunk Node contracts passed with the existing module-type warning, Pages dist build passed with 13 startup shell tests OK, source/dist `map_renderer.js` match, and `git diff --check` reported only Windows line-ending warnings.
- Phase 17 read-only code-review result: WATCH only for proxy-regression test strength. The reviewer confirmed implementation equivalence, unchanged parameter/return paths, unchanged owner lifecycle and call ordering, and correct scenario chunk contract boundary wording.
- Follow-up fix: strengthened `tests/test_map_renderer_render_pipeline_passes_boundary_contract.py` with function-declaration proxy regex guards and direct owner-call counts for the 5 definition calls, 2 preparation calls, and 2 ensure calls.
- Follow-up verification:
  - `python -m py_compile tests/test_map_renderer_render_pipeline_passes_boundary_contract.py`
  - `python -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q`
  - `node --test tests/scenario_chunk_contracts.test.mjs`
- Follow-up verification result: Python syntax passed, 1 render-pipeline boundary contract passed, and 29 scenario chunk Node contracts passed with the existing module-type warning.
- Final Phase 17 closeout: WATCH resolved after test-guard strengthening.

## Phase 18 candidate

- Target: continue removing local `map_renderer.js` pass-throughs around secondary spatial index rebuilds.
- Chosen slice: remove local `resetSecondarySpatialIndexState` and `buildSecondarySpatialIndexes` proxies. They only forwarded to `getSpatialIndexRuntimeOwner()` and had three paired call sites.
- Boundary: `map_renderer.js` still owns when secondary indexes rebuild after deferred interaction recovery, scenario secondary layer sync, and scenario apply. `spatial_index_runtime_owner.js` owns the reset/build implementation.
- Implementation:
  - Removed the two local proxy constants from `map_renderer.js`.
  - Updated the three call sites to call `getSpatialIndexRuntimeOwner().resetSecondarySpatialIndexState()` and `getSpatialIndexRuntimeOwner().buildSecondarySpatialIndexes(...)` directly.
  - Updated spatial owner boundary, orchestration, and scenario chunk contract tests to assert direct owner calls and block proxy reintroduction.
- Main-thread verification run:
  - `node --check js/core/map_renderer.js tests/scenario_chunk_contracts.test.mjs`
  - `python -m py_compile tests/test_map_renderer_spatial_index_runtime_owner_boundary_contract.py tests/test_map_renderer_spatial_index_runtime_orchestration_contract.py`
  - `python -m unittest tests.test_map_renderer_spatial_index_runtime_owner_boundary_contract tests.test_map_renderer_spatial_index_runtime_orchestration_contract -q`
  - `node --test tests/scenario_chunk_contracts.test.mjs`
  - `npm run verify:pages-dist`
  - `git diff --no-index -- js/core/map_renderer.js dist/app/js/core/map_renderer.js`
  - `git diff --check`
- Verification result so far: syntax checks passed, 10 spatial Python contracts passed, 29 scenario chunk Node contracts passed with the existing module-type warning, Pages dist build passed with 13 startup shell tests OK, source/dist `map_renderer.js` match, and `git diff --check` reported only Windows line-ending warnings.
- Phase 18 read-only code-review result: WATCH only for ordering test strength. The reviewer confirmed code equivalence, preserved reset/build ordering in all three call sites, unchanged owner lifecycle, no `this` binding issue, and no performance concern.
- Follow-up fix: `tests/test_map_renderer_spatial_index_runtime_orchestration_contract.py` now slices all three secondary spatial rebuild paths and asserts owner reset/build ordering in each. The scenario apply path allows the existing Atlantropa index-count calculation between auxiliary rebuild and owner reset while still requiring reset before build.
- Follow-up verification:
  - `python -m py_compile tests/test_map_renderer_spatial_index_runtime_orchestration_contract.py`
  - `python -m unittest tests.test_map_renderer_spatial_index_runtime_owner_boundary_contract tests.test_map_renderer_spatial_index_runtime_orchestration_contract -q`
  - `node --test tests/scenario_chunk_contracts.test.mjs`
- Follow-up verification result: Python syntax passed, 11 spatial Python contracts passed, and 29 scenario chunk Node contracts passed with the existing module-type warning.
- Final Phase 18 closeout: WATCH resolved after ordering guards were strengthened.

## Phase 19 candidate

- Target: reduce `map_renderer.js` urban city policy surface while preserving stable public read models.
- Chosen slice: remove internal-only urban policy proxies for `getUrbanFeatureIndex`, `getCityUrbanRuntimeInfo`, `getCityScenarioTag`, and `doesScenarioCountryHideCityPoints`.
- Boundary: `buildCityRevealPlan` and `getEffectiveCityCollection` remain stable `map_renderer.js` read-model facades because E2E and UI public facade consumers rely on them. Color resolution facades remain in place because they are cross-renderer semantic read helpers.
- Implementation:
  - Removed the four internal-only urban proxy constants from `map_renderer.js`.
  - Replaced internal city-light/runtime call sites with direct `getUrbanCityPolicyOwner()` method calls.
  - Removed `getCityScenarioTag` and `doesScenarioCountryHideCityPoints` from the `map_renderer.js` export list.
  - Updated `tests/test_map_renderer_urban_city_policy_boundary_contract.py` to guard against proxy and export reintroduction while keeping stable city reveal/effective collection facades.
- Main-thread verification run:
  - `node --check js/core/map_renderer.js`
  - `python -m py_compile tests/test_map_renderer_urban_city_policy_boundary_contract.py tests/test_map_renderer_public_contract.py`
  - `python -m unittest tests.test_map_renderer_urban_city_policy_boundary_contract tests.test_map_renderer_public_contract -q`
  - `node --test tests/physical_layer_contracts.test.mjs tests/scenario_chunk_contracts.test.mjs`
  - `npm run verify:pages-dist`
  - `git diff --no-index -- js/core/map_renderer.js dist/app/js/core/map_renderer.js`
  - `git diff --check`
  - `rg -n "\\b(getUrbanFeatureIndex|getCityUrbanRuntimeInfo|getCityScenarioTag|doesScenarioCountryHideCityPoints)\\b" js/core/map_renderer.js js/core/map_renderer/public.js tests/test_map_renderer_urban_city_policy_boundary_contract.py tests/test_map_renderer_public_contract.py`
- Verification result so far: syntax checks passed, 5 public/urban Python contracts passed, 31 physical/chunk Node contracts passed with the existing module-type warning, Pages dist build passed with 13 startup shell tests OK, source/dist `map_renderer.js` match, `git diff --check` reported only Windows line-ending warnings, and export scan confirmed the removed urban policy helpers only remain in tests/owner direct calls.
- Phase 19 read-only code-review result: WATCH only for stable read-model export protection and task checkbox sync. The reviewer confirmed implementation equivalence, safe removal of `getCityScenarioTag` and `doesScenarioCountryHideCityPoints` from `map_renderer.js` exports, and no production/public facade consumers for those two helpers.
- Follow-up fix: `tests/test_map_renderer_urban_city_policy_boundary_contract.py` now parses the `map_renderer.js` export block to require `buildCityRevealPlan` and `getEffectiveCityCollection`, while blocking `getCityScenarioTag` and `doesScenarioCountryHideCityPoints`; `task.md` now marks the implementation item complete.
- Follow-up verification:
  - `python -m py_compile tests/test_map_renderer_urban_city_policy_boundary_contract.py`
  - `python -m unittest tests.test_map_renderer_urban_city_policy_boundary_contract tests.test_map_renderer_public_contract -q`
  - `node --test tests/physical_layer_contracts.test.mjs tests/scenario_chunk_contracts.test.mjs`
- Follow-up verification result: Python syntax passed, 5 public/urban Python contracts passed, and 31 physical/chunk Node contracts passed with the existing module-type warning.
- Final Phase 19 closeout: WATCH resolved after export-block guard strengthening and task sync.

## Final closeout

- Remaining one-line owner facades in `map_renderer.js` were reviewed and intentionally kept:
  - `getDisplayOwnerCode` and `getResolvedFeatureColor` remain renderer semantic read helpers used across color, political, boundary, and overlay paths.
  - `buildCityRevealPlan` and `getEffectiveCityCollection` remain stable read-model facades protected by public/export contracts.
- Final main-thread verification:
  - `python -m unittest tests.test_map_renderer_city_label_owner_boundary_contract tests.test_map_renderer_render_pipeline_passes_boundary_contract tests.test_map_renderer_spatial_index_runtime_owner_boundary_contract tests.test_map_renderer_spatial_index_runtime_orchestration_contract tests.test_map_renderer_strategic_overlay_helpers_boundary_contract tests.test_map_renderer_strategic_overlay_runtime_owner_boundary_contract tests.test_map_renderer_urban_city_policy_boundary_contract tests.test_map_renderer_public_contract -q`
  - `node --check js/core/map_renderer.js tests/scenario_chunk_contracts.test.mjs`
  - `git diff --check`
  - `git diff --no-index -- js/core/map_renderer.js dist/app/js/core/map_renderer.js`
  - `rg -n "^const [A-Za-z0-9_]+ = \\(\\.\\.\\.args\\) =>|\\.\\.\\.args\\) => get[A-Za-z0-9_]+Owner\\(\\)" js/core/map_renderer.js`
- Final verification result: 22 Python boundary/public contracts passed, JS syntax checks passed, source/dist `map_renderer.js` match, `git diff --check` reported only Windows line-ending warnings, and only the four intentionally kept read-model facades remain.
- Final read-only review result: WATCH only for required archival. The reviewer found zero code issues and confirmed proxy deletions, preserved public/read-model facades, owner call order, boundary coverage, and docs/task/lessons consistency.
