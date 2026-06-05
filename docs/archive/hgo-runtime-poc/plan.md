# HGO Runtime Preview Plan

## Goal

Build the next verifiable slice of the parallel HGO data/rendering path. This phase proves a real HGO source smoke path, introduces an independent raster renderer adapter, and exposes a gated developer preview entry without replacing the current default renderer.

## Boundaries

- Keep the current scenario data and render lifecycle untouched.
- Keep the current renderer as the default startup path.
- Do not commit generated HGO runtime output; local generated files stay under `.runtime/`.
- Keep UI integration minimal and developer-gated.
- Do not publish `data/` or `dist/app` HGO runtime assets until the seed size and Pages contract are verified.
- Use HGO source files as the source of truth for this phase.

## Deliverables

- Real HGO source smoke option that writes a seed plus summary report under `.runtime/`.
- JavaScript HGO raster renderer adapter with deterministic province color mapping and hit lookup.
- Minimal developer preview controller/facade that can load, render, inspect, and dispose HGO preview state.
- Named focused test entries for the smoke path, renderer adapter, and preview boundary.
- Updated progress notes in this folder.

## Execution Status

- Real HGO smoke path is implemented and verified against the local HGO source.
- HGO raster renderer adapter is implemented and covered by focused Node tests.
- Developer-gated preview boundary and toolbar entry are implemented and covered by focused tests.
- Pages dist output is regenerated and verified for this phase.
- Full user-facing HGO renderer replacement remains a later phase.

## Phase 3: Independent Runtime Assets

Goal: move the proven HGO source slice from `.runtime/` into a checked-in, browser-published runtime asset lane without changing the default scenario renderer.

Deliverables:

- `data/hgo_runtime/manifest.json` records the real seed and raster assets with size/hash metadata.
- `data/hgo_runtime/seed.json` is built from the local HGO source through the existing HOI4-aware seed builder.
- `data/hgo_runtime/provinces.bmp` is copied from the real HGO source and validated as 24-bit uncompressed BMP.
- `runtime_asset_registry`, `data/manifest.json`, `data/CATALOG.json`, Pages publishing, and startup shell tests agree on the new HGO runtime assets.
- Browser-side HGO loader can read the seed and decode the province BMP for the dev preview path.
- Toolbar dev preview uses the loader when assets are published, while the default renderer stays unchanged.

Phase 3 boundaries:

- No user-facing renderer replacement.
- No editor/export/project-file support for HGO mode.
- No broad toolbar redesign.
- No dependency changes.
- Live build/test owner remains the main agent.

Phase 3 status:

- Checked-in HGO runtime assets are built, published, and verified.
- Developer-gated preview now loads real checked-in HGO seed/raster assets.
- Runtime registry, data catalog, data manifest, Pages dist, and startup shell contracts are synchronized.
- Worktree has been merged, pushed, and cleaned.

Phase 3 validation:

- `npm run test:py:hgo-runtime-assets`
- `npm run test:node:hgo-raster-renderer`
- `npm run test:node:hgo-runtime-preview`
- `npm run verify:hgo-runtime-poc`
- `python -m unittest tests.test_data_manifest_contract tests.test_data_catalog_contract -q`
- `npm run verify:pages-dist`
- `git diff --check`

## Post-Closeout Review Plan

Goal: audit the merged HGO runtime lane for state and publish-contract regressions before starting the next HGO phase.

Status:

- Code review completed with one HGO preview state finding.
- Developer-mode-off preview cleanup is fixed in the toolbar preview controller.
- HGO Pages startup-shell required paths now reuse the build publish list.
- Regression coverage and HGO/Pages verification passed.

## Validation

- Run the existing HGO PoC gate before and after changes.
- Run the focused Python unittest for the seed builder.
- Run the focused Node test for the HGO runtime module.
- Run focused Node tests for the raster renderer adapter and preview boundary.
- Run syntax/static checks for changed implementation files.
- Run `verify:pages-dist` if this phase changes `data/`, runtime registry, or `dist/app` contracts.
- Run `git diff --check`.

## Out Of Scope For This Phase

- User-facing full renderer replacement.
- Full scenario/editor/export support for HGO mode.
- Checked-in generated seed or raster payloads.
- Broad toolbar/sidebar redesign.
