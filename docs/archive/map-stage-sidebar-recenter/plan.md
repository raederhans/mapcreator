# Map Stage Sidebar Recenter

## Plan
- [x] Trace current sidebar collapse events and renderer resize center handling.
- [x] Make collapsed sidebar layout update move the map visual center to the new map stage center.
- [x] Add or extend targeted contract tests.
- [x] Sync source/dist and verify with tests plus local browser/runtime evidence.

## Context
- User observed that after vertical sidebars collapse, the map remains visually left-shifted instead of recentering in the newly available stage.
- Prior performance change introduced sidebar layout start/refresh events; this task should preserve the non-janky resize path while correcting final center.
- Found that `setRenderPhase("interacting")` can update canvas size before `handleResize()` reaches its own `setCanvasSize()` call. The resize handler then returned early, so projection fit and zoom reset did not run after the sidebars settled.
- Fix keeps the interactive resize path, but treats a size change made during phase setup as a real resize. After `fitProjection()`, sidebar/container resize uses projected content bounds to center the fit horizontally.
- Browser measurement after the fix: collapsed stage width 1204px, map content center 600px, stage center 602px. Expanded stage width 622px, map content center 310px, stage center 311px.
