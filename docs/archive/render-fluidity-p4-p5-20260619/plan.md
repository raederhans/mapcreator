# Render Fluidity P4/P5 Plan

## Goal

Implement the remaining render-fluidity plan from `origin/main@dcd7c9d8`:

1. P4: add a staged canvas layer foundation while preserving `#map-canvas` as the composite output.
2. P4: add a political patch overlay for immediate fill/erase feedback.
3. P5: upgrade the default-off political raster worker trial to support bitmap rendering under an explicit flag.
4. P5: add targeted contracts and perf flag plumbing for bitmap worker trials.

## Execution Order

- Create the layer manager and wire it into renderer initialization and resize.
- Add patch overlay paint/clear lifecycle for pending political color edits.
- Extend worker protocol and client metrics.
- Build the political bitmap packet and worker drawing path.
- Add tests and run targeted gates, then `verify:pages-dist`.

## Live Process Ownership

Main Codex agent owns all live tests, Pages dist, perf runs, and final integration. Subagents may do static mapping or review only.

## Acceptance

- Existing `#map-canvas` tests and probes continue to work.
- Patch overlay paints before the full political pass clears pending edits.
- Worker bitmap mode is default-off and only runs with `political_raster_worker=1&political_raster_worker_bitmap=1`.
- Stale bitmap results never update the visible pass.
- Targeted Node contracts, perf gate contracts, Pages dist, and diff check pass.
