# Browser Zoom Overlay Scale Context

2026-05-31: Started from user report that browser-native zoom changes make city point overlay scale once and then fail to restore after zooming back. Main thread owns live browser/dev-server validation; subagents only do static analysis and test strategy.

2026-05-31: Official docs check: page zoom affects `window.devicePixelRatio`; MDN recommends watching DPR with a `(resolution: ...dppx)` media query and recreating the query after each change. Visual viewport resize covers visual viewport zoom/scroll changes.

2026-05-31: Static mapping so far: `setCanvasSize()` already reads DPR, resizes canvas backing stores, clears texture pattern/noise caches, invalidates render passes, and marks hit canvas dirty. City points and texture go through render-pass signatures, so the main gap is stable browser zoom change detection.

2026-05-31: Implemented centralized browser zoom observation in `map_renderer.js`: a resolution media query catches `devicePixelRatio` changes and rebinds after each change; `visualViewport.resize` routes visual viewport changes into the existing resize sync. Added a separate `browser-dpr-change` path that forces DPR invalidation even when runtime DPR remains capped at 1.

2026-05-31: Validation passed. `npm run verify:pages-dist` passed, `python -m unittest tests.test_frontend_render_boundary_contract -q` passed, city-points/texture owner Node tests passed, and `.runtime/tmp/browser-zoom-overlay-smoke.mjs` confirmed 100% -> 90% -> 100% returns to baseline canvas dimensions.

2026-05-31: Reviewer found a coalescing bug: `browser-dpr-change` could occupy the shared RAF and swallow a same-frame `visual-viewport-resize`. Fixed by storing `pendingMapResizeReason` and upgrading pure DPR refresh to full resize when a viewport/layout reason arrives in the same frame. Removed a misleading texture history assertion from the roundtrip test.

2026-05-31: Final validation after reviewer fix passed: `npm run verify:pages-dist`; `python -m unittest tests.test_frontend_render_boundary_contract -q`; `node --test tests/appearance_city_points_owner_behavior.test.mjs tests/appearance_texture_owner_behavior.test.mjs`; `node .runtime/tmp/browser-zoom-overlay-smoke.mjs`.
