# HGO Runtime PoC Context

## 2026-06-05 Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-hgo-runtime-poc`
- Branch: `codex/hgo-runtime-poc`
- Base commit: `ab09cdd1`
- Main worktree had unrelated dirty files before this task. This worktree isolates the implementation.
- Live process owner: main agent only.
- Subagents may perform static file lookup, test-design review, and final code review. They must not run or monitor live tests.

## Current Phase

Implement the first vertical slice:

1. HGO runtime seed builder.
2. Independent JavaScript runtime index.
3. Focused tests and named scripts.

## 2026-06-05 Implementation Notes

- Added `tools/build_hgo_runtime_seed.py`.
  - Reads `map/definition.csv`, `history/states`, `common/country_tags`, and `common/countries`.
  - Requires `map/provinces.bmp` to exist because future raster rendering depends on the same HGO source root.
  - Hard-fails duplicate province ids, duplicate RGB mappings, unknown state province ids, duplicate state ids, duplicate province ownership, and states with provinces but no owner.
  - Reuses the existing HOI4 state parser for `history` block ownership, dated overrides, core removal, and `controller -> owner` fallback.
  - Writes runtime output to `.runtime/hgo_runtime/seed.json` by default.
- Added `js/core/hgo_runtime_index.js`.
  - Pure JS index over the seed.
  - Resolves province by id, RGB, and hex.
  - Resolves state, country, owner tag, controller tag, and owner color from the seed.
  - Does not read or mutate global app state.
- Added named scripts:
  - `test:py:hgo-runtime-seed`
  - `test:node:hgo-runtime-index`
  - `verify:hgo-runtime-poc`

## Validation Evidence

- `npm run verify:hgo-runtime-poc`: passed.
  - Python seed builder tests: 11 passed.
  - Node runtime index tests: 8 passed.
  - `node --check js/core/hgo_runtime_index.js`: passed.
  - `python -m py_compile tools/build_hgo_runtime_seed.py`: passed.
- `git diff --check`: passed with only Git's package.json CRLF warning.

## Review Fixes

- Reviewer found two high severity issues before merge:
  - Shallow state parsing ignored HOI4 `history` block semantics and dated overrides.
  - Missing controller was exposed as an empty controller tag.
- Fixed by routing state ownership parsing through `scenario_builder.hoi4.parser.parse_state_file`, adding `--as-of-date`, and adding runtime/controller fallback tests.

## Merge

- Branch `codex/hgo-runtime-poc` was fast-forward merged into `main`.
- Existing dirty files in the original main worktree were unrelated and preserved.

## 2026-06-05 Preview Phase Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-hgo-runtime-preview`
- Branch: `codex/hgo-runtime-preview`
- Base commit: `40874cef`
- Main checkout still has unrelated dirty files; this worktree isolates the current implementation.
- Live process owner: main agent only.
- Current live process log: `.runtime/tests/hgo-runtime-poc-baseline.log`.
- Subagents:
  - `code-mapper`: read-only UI/renderer boundary mapping.
  - `qa-expert`: read-only acceptance and coverage review.
- Current phase target: real HGO source smoke, independent raster renderer adapter, and minimal developer preview entry.

## Preview Phase Acceptance Criteria

- Existing `npm run verify:hgo-runtime-poc` passes before and after changes.
- Real HGO smoke can write both seed and report under `.runtime/` when an HGO root is provided.
- Renderer adapter maps province RGB data to owner/controller color data without touching the current renderer lifecycle.
- Preview entry can load, render, inspect, and dispose HGO state through a small public boundary.
- UI/public-contract tests prevent non-core UI from importing renderer internals.
- `verify:pages-dist` is run if this phase changes browser-published assets or dist contracts.

## 2026-06-05 Preview Phase Implementation Notes

- Real HGO smoke now runs through `tools/build_hgo_runtime_seed.py`.
  - Output: `.runtime/hgo_runtime/seed.real.json`.
  - Report: `.runtime/reports/generated/hgo_runtime_seed_smoke.real.json`.
  - Result: `status=pass`, `states=11894`, `provinces=20782`, `mapped=20781`, `countries=1431`.
  - Owner/controller missing color count: `0`.
