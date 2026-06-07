# HGO Projection Warp Plan

Date: 2026-06-07
Owner: Codex
Worktree: `C:\Users\raede\Desktop\dev\mapcreator-hgo-projection-warp`
Branch: `codex/hgo-projection-warp`

## Goal

Replace the HGO preview's stretched raster display with projection-aware sampling so the HGO raster follows the main map projection and shares the same hit mapping.

## Scope

- Add a small projection model for converting projected canvas pixels back to HGO source raster pixels.
- Keep existing HGO runtime preview public hooks and hit payload stable.
- Default the HGO preview path to the existing D3 Equal Earth projection used by the main map.
- Preserve the legacy aspect-ratio renderer API for focused tests and future fallback analysis.
- Sync source changes into `dist/app` through the existing Pages dist builder.

## Out Of Scope

- Worker/offscreen rendering.
- User-facing projection picker.
- New external dependencies.
- Full GDAL-style reprojection pipeline.

## Steps

1. Baseline and worktree setup.
2. Implement `hgo_projection_model` and projected raster render/inspect APIs.
3. Wire runtime preview to use the main map projection.
4. Add node and contract tests for projection mapping, renderer behavior, and hook wiring.
5. Run focused verification plus Pages dist sync.
6. Run review, bug check, and first-principles simplification pass.
7. Commit, merge to `main`, push, and clean worktree.

## Acceptance

- HGO projected render samples via lon/lat inverse projection, not rectangular image scaling.
- Hover/click inspect reads the same projected source pixel as the visible preview.
- Existing hook payload still exposes `countryCode` and `hgoRuntime.ownerTag`.
- `verify:hgo-runtime-poc`, runtime hook boundary test, `verify:pages-dist`, and `git diff --check` pass.
