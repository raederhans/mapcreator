# Belarus Fragment Interaction Context

## Findings

- Belarus hybrid data is already generated at ADM2/detail level, and the visible issue is mostly detached components inside larger MultiPolygon features.
- The renderer keeps a full collection in `runtimeState.landDataFull` and a filtered interactive collection in `runtimeState.landData`.
- Drawing, hit canvas, and spatial index use `runtimeState.landData`, so pruning there changes visual/click behavior without changing source topology.
- Existing project lesson says inspector aggregation belongs in display/runtime layers while source ids remain canonical.

## Current Owner

- Main thread owns implementation and verification.
- No live browser or long-running dev server is active.
- Shared UI files are out of scope for this task.

## Decision

Use a display policy named `fragmentCamouflage` and apply it when building interactive land data. The rule keeps the largest polygon component and drops smaller components under the configured spherical-area threshold.
Scene political background merge also consumes the camouflaged `runtimeState.landData`, while `runtimeState.landDataFull` remains the unmodified data reference.

## Other Countries Scan

- Local scan found many coastal/island-heavy candidates in DK, FR, CA, US, AU, CL, and ID. These stay out of this pass because the user asked to focus on inland land fragments.
- A subagent scan found RU rayon candidates with repeated tiny detached land components. A follow-up local scan narrowed the RU policy to three Belarus-nearby inland rayon features, using a tighter 10 km2-level threshold.

## Verification

- `python -m unittest tests.test_country_feature_policies_contract tests.test_map_renderer_political_collection_boundary_contract -q`
- `npm run test:node:political-collection-fragment-camouflage`
- `npm run test:node:scenario-chunk-contracts`
- `node --check js/core/map_renderer.js`
- `npm run verify:pages-dist`
- `git diff --check`
