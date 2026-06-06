# HGO Runtime Mode Plan

## Goal

Make the HGO preview behave like an explicit runtime mode for the current dev preview slice: when HGO is enabled and ready, ordinary map redraws keep the HGO raster visible, and map clicks inspect HGO pixels before the normal app hit pipeline.

## Constraints

- Keep existing app renderer, scenario data, editor, export, and project-file behavior intact.
- Keep HGO edit/write behavior out of scope for this slice.
- Preserve current dirty appearance/transport/border work in shared files.
- Main thread owns all live tests and build commands.

## Implementation Steps

1. Register HGO runtime preview hooks in the centralized state hook registry.
2. Expose render and inspect handlers from the toolbar HGO preview controller.
3. Re-render HGO after normal `map_renderer` draw frames when preview is ready.
4. Route HGO-ready clicks through HGO raster inspect before normal land/water/special hit selection.
5. Extend existing HGO node tests and targeted static contracts.
6. Sync `dist/app` through the Pages dist builder if source changes affect published files.

## Acceptance

- `npm run test:node:hgo-runtime-preview` passes.
- Relevant static syntax checks pass.
- `npm run verify:pages-dist` passes after source/dist sync.
