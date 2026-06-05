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