- HGO mod source references base-game owner/controller tags. The builder therefore accepts ordered explicit country color sources:
  - `data/palettes/hgo.palette.json`
  - `data/palettes/hoi4_vanilla.palette.json`
  HGO source country files remain the primary color source when a country file defines `color`.
- Added an independent JS HGO raster renderer adapter.
  - It renders owner or controller colors from province RGB/RGBA raster bytes.
  - It supports hit lookup through the HGO runtime index.
  - It hard-fails malformed raster dimensions and render calls after dispose.
- Added a developer-gated preview boundary.
  - Default startup path stays disabled.
  - Missing loader configuration records `unavailable` and keeps the toolbar button hidden.
  - Load failures record explicit `error`.
  - Toolbar integration is hidden outside developer mode.
  - In-flight preview loads use a generation token so stale loader completions cannot re-enable a disabled preview.
- `verify:pages-dist` generated dist copies for the new HGO runtime modules and passed `tests.test_pages_dist_startup_shell`.

## 2026-06-05 Preview Phase Validation Evidence

- `npm run test:py:hgo-runtime-seed`: passed, 19 tests.
- Real HGO smoke command: passed with the HGO source at `C:\Users\raede\Desktop\dev\mapcreator\historic geographic overhaul`.
- `npm run verify:hgo-runtime-poc`: passed.
  - Python seed tests: 19 passed.
  - Node runtime index tests: 8 passed.
  - Node raster renderer tests: 5 passed.
  - Node preview tests: 10 passed.
  - JS syntax checks and Python compile check passed.
- `node --check js\ui\toolbar.js js\core\hgo_runtime_preview.js js\ui\toolbar\hgo_runtime_preview_controller.js`: passed.
- `python -m unittest tests.test_toolbar_split_boundary_contract.ToolbarSplitBoundaryContractTest.test_toolbar_imports_new_split_modules -q`: passed.
- `npm run verify:pages-dist`: passed, startup shell tests 19 passed.

## 2026-06-05 Preview Phase Review Fixes

- Reviewer flagged stale async preview load completion after disable/dispose. Fixed with `loadGeneration` and a regression test.
- Reviewer flagged a half-connected toolbar entry when app loaders are absent. Fixed by hiding the developer-mode button until both seed and raster loaders are configured.
- Reviewer flagged untracked source/dist/test files as a submit risk. Commit preparation must add all source, dist, and test files referenced by imports/scripts/manifest.

## 2026-06-05 Preview Phase Closeout

- Implementation commit: `89d0a832`.
- Merged into `main` with a fast-forward merge after rebasing onto the current main.
- Pushed `main` to `origin`.
- Removed worktree `C:\Users\raede\Desktop\dev\mapcreator-hgo-runtime-preview`.
- Deleted local branch `codex/hgo-runtime-preview`.

## 2026-06-05 Independent Runtime Assets Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-hgo-independent-runtime`
- Branch: `codex/hgo-independent-runtime`
- Base commit: `7cfeaee9`
- Main checkout has an unrelated `.omx/metrics.json` modification. This worktree isolates the implementation.
- Live process owner: main agent only.
- Current Ralph context snapshot: `.omx/context/hgo-independent-runtime-20260605T120815Z.md`.
- Subagents:
  - `code-mapper`: read-only HGO/runtime publish-chain mapping.
  - `test-engineer`: read-only test and acceptance coverage review.
- Current phase target: checked-in HGO runtime assets, browser loader, and Pages-published dev preview using real HGO seed/raster data.

## Independent Runtime Assets Acceptance Criteria

