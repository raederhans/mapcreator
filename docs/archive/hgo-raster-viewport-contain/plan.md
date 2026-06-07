# HGO Raster Viewport Contain Plan

## Goal

Fix the HGO developer preview distortion by drawing the checked-in HGO raster with its source aspect ratio preserved.

## Tasks

- [x] Confirm the current HGO preview stretches the raster to the shared canvas.
- [x] Add an aspect-preserving viewport contract to the HGO raster renderer.
- [x] Update HGO preview summaries and inspection tests for viewport-aware coordinates.
- [x] Run focused HGO verification and Pages dist verification if packaged files change.
- [x] Review the diff for simpler implementation and regression risk before closeout.

## Boundaries

- Keep the default scenario renderer unchanged.
- Keep HGO owner/controller/province color resolution unchanged.
- Keep the current developer-gated HGO preview entry.
- Defer real projection resampling to a later phase.

## Follow-on Base

- Scheme 2 can reuse the new viewport contract as the geometry source for a dedicated HGO preview surface or overlay lane.
- Scheme 3 can treat the checked-in HGO bitmap as the source raster, then add projection-aware inverse sampling behind the existing developer gate.
