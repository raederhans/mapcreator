# Data Contract Simplification

## Goal

Centralize build-time JSON shape validation for runtime asset registry,
transport manifests, and catalog entries without changing runtime data formats.

## Boundaries

- Use `jsonschema` only in Python build tooling.
- Keep cross-field business rules in the existing owner modules.
- Do not touch browser runtime dependencies.
- Work in the isolated `codex/data-contract-simplification` worktree.

## Plan

- [x] Create isolated worktree and task record.
- [x] Add shared JSON Schema validation helper and schema files.
- [x] Route runtime asset registry, transport manifest, and catalog entry shape checks through the helper.
- [x] Add focused regression tests for missing fields, type errors, and cross-field reference errors.
- [x] Run targeted Python checks. Pages dist verification is not required because delivery artifacts were not modified.
- [ ] Run review/self-check, archive this folder after completion, then merge back to `main`.

## Validation

- `python -m py_compile map_builder/runtime_asset_registry.py map_builder/transport_workbench_contracts.py tools/build_data_catalog.py`
- `python -m unittest tests.test_data_manifest_contract tests.test_transport_manifest_contracts tests.test_transport_country_source_contracts -q`
- `npm run verify:pages-dist` if registry/catalog delivery artifacts change.
