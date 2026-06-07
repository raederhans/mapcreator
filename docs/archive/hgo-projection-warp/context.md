# HGO Projection Warp Context

## 2026-06-07 Setup

- Main branch baseline: `3523f711 Make showcase night lights follow the night mask`.
- Worktree branch: `codex/hgo-projection-warp`.
- Local parent checkout has `.omx/metrics.json` runtime drift; product work is isolated in this worktree.
- Lessons applied:
  - HGO preview must bind to the normal main canvas draw lifecycle.
  - Render and inspect must share the same canvas-to-source mapping.
  - Source changes must sync to `dist/app` and pass `verify:pages-dist`.
- Live process owner: main Codex thread. Subagents may do static review only.

## Progress

- [x] Baseline and worktree created.
- [x] Projection model implemented.
- [x] Runtime preview wired.
- [x] Tests added.
- [x] Verification passed.
- [x] Review and first-principles audit completed.
- [ ] Merged back to main and pushed.

## 2026-06-07 Implementation Notes

- Added `js/core/hgo_projection_model.js` for projection inverse mapping and source raster sampling math.
- Extended `hgo_raster_renderer` with projected buffer/canvas render and projected inspect APIs.
- Runtime preview now accepts render options as an object or callback, so toolbar can read the renderer-owned projection snapshot on load, repaint, and inspect.
- `map_renderer` registers `getHgoRuntimePreviewProjectionOptionsFn` and passes the same snapshot to HGO render/inspect hooks.

## 2026-06-07 Review Fixes

- Reviewer requested changes for headless projection buffers, source projection contract drift, performance risk, and task progress sync.
- Fixed headless `renderPreview({ projection })` to call `renderProjectedToBuffer`.
- `sourceProjection` is now strict equirectangular because HGO raster sampling is lon/lat equirectangular.
- Added projected render buffer cache keyed by canvas size, projection identity/signature, transform, DPR, ownership mode, and unknown color; cached buffers are still repainted to the canvas each draw.
- Added tests for renderer cache reuse, headless projection buffer rendering, toolbar render options forwarding, and unsupported source projection labels.

## Verification Evidence

- `npm run test:node:hgo-projection-model` passed.
- `npm run test:node:hgo-raster-renderer` passed.
- `npm run test:node:hgo-runtime-preview` passed.
- `python -m unittest tests.test_runtime_hooks_boundary_contract -q` passed.
- `npm run verify:hgo-runtime-poc` passed.
- `npm run verify:pages-dist` passed after source/dist sync.
- `git diff --check` passed.
