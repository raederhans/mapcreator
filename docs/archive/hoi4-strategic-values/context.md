# HOI4 Strategic Values Context

## 2026-06-13

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-hoi4-strategic-values`.
- Branch: `codex/hoi4-strategic-values`.
- Base: `origin/main` at `baede218 Clarify render recovery and perf gate contracts`.
- Main checkout is dirty with unrelated appearance/transport/docs changes, so all work stays in this isolated worktree.
- `lessons learned.md` read. Relevant constraints:
  - Scenario generated outputs and `dist/app` must be verified from the same source of truth.
  - `verify:pages-dist` is required for delivery-surface changes.
  - New scenario data should use scenario manifest governance instead of unrelated data catalog paths unless it becomes a runtime asset registry entry.
  - HOI4 state ownership must reuse `scenario_builder.hoi4.parser` semantics.
- `docs/shared/agent-tiers.md` read. This task is THOROUGH because it crosses data, runtime, UI, contracts, and dist.
- Live-process ownership:
  - Main thread owns all builds, long tests, dev server, browser smoke, and perf runs.
  - Child agents may do static analysis or bounded code review only unless explicitly assigned disjoint files.
- User-provided HOI4 strategic values plan read from the attachment and treated as the guiding design document. The plan remains immutable; this folder tracks execution against the current repository.

## Open Risks

- Steam HOI4 source root availability must be verified by the existing builder before claiming real scenario build success.
- VP city matching is approximate because the current compiler has no province-to-feature geometry bridge.
- Generated scenario outputs may be large and may update checked-in manifests; all generated artifacts need strict source/dist verification before commit.

## Phase 1 Evidence

- Extended `StateRecord` with VP pairs, resources, state buildings, and province buildings.
- Parser now strips comments before extraction, preserves owner/core semantics, parses VP pair blocks and `add_victory_points`, and applies dated building overrides by `as_of_date`.
- Targeted verification passed:
  - `python -m unittest tests.test_hoi4_state_parser tests.test_build_hoi4_scenario -v`

## Phase 2 Evidence

- Added pure strategic artifact builder in `scenario_builder/hoi4/strategic.py`.
- Wired `strategic_values.by_feature.json` through compiler output, HOI4 builder, manifest URLs, bundle checker, strict contract checker, and scenario expectations.
- Fixed Steam victory point localisation parsing for modern HOI4 keys such as `VICTORY_POINTS_6521: "Berlin"` and tag-specific aliases.
- Fixed generated detail chunk `feature_bounds` to emit only non-empty bbox values, matching the strict scenario contract.
- Kept `infrastructure` as a level metric when owner pools aggregate unanchored states; additive metrics such as manpower, resources, and factories still sum.
- Real scenario diagnostics after rebuild:
  - `hoi4_1936`: VP 1390/1500 matched, 914 anchored states, 677 resource points, infrastructure max 5.
  - `hoi4_1939`: VP 1391/1501 matched, 914 anchored states, 677 resource points, infrastructure max 5.
- Verification passed:
  - `python -m unittest tests.test_scenario_chunk_assets tests.test_hoi4_strategic_values tests.test_hoi4_state_parser tests.test_check_hoi4_scenario_bundle tests.test_build_hoi4_scenario -v`
  - `python tools/build_hoi4_scenario.py --scenario-id hoi4_1936 --skip-atlas`
  - `python tools/build_hoi4_scenario.py --scenario-id hoi4_1939 --skip-atlas`
  - `python tools/check_hoi4_scenario_bundle.py --scenario-dir data/scenarios/hoi4_1936 --report-dir .runtime/reports/generated/scenarios/hoi4_1936`
  - `python tools/check_hoi4_scenario_bundle.py --scenario-dir data/scenarios/hoi4_1939 --report-dir .runtime/reports/generated/scenarios/hoi4_1939`
  - `python tools/check_scenario_contracts.py --strict --write-safe --scenario-dir data/scenarios/hoi4_1936`
  - `python tools/check_scenario_contracts.py --strict --write-safe --scenario-dir data/scenarios/hoi4_1939`

## Phase 3 Starting Notes

- Runtime integration should be optional and scenario-scoped: missing `strategic_values_url` keeps existing scenarios unchanged.
- Shared files remain main-thread owned: `index.html`, `css/style.css`, `js/ui/toolbar.js`.

## Phase 3-6 Evidence

- Added strategic values runtime normalization in `js/core/scenario/strategic_values.js`.
- Added `strategicvalues` optional layer config, manifest URL handling, runtime state fields, reset/snapshot/restore paths, project import/export fields, and lazy load triggers.
- Added a strategic choropleth renderer helper and connected it through `resolveFeatureColor()` with a metric allowlist and stable color families.
- Added toolbar controls for strategic resource markers and strategic heat metric.
- Added VP-derived city ranking properties in `urban_city_policy` and weighted city sorting in `map_renderer`.
- Added strategic resource marker helper and render pass wiring with diagnostic-error gating and cache signatures.
- Updated i18n catalog and manual UI translation data for the new controls and metric labels.
- Fixed the apply pipeline so raw bundled strategic payloads are normalized before runtime commit.
- Verification passed:
  - `node --check js/core/scenario/strategic_values.js`
  - `node --check js/core/scenario_resources.js`
  - `node --check js/core/scenario_apply_pipeline.js`
  - `node --test tests/scenario_strategic_values_behavior.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs tests/scenario_optional_layers_behavior.test.mjs`
  - `node --test tests/scenario_optional_layers_behavior.test.mjs tests/urban_city_policy_strategic_values_behavior.test.mjs tests/strategic_resource_markers_behavior.test.mjs tests/strategic_choropleth_behavior.test.mjs tests/scenario_strategic_values_behavior.test.mjs`
  - `python -m unittest tests.test_map_renderer_strategic_values_render_contract tests.test_map_renderer_urban_city_policy_boundary_contract tests.test_toolbar_split_boundary_contract -v`
  - `node --test tests/appearance_preset_state.node.test.mjs tests/appearance_preset_history.node.test.mjs tests/appearance_presets_owner_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs`

## Phase 7 Starting Notes

- Remaining work is validation breadth, generated dist sync, UltraQA/review, docs archive, and git delivery.
- Main thread owns all remaining live verification commands.

## Phase 7 Evidence

- Rebuilt both HOI4 scenarios from the local Steam source with strategic artifacts:
  - `python tools/build_hoi4_scenario.py --scenario-id hoi4_1936 --skip-atlas`
  - `python tools/build_hoi4_scenario.py --scenario-id hoi4_1939 --skip-atlas`
- Rebuilt generated scenario chunk assets:
  - `python tools/build_scenario_chunk_assets.py --scenario-dir data/scenarios/hoi4_1936`
  - `python tools/build_scenario_chunk_assets.py --scenario-dir data/scenarios/hoi4_1939`
- Bundle checks passed:
  - `python tools/check_hoi4_scenario_bundle.py --scenario-dir data/scenarios/hoi4_1936 --report-dir .runtime/reports/generated/scenarios/hoi4_1936`
  - `python tools/check_hoi4_scenario_bundle.py --scenario-dir data/scenarios/hoi4_1939 --report-dir .runtime/reports/generated/scenarios/hoi4_1939`
- Strict scenario contracts passed read-only after `--write-safe` synchronized generated startup bundles and build snapshots:
  - `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hoi4_1936 --report-path .runtime/reports/generated/scenarios/hoi4_1936.strict_contract_report.json`
  - `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hoi4_1939 --report-path .runtime/reports/generated/scenarios/hoi4_1939.strict_contract_report.json`
- Broad Python tests passed:
  - `python -m unittest tests.test_scenario_chunk_assets tests.test_hoi4_strategic_values tests.test_hoi4_state_parser tests.test_check_hoi4_scenario_bundle tests.test_build_hoi4_scenario tests.test_map_renderer_strategic_values_render_contract tests.test_map_renderer_urban_city_policy_boundary_contract tests.test_toolbar_split_boundary_contract -v`
- Broad Node tests passed:
  - `node --test tests/scenario_strategic_values_behavior.test.mjs tests/strategic_choropleth_behavior.test.mjs tests/strategic_resource_markers_behavior.test.mjs tests/scenario_optional_layers_behavior.test.mjs tests/urban_city_policy_strategic_values_behavior.test.mjs tests/palette_runtime_bridge.node.test.mjs tests/appearance_preset_state.node.test.mjs tests/appearance_preset_history.node.test.mjs tests/appearance_presets_owner_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs`
- Project health gates passed:
  - `npm run verify:state-write-allowlist`
  - `python tools/i18n_audit.py`
  - `python tools/build_data_catalog.py`
  - `python tools/data_health.py`
  - `npm run verify:pages-dist`
- Pages dist repair note:
  - `tools/build_landing_europe_1936_showcase.py` now keeps renderable polygons inside repaired `GeometryCollection` values, so valid focus countries remain visible after Shapely repair.
  - `hero-blank.svg` now records and applies `land_path_limit=8600` and `coastline_path_limit=1000`, keeping the file below the existing Pages asset budget while preserving the largest projected land and coastline paths.

## Final Review Findings And Fixes

- Review finding: scenario publish scope omitted `strategic_values.by_feature.json`.
  - Fix: added `SCENARIO_STRATEGIC_VALUES_FILENAME` to scenario-data publish scope and locked it with `test_scenario_publish_scope_includes_strategic_values_asset`.
- Review finding: strict and HOI4 bundle checks accepted partial strategic feature coverage.
  - Fix: both checkers now require `bucket_by_feature` to cover owner features; regression tests reject partial coverage.
- Review finding: `GeometryCollection` bounds could collapse to a global bbox in chunk generation and contract validation.
  - Fix: chunk builder and strict contract checker now recurse into `geometries`; regression tests cover mixed child geometry.
- Review finding: blank hero budget capped land paths but left coastline paths unbounded.
  - Fix: blank hero now records and applies `coastline_path_limit=1000`; regenerated landing and dist assets.
- Review finding: already-normalized strategic runtime payloads skipped scenario and baseline identity checks.
  - Fix: runtime payloads now retain `scenarioId` and `baselineHash`; normalization revalidates them on every call.
- Review finding: strategic choropleth metric alone did not trigger optional strategic layer loading.
  - Fix: visibility sync treats either resource markers or a non-empty choropleth metric as a strategic layer request.

## Final Verification Evidence

- Rebased `codex/hoi4-strategic-values` onto the latest `origin/main`; conflict resolution was limited to `dist/pages-dist-manifest.json` and `lessons learned.md`.
- After rebase, `npm run verify:pages-dist` passed again.
- Rebuilt `hoi4_1936` and `hoi4_1939` with `--skip-atlas`, then used `check_scenario_contracts.py --strict --write-safe` to refresh derived snapshot/audit/startup artifacts. The repair command reported a second-pass diff while converging from stale manifest source data, and the final read-only strict contract checks passed for both scenarios.
- `python tools/check_hoi4_scenario_bundle.py --scenario-dir data/scenarios/hoi4_1936 --report-dir .runtime/reports/generated/scenarios/hoi4_1936`
- `python tools/check_hoi4_scenario_bundle.py --scenario-dir data/scenarios/hoi4_1939 --report-dir .runtime/reports/generated/scenarios/hoi4_1939`
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hoi4_1936 --report-path .runtime/reports/generated/scenarios/hoi4_1936.strict_contract_report.json`
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hoi4_1939 --report-path .runtime/reports/generated/scenarios/hoi4_1939.strict_contract_report.json`
- `npm run verify:pages-dist`
- `python -m unittest tests.test_scenario_chunk_assets tests.test_hoi4_strategic_values tests.test_hoi4_state_parser tests.test_check_hoi4_scenario_bundle tests.test_build_hoi4_scenario tests.test_map_renderer_strategic_values_render_contract tests.test_map_renderer_urban_city_policy_boundary_contract tests.test_toolbar_split_boundary_contract tests.test_scenario_contracts -v`
- `node --test tests/scenario_strategic_values_behavior.test.mjs tests/strategic_choropleth_behavior.test.mjs tests/strategic_resource_markers_behavior.test.mjs tests/scenario_optional_layers_behavior.test.mjs tests/urban_city_policy_strategic_values_behavior.test.mjs tests/palette_runtime_bridge.node.test.mjs tests/appearance_preset_state.node.test.mjs tests/appearance_preset_history.node.test.mjs tests/appearance_presets_owner_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs tests/scenario_lifecycle_runtime_behavior.test.mjs`
- `npm run verify:state-write-allowlist`
- `python tools/i18n_audit.py`
- `python tools/build_data_catalog.py`
- `python tools/data_health.py`
- `git diff --check`
