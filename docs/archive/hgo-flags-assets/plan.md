# HGO Flags Assets Plan

## Goal

Build a checked-in HGO flag PNG delivery surface after authorization confirmation, while keeping HGO source TGA files as local cache inputs.

## Constraints

- Do not commit the raw HGO source directory.
- Keep HGO detached from scenario runtime and owner registries.
- Avoid GitHub LFS for Pages-readable assets because GitHub Pages cannot serve LFS objects directly.
- Avoid a single output directory with more than 3000 entries by sharding PNG outputs.
- Main thread owns all generation and tests.

## Acceptance Criteria

- A deterministic builder converts HGO `gfx/flags` TGA files into PNG files under `data/hgo_catalogs/flags_png/`.
- `data/hgo_catalogs/hgo_flags.png_manifest.json` records every converted PNG path, tier, dimensions, size, sha256, source path, tag, and variant.
- `data/hgo_catalogs/index.json` references the PNG manifest in addition to names and source index.
- `data/runtime_asset_registry.json`, `map_builder/contracts.py`, `data/manifest.json`, and data catalog outputs include the PNG manifest entry.
- Target checks prove expected counts: full 3863, medium 3729, small 3661; `ABK` base and `ABK_SOV` variant have PNG paths.
- Source ledger reflects the authorized converted PNG catalog phase without treating the source cache as required.

## Verification

- `python -m unittest tests.test_hgo_catalog_builders tests.test_data_manifest_contract tests.test_data_catalog_contract tests.test_source_ledger_contract -q`
- `python tools/check_source_ledger.py`
- `python tools/build_data_catalog.py`
- `python tools/data_health.py`
- `git diff --check`

