# Showcase Layer Regression Fix Plan

- [x] Create isolated worktree from current `main`.
- [x] Load skills, memory, and project lessons.
- [x] Inspect current localhost browser behavior for the selected showcase object.
- [x] Run static root-cause lanes for SVG/control code and source/dist history.
- [x] Identify the exact regression cause.
- [x] Patch the smallest responsible surface.
- [x] Verify browser behavior for political, rail, cities, and day-night layers.
- [x] Run targeted tests and `verify:pages-dist`.
- [x] Final review/bug/first-principles pass.
- [x] Archive this task folder.
- [ ] Commit, merge to `main`, push, and clean worktree.

## Acceptance Criteria

- Day-night, rail, and cities buttons visibly change the `<object>` SVG.
- The SVG keeps required interactive layers after optimization.
- Source and `dist` stay synchronized.
- `verify:pages-dist` passes.
