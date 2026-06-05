# HGO Runtime PoC Plan

## Goal

Build the first verifiable slice of a parallel HGO data/rendering path. This phase gives the project an independent HGO runtime data seed and a standalone JavaScript runtime index that existing UI or future renderers can call without depending on the current scenario data chain.

## Boundaries

- Keep the current scenario data and render lifecycle untouched.
- Do not wire UI controls or replace the active canvas renderer in this phase.
- Do not commit generated runtime output; local generated files stay under `.runtime/`.
- Use HGO source files as the source of truth for this phase.

## Deliverables

- Python builder that reads HGO source folders and writes an independent runtime seed JSON.
- JavaScript runtime module that consumes the seed and resolves province, state, country, RGB, and ownership lookups.
- Named test entries for the builder and runtime module.
- Progress notes in this folder.

## Validation

- Run the focused Python unittest for the seed builder.
- Run the focused Node test for the HGO runtime module.
- Run syntax/static checks for changed implementation files.
- Run `git diff --check`.

## Out Of Scope For This Phase

- Full map raster drawing.
- UI switcher between current system and HGO runtime.
- Dist asset publication.
- Persistent HGO cache invalidation beyond deterministic local seed generation.
