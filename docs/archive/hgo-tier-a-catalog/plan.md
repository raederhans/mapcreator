# HGO Tier-A Catalog Plan

## Goal

Build the first reusable HGO Tier-A catalog layer: country palette, place names, and a source-only flag index. Keep it detached from scenario ownership, projected geometry, and runtime scenario behavior.

## Acceptance Criteria

- `data/palettes/index.json` contains `hgo`.
- `data/hgo_catalogs/hgo_place_names.json` contains country, state, strategic region, and supply area names.
- `data/hgo_catalogs/hgo_flags.index.json` indexes full, medium, and small TGA source tiers without converting or committing PNG files.
- HGO catalog entries are visible through `data/runtime_asset_registry.json` and generated `data/CATALOG.json`.
- Source ledger records HGO as an optional local cache and does not require the ignored source directory in clean worktrees.
- Targeted tests and data health pass.

## Execution Notes

- Work in `C:\Users\raede\Desktop\dev\mapcreator-hgo-tier-a-catalog` on `codex/hgo-tier-a-catalog`.
- Read HGO source from `C:\Users\raede\Desktop\dev\mapcreator\historic geographic overhaul`.
- Main thread owns all generation, tests, and build commands.
- Subagents may only perform static review or test strategy checks.
