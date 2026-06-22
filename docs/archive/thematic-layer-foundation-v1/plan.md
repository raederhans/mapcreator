# Thematic Layer Foundation V1 Plan

## Goal

Create the first read-only thematic layer foundation for political, social, and population demo layers. This phase proves that thematic attributes and grids can enter the project as audited, schema-validated assets with deterministic fixture output.

## Scope Grade

- Grade: complex, then integration.
- Reason: the change touches schemas, generated data, runtime registry, catalog, landing catalog copy, tests, active docs, and worktree registry state.
- Live process owner: main Codex agent.
- Subagent lanes: official-source research, static code mapping, code review, architecture review, and simplification review.

## Boundaries

- Build-time data contracts, schemas, fixture assets, audit payloads, source recipes, registry entries, catalog entries, and tests are in scope.
- Runtime registry exposure is limited to stable read-only asset discovery.
- Main map rendering, UI controls, scenario overrides, and editing workflows stay in later phases.
- Demo values are fixture values and carry explicit limitations in manifests and audits.
- Existing political topology and transport/physical/city-light formats stay unchanged.

## Data Contract

- `data/thematic_layers/index.json` is the catalog for thematic demo layers.
- Each layer has a `manifest.json`, payload file, and `build_audit.json`.
- Admin layers use ISO A3 join keys and explicit `coverage_status`.
- Grid layers use WGS84 bounds `[-180, -90, 180, 90]`, 720 columns, 360 rows, and RLE u8 array encoding.
- Missing values use `null` plus `source_status`, preserving missing-data meaning.

## Demo Layers

- `political/state_capacity_demo`: admin0 fixture metrics for state capacity, government effectiveness, and rule of law.
- `social/human_development_demo`: admin0 fixture metrics for HDI, education, and income index shape.
- `population/population_density_demo`: grid fixture for population-density contract testing.

## Explicit Non-Goals

- No network downloads.
- No full WGI, HDI, V-Dem, GHSL, or WorldPop ingestion.
- No UI panel or inspector.
- No main renderer changes.
- No scenario override or editing support.
- No browser runtime dependency.

## Validation Plan

- `py -3 -m py_compile map_builder/thematic_layer_contracts.py tools/build_thematic_layers.py`
- `py -3 tools/build_thematic_layers.py`
- `py -3 tools/build_data_catalog.py`
- `py -3 -m unittest tests.test_thematic_layer_contracts tests.test_data_manifest_contract tests.test_data_catalog_contract -q`
- `py -3 tools/check_data_catalog.py`
- `git diff --check`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`

## Follow-Up Phases

1. Real source ingestion with source cache, licenses, source signatures, and repeatable joins.
2. Runtime rendering MVP for admin choropleth, grid underlay, and point/event overlay.
3. Thematic UI and inspector with provenance display.
4. Scenario override and editing contracts.
5. Productized themes, presets, visual QA, and examples.

## Progress

- [x] Scope confirmed from attached task text.
- [x] Worktree created from `main@a023e4a3a764ef30143598ef3f761deea43f515c`.
- [x] Existing worktrees inspected for direct diff overlap.
- [x] Local schema, registry, manifest, transport, and intensity-field patterns inspected.
- [x] External official-source research packet adopted.
- [x] Thematic contracts implemented.
- [x] Fixture builder implemented.
- [x] Demo assets generated.
- [x] Tests added and passing.
- [ ] Final review and merge closeout complete.
