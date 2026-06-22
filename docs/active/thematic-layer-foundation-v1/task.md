# Thematic Layer Foundation V1 Task

## Acceptance Criteria

- Thematic layer index validates against schema.
- Each demo manifest validates against schema and references existing payload/audit files.
- Admin metrics validate against schema and use explicit missing-data statuses.
- Grid RLE payload validates against schema with WGS84 720 by 360 grid metadata.
- Build audits validate against schema and include fixture notices.
- Builder can regenerate demo assets deterministically.
- Runtime registry and data catalog stay consistent when thematic assets are exposed.
- Existing map rendering behavior remains untouched.

## Delivery Package

1. What changed:
   - Added thematic layer contract helpers and five JSON schemas.
   - Added deterministic fixture builder for political, social, and population thematic layers.
   - Generated thematic index, source recipes, layer manifests, metrics/grid payloads, and build audits.
   - Registered thematic index/manifests in runtime asset registry, data manifest, and catalog.
   - Added thematic tests and updated catalog count checks plus landing catalog count mirrors.

2. Changed files:
   - Core: `map_builder/thematic_layer_contracts.py`, `map_builder/contracts.py`, `tools/build_thematic_layers.py`.
   - Schemas: `map_builder/schemas/thematic_layer_index.schema.json`, `thematic_layer_manifest.schema.json`, `thematic_admin_metrics.schema.json`, `thematic_grid_rle.schema.json`, `thematic_build_audit.schema.json`.
   - Tests: `tests/test_thematic_layer_contracts.py`, `tests/test_data_catalog_contract.py`.
   - Generated data: `data/thematic_layers/**`, `data/runtime_asset_registry.json`, `data/manifest.json`, `data/CATALOG.json`, `data/CATALOG.md`.
   - Landing count mirror: `landing/index.html`, `landing/app.js`.
   - Docs: `docs/active/thematic-layer-foundation-v1/*`, `docs/active/_worktree_registry.md`.

3. Diff summary relative to base:
   - Adds 13 thematic data outputs and 5 new thematic schema refs.
   - Catalog entries increase from 641 to 654.
   - No renderer, scenario runtime, or UI layer-control code is modified.

4. Commit status:
   - Pending feature commit, rebase to current main, and integration commit.

5. Base commit and divergence:
   - Base: `main@a023e4a3a764ef30143598ef3f761deea43f515c`.
   - Current main advanced to `447b972d94674897aaa2be586c6cd1d609500c72`; rebase is required before final integration.

6. Potential conflicts:
   - Yellow semantic overlap with layer-panel contract work because both concern layer metadata/contracts.
   - Green direct-file overlap with current baseline/state-write worktrees based on current uncommitted thematic file list.
   - Red direct overlap if another active worktree edits `data/manifest.json`, `data/runtime_asset_registry.json`, `data/CATALOG.*`, or `tests/test_data_catalog_contract.py`.

7. Verification commands:
   - `py -3 tools/build_thematic_layers.py` PASS.
   - `py -3 tools/build_data_catalog.py` PASS.
   - `py -3 -m unittest tests.test_thematic_layer_contracts tests.test_data_manifest_contract tests.test_data_catalog_contract -q` PASS, 34 tests.
   - `py -3 -m py_compile map_builder/thematic_layer_contracts.py tools/build_thematic_layers.py` PASS.
   - `py -3 tools/check_data_catalog.py` PASS with existing empty-hashRef warnings.
   - `git diff --check` PASS with line-ending notices only.
   - `npm run verify:architecture-boundaries` PASS.
   - `npm run verify:test-import-graph` PASS.

8. Remaining risks:
   - Fixture values are synthetic and must stay out of real-data interpretation.
   - Real ingestion still needs source cache, release pinning, source file signatures, license handling, and join audits.
   - If another worktree also touches catalog/manifest/registry files, integration order must be reassessed.
   - Follow-up architecture debt: add a short thematic schema naming note and split source-family builder code when the second real source family enters.

9. Recommended next action:
   - After review lanes clear, commit this branch, merge/rebase onto current main, rerun targeted validation, push, update registry to integrated, then clean the worktree.

10. Integration readiness:
   - Ready for rebase to current main. Ready for integration after post-rebase validation passes.
