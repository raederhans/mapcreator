# HGO Preview Projection And Base Replacement Plan

Last updated: 2026-06-18

## Objective

Fix HGO runtime preview so projected pixels outside the real Equal Earth domain stay transparent, and so HGO preview replaces the normal political/context/border/label overlays while keeping the ocean/background and physical base.

## Evidence

- `js/core/hgo_projection_model.js` maps target pixels by `projection.invert()` and lon/lat range checks only. D3 Equal Earth can clamp below-pole target pixels to latitude `-90`, so bottom off-globe pixels can map to valid-looking HGO source pixels.
- `js/core/hgo_raster_renderer.js` already treats `null` projection hits as `unknownColor` with `unprojectedPixelCount`; the missing piece is earlier rejection in the projection model.
- `js/core/map_renderer.js` draws and caches `political`, `contextBase`, `contextScenario`, `borders`, `contextMarkers`, and `labels` independently of HGO readiness. Their signatures do not carry an HGO visibility token, so stale normal-map passes can survive when HGO becomes ready.
- `js/core/renderer/render_pipeline_passes.js` draws `hgoPreview` before later context/border/marker/label passes. Later non-HGO passes can cover the preview unless they are explicitly suppressed.
- `js/core/scenario_apply_pipeline.js` can defensively fall back to previous `runtimeState.runtimePoliticalTopology` inside commit-state construction for non-blank scenarios when staged topology is not renderable. The normal prepare path rejects this earlier, but commit state should remain consistent if reached directly.

## Plan

1. Add tests for projection-domain rejection and HGO raster transparency/inspection.
2. Add renderer static contract coverage for HGO-ready signature tokens and suppressed normal overlay passes.
3. Add scenario-apply coverage that non-blank unrenderable runtime topology does not reuse stale live topology.
4. Implement projection forward round-trip validation in `hgo_projection_model.js`.
5. Suppress normal political/context/border/marker/label passes when HGO preview is ready, and include HGO visibility in their cache signatures.
6. Tighten scenario apply commit fallback so non-blank bad staged topology cannot silently reuse the previous live topology.
7. Sync `dist/app` generated copies.
8. Run targeted node/Python tests, then `verify:pages-dist`.
9. Run UltraQA scenario matrix and independent static review, then write the ready-for-integration delivery package.

## Live Process Ownership

- Main Codex agent owns all live commands: tests, build, Pages dist verification.
- Child agents may only do static review, code reading, or completed-output analysis.

## Acceptance Criteria

- HGO projection model rejects forward/invert round-trip mismatches.
- HGO raster renderer reports off-globe target pixels as unprojected and transparent.
- HGO point inspection returns `null` for off-globe target pixels.
- HGO ready state invalidates and clears normal political/context/border/marker/label passes.
- Non-blank scenario commit state does not reuse stale live `runtimePoliticalTopology` when staged topology is unrenderable.
- `dist/app` mirrors source changes and `verify:pages-dist` passes.
