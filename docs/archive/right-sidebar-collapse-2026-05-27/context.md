# Right Sidebar Collapse Context

- User requested a small mid-height button on the left edge of the right sidebar.
- The animation should be smooth and the center canvas should adapt to the freed space.
- Live browser inspection is not owned by this turn; verification will use targeted source contracts and syntax checks.
- Implemented with `#rightSidebarCollapseBtn`, `#rightSidebarContent`, `body.right-sidebar-collapsed`, and a persisted `map_right_sidebar_collapsed` preference.
- The collapse action dispatches `resize` and calls `render()` at animation start and after the transition so the map can resize to the freed width.
