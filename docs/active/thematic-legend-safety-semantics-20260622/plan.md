# Thematic Legend And Safety Semantics Plan

## Goal

Define the interpretation contract that every future thematic layer must satisfy before canvas rendering, map toggles, or save-format work starts.

## Scope

- Add a docs-level contract for thematic legend semantics, missing-data handling, uncertainty wording, source warnings, and render readiness.
- Keep WGI official dimensions separate from project-derived proxy/composite wording.
- Preserve missing and uncertain source values as explicit metadata, with null for missing numeric values.
- Keep this phase in active docs until the implementation slice is ready.

## Non-goals

- No thematic canvas rendering.
- No map toggle or UI control wiring.
- No save-format, project-file, or persistence changes.
- No generated data rebuild.
- No Pages dist rebuild.
- No NoData-as-zero behavior.
- No network download.

## Proposed Contract Fields

- `unit`: reader-facing unit label, for example percentile rank, percent, score, count, or index.
- `scale_domain`: numeric domain plus whether the domain is bounded by source authority or project convention.
- `direction`: whether higher or lower values mean more of the named concept.
- `missing_policy`: how missing values are represented and how they are excluded from statistics.
- `uncertainty_policy`: the uncertainty fields exposed and their source meaning.
- `source_warning`: required warning text for proxies, sparse data, estimates, or partial coverage.
- `composite_policy`: whether a composite is official, project-defined, weighted, unweighted, or not computed.
- `legend_bins`: metadata-only bin strategy proposal for a later rendering slice.
- `citation`: source title, URL or local source-cache pointer, license, and retrieval date when available.
- `render_readiness`: `catalog_only`, `preview_safe`, or `main_map_ready`.

## WGI Required Semantics

- Official WGI dimensions stay separate from the project governance proxy.
- Composite uncertainty remains `method=not_computed` until a defensible method exists.
- Missing values remain null and never become zero.
- Layer defaults remain hidden: `default_visible=false`.
- Main-map rendering remains disabled: `supports_main_map_render=false`.
- Source-derived metadata remains visible to runtime diagnostics and catalog consumers.

## Candidate Implementation Touchpoints

- `map_builder/thematic_layer_contracts.py`
- `map_builder/thematic_wgi_ingest.py`
- `js/core/thematic_layer_catalog.js`
- `tests/test_thematic_layer_contracts.py`
- `tests/test_thematic_wgi_source_ingest.py`
- `tests/thematic_layer_catalog_behavior.test.mjs`

## Phase Checks

- Registry and archived WGI task reflect pushed truth.
- Active plan/context/task exist for the semantic phase.
- No production code or generated assets change in this preparatory branch.
- Future implementation begins with tests that lock field names and WGI semantics before code changes.

## Progress

- [x] Create active docs plan/context/task for the semantic phase.
- [ ] Implement schema/contract tests for the metadata fields.
- [ ] Implement builder/runtime metadata propagation.
- [ ] Run targeted Python and Node contract checks.
- [ ] Reassess renderer readiness after metadata contracts pass.
