# Right Sidebar Collapse Plan

## Goal
- Add a right-edge collapse control for the inspector sidebar.
- Collapse should animate smoothly to the right and let the map stage use the freed width.
- Keep the sidebar content readable while open and hidden from focus while collapsed.

## Tasks
- [x] Locate the app shell layout, right sidebar markup, and sidebar event binding.
- [x] Add the collapse button and persisted UI state.
- [x] Add CSS transitions for app layout, sidebar width, content visibility, and reduced motion.
- [x] Add targeted static contracts and run checks.
