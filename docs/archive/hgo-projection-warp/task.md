# HGO Projection Warp Task

## Task

Execute scheme 3 for HGO preview projection correction in a dedicated worktree, then merge the verified result back to `main`.

## Risk Checklist

- Projection mismatch: render and hit testing must use the same inverse projection.
- Source raster assumption: HGO raster is treated as lon/lat equirectangular source data.
- UI contract drift: existing HGO dev hit payload must remain compatible.
- Performance: v1 loops over canvas pixels; this is acceptable for the current proof but should stay isolated for future worker/offscreen optimization.
- Distribution: source and `dist/app` must stay synchronized.

## Verification Checklist

- [x] `npm run test:node:hgo-projection-model`
- [x] `npm run test:node:hgo-raster-renderer`
- [x] `npm run test:node:hgo-runtime-preview`
- [x] `python -m unittest tests.test_runtime_hooks_boundary_contract -q`
- [x] `npm run verify:hgo-runtime-poc`
- [x] `npm run verify:pages-dist`
- [x] `git diff --check`
