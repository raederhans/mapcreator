# TNO Zoom Fill and Water Region Repair

## Goal

Fix two verified TNO rendering bugs:

- During zoom interaction, political fills can disappear while SVG borders and physical terrain remain visible.
- Great Lakes and Caspian Sea are absent from the TNO exclusive water-region data surface.

## Execution Plan

1. Keep work isolated on `codex/tno-zoom-water-fill-repair`.
2. Capture a minimal runtime snapshot for zoom composite rejection before editing renderer behavior.
3. Add a narrow interaction continuity path that reuses a complete cached composite only when the only mismatch is selection/topology revision drift during interaction.
4. Add six explicit base-geography water regions to the TNO water build path: `caspian_sea`, `lake_superior`, `lake_michigan`, `lake_huron`, `lake_erie`, and `lake_ontario`.
5. Rebuild water-related TNO outputs with the existing bundle pipeline.
6. Extend targeted renderer and TNO water tests.
7. Run targeted verification, focused browser/runtime checks, and `verify:pages-dist`.
8. Archive this folder after final self-review and successful completion.

## Boundaries

- Do not change README.
- Do not switch TNO to combined water mode.
- Do not mix old and new render-pass canvases during interaction.
- Main thread owns live processes: dev server, browser checks, bundle rebuilds, and long tests.
