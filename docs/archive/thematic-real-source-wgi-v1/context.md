# Thematic Real Source WGI v1 Context

## 2026-06-22 Start

- Base: `origin/main@d91daf1fd5da7af2e2b48b72d8daf565e83c28e1`.
- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-thematic-real-source-wgi-v1-20260622`.
- Branch: `codex/thematic-real-source-wgi-v1-20260622`.
- Parallel worktree: `C:\Users\raede\Desktop\dev\mapcreator-thematic-runtime-discovery-readonly-preview-20260622`, currently a read-only preview lane with uncommitted task docs and registry edits.
- Boundary: WGI real-source data assets and contracts only; UI/runtime rendering remains outside this stage.
- Main agent owns live processes. Subagents are limited to static mapping, test design, and final review.

## Source Evidence

- Official World Bank WGI 2025 revision Excel source was identified as `wgidataset_with_sourcedata-2025.xlsx`.
- Local cache target: `.runtime/source-cache/thematic/wgi/WGI_2025_Revision_Governance_Estimates_and_Absolute_Scores_1996_2024.xlsx`.
- Source file observed size/hash in prior setup: `10423344` bytes, SHA-256 `25a2f9eabb90b0092973392c0b31571aa58b691cc5786292e504b52f693e1eb8`.
- The production builder must use cache-only behavior by default; test fixtures must avoid network access.

## Findings

- Existing thematic foundation has three fixture-only layers and strict schema validators.
- Current `thematic_admin_metrics` schema needs a `partial_source_gap` source status for composite metrics with one missing input.
- Current `thematic_build_audit` schema needs a top-level `dropped_aggregate_rows` field for WGI source audit evidence.
- Current data/catalog tests include fixed counts for thematic artifact families, so WGI checked-in assets must update those counts and generated manifests.

## Progress Log

- Created WGI dedicated worktree from `origin/main`.
- Confirmed the WGI worktree is clean and matches `origin/main`.
- Confirmed the read-only preview worktree is a parallel thematic lane with no code commits and only uncommitted docs/registry changes.
- Implemented `map_builder/thematic_wgi_ingest.py` as the WGI source-cache owner.
- Generated `political_wgi_state_capacity_v1` checked-in assets from the local WGI 2025 revision Excel cache.
- WGI generated coverage: 215 admin0 features, 213 complete, 2 partial, 0 missing.
- Refreshed `data/runtime_asset_registry.json`, `data/manifest.json`, `data/CATALOG.json`, `data/CATALOG.md`, and landing catalog copy to 658 entries.
- Independent quality/code review found two fix-required issues: partial checked-in WGI outputs could silently drop the layer from the default builder, and non-finite or out-of-range WGI scores could pass into unsafe JSON numbers.
- Fixed the default WGI replay contract so all four checked-in WGI outputs are loaded together or fail fast when partially missing. Complete absence remains the old fixture-only path for fresh bootstrap use.
- Fixed WGI score parsing and thematic admin metrics validation so `NaN`, `Infinity`, and out-of-range normalized scores are rejected or represented as `source_gap`.
- Added WGI ingest tests to the named `test:py:thematic-layer-contracts` route and structural route registry so future ingest edits select the real-source tests.
- Latest validation passed compile, WGI/thematic contracts, named npm thematic route, structural tooling, WGI real/default builds, catalog rebuild, data manifest/catalog contracts, data catalog check, architecture boundaries, import graph, Pages dist, and diff check. `verify:dist-drift` is expected to report pending dist changes before commit because the commit has not yet recorded the regenerated dist files.
- Integration note: this feature branch is currently 2 commits behind `origin/main@ad4b6b8659d2d56a2e8f01b9f4cbd2428462782f`; integrate only after rebasing or merging current main and re-rating overlap with the thematic runtime preview worktree.

## 2026-06-22 Integration Closeout

- Preview work landed first on main, so WGI was rebased through the preview closeout commits before integration.
- Final WGI feature commit: `7336c05583fa546dcb783970a972ffe3868a855f`.
- Main fast-forwarded WGI from `64a8ab719128e83a1f21f388144e0b801f98a91b` to `7336c05583fa546dcb783970a972ffe3868a855f`.
- Post-merge validation passed: WGI/thematic npm route 18 tests, structural tooling 28 tests, data manifest/catalog 32 tests, data catalog check with 658 entries, architecture boundaries, import graph, Pages dist 38 startup tests plus 8 landing tests, and `git diff --check`.
- The first structural tooling rerun on main failed because the main checkout was missing local Node dependency `@playwright/test`; `npm ci --ignore-scripts` restored ignored local dependencies and the same test then passed.
- WGI remains catalog-only and experimental. Rendering, UI control, scenario save-format, and topology changes remain future phases.
