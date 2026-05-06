# Context

## Starting Facts

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-transport-icons`
- Branch: `codex/transport-facility-icons-selection`
- Main implementation surfaces:
  - `js/core/renderer/transport_overview_render_owner.js`
  - `js/core/map_renderer.js`
  - `tests/test_transport_facility_interactions_contract.py`
- The original worktree has unrelated TNO changes, so this work happens in a dedicated worktree.

## Initial Findings

- Airport and port overview markers currently draw as canvas diamond/square shapes.
- Facility hover entries currently store `screenPoint` directly from projection output inside a zoom-transformed canvas context.
- Hover/click probing uses `d3.pointer(event, mapSvg)`, so cached entries must be screen-space coordinates.
- Real global airport data has `airport_type` values such as `major`, `mid`, `military`, and `spaceport`.
- Real global port data has `legal_designation` values `international_hub`, `important`, and `local`.

## Execution Notes

- Main thread owns implementation and live tests.
- Child agents are static-only support lanes.
- Shared files are edited serially by the main thread.

