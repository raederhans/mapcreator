# Context

- User reported that after side vertical columns are resized and restored, the center map does not return to the centered view and remains biased to one side.
- Current browser validation through localhost is policy-limited in this session, so the primary proof path will be targeted code contracts plus source/dist synchronization.
- Live process owner: main agent only. No background browser/test owner is active.
- Root cause found in `js/core/map_renderer.js`: only window resize events drove `handleResize()`. Sidebar collapse changes the flex layout and `mapContainer` size, so the final stage size can change without a reliable final map-container resize pass.
- Fix: observe `mapContainer` with `ResizeObserver`, throttle the resize handling to one frame, and reuse the existing `handleResize()` path so projection fit, zoom reset, pan constraints, overlays, and render stay in the current owner.
- Verification so far: `node --check js/core/map_renderer.js`, `node --check dist/app/js/core/map_renderer.js`, and `python -m unittest tests.test_frontend_render_boundary_contract tests.test_ui_rework_plan02_mainline_contract tests.test_pages_dist_startup_shell -q` passed.
- Final self-review: the patch keeps the resize repair in the renderer owner, does not alter sidebar state semantics, and keeps `dist/app/js/core/map_renderer.js` synchronized with the source runtime file.
- Additional verification: `python -m unittest tests.test_map_renderer_public_contract -q` and targeted `git diff --check` passed.