- Build real runtime assets from `C:\Users\raede\Desktop\dev\mapcreator\historic geographic overhaul`.
- Commit `data/hgo_runtime/manifest.json`, `data/hgo_runtime/seed.json`, and `data/hgo_runtime/provinces.bmp`.
- Validate the province raster as 24-bit uncompressed BMP and record hash/size metadata.
- Keep the default renderer and scenario startup unchanged.
- Expose HGO assets only through a dedicated runtime loader and the developer-gated preview path.
- Synchronize runtime registry, data manifest, data catalog, Pages publishing, and startup shell tests in the same change.
- Run focused HGO asset tests, HGO PoC gate, manifest/catalog contracts, `verify:pages-dist`, and `git diff --check`.

## 2026-06-05 Independent Runtime Assets Implementation Notes

- Added `tools/build_hgo_runtime_assets.py`.
  - Reuses the HOI4-aware HGO seed builder.
  - Copies and validates `map/provinces.bmp` as 24-bit uncompressed BMP.
  - Writes `data/hgo_runtime/manifest.json`, `seed.json`, and `provinces.bmp`.
  - Refreshes `data/manifest.json` for HGO runtime outputs and runtime registry metadata.
- Built real HGO assets from the local HGO source.
  - Seed: `states=11894`, `provinces=20782`, `mapped=20781`, `countries=1431`.
  - Raster: `5120x2560`, `24-bit`, uncompressed BMP, `39,321,654` bytes.
  - Seed size: `9,678,303` bytes after LF-stable JSON output.
- Added `js/core/hgo_runtime_asset_loader.js`.
  - Loads HGO runtime seed and raster through `runtime_asset_registry`.
  - Decodes BMP BGR rows into the renderer's RGB raster source.
  - Handles BMP bottom-up row order and 4-byte row padding.
- Wired `js/ui/toolbar.js` so the developer-gated HGO preview receives real `loadSeed` and `loadRaster` functions.
- Added HGO runtime assets to `data/runtime_asset_registry.json`, `map_builder/contracts.py`, `data/manifest.json`, `data/CATALOG.json`, and Pages publishing.
- Raised the Pages size gate from `1050 MiB` to `1100 MiB` because the checked-in HGO runtime seed/raster add about `49.5 MiB` to the published runtime surface.
- Locked byte-level HGO runtime assets with `.gitattributes`, LF-stable JSON writers, and Pages byte-contract handling for `data/hgo_runtime/manifest.json` and `seed.json`.
- Added a preview restore callback so disabling or disposing the HGO preview triggers the default renderer to repaint the shared canvas.

## 2026-06-05 Independent Runtime Assets Validation Evidence

- `npm run test:py:hgo-runtime-assets`: passed, 22 tests.
- `npm run test:node:hgo-raster-renderer`: passed, 9 tests.
- `npm run test:py:hgo-runtime-assets-contract`: passed, 20 tests.
- `npm run verify:hgo-runtime-poc`: passed.
  - Python HGO assets: 22 tests passed.
  - HGO runtime index: 8 tests passed.
  - HGO raster/loader: 9 tests passed.
  - HGO preview: 11 tests passed.
  - Manifest/catalog contracts: 21 tests passed.
  - JS syntax and Python compile checks passed.
- `npm run verify:pages-dist`: passed.
  - Dist total size: `1090.62 MiB`.
  - Gate: `1100 MiB`.
  - Startup shell tests: 21 passed.
- `git diff --check`: passed.
- Sanity check: source and published HGO runtime manifests both match `seed.json` size `9,678,303` and hash.

## 2026-06-05 Independent Runtime Assets Review Fixes

- Reviewer flagged that Pages LF normalization could make the published `data/hgo_runtime/manifest.json` disagree with the published `seed.json`. Fixed by writing HGO runtime JSON with LF at the source, preserving HGO runtime JSON bytes in Pages dist, and adding a Pages contract that checks published HGO asset size/hash.
- Reviewer flagged missing proof that the checked-in BMP colors resolve through the checked-in seed. Fixed with a real BMP color-set contract; current raster has `20,781` unique RGB keys and `0` unresolved keys.
- Architect flagged that HGO preview shares the main canvas and needed to restore the default renderer after close. Fixed by injecting `restorePreviewTarget: render` through the toolbar preview controller and adding regression coverage.
