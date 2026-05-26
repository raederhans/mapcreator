# Modern day-night optimization context

## 2026-05-20 start

- Current checkout has pre-existing dirty files including `js/core/map_renderer.js`, `js/ui/toolbar.js`, `js/ui/toolbar/appearance_controls_controller.js`, `.omx/*`, docs archive/active moves, and `lessons learned.md`.
- The relevant owner is `js/ui/toolbar/appearance_texture_owner.js`; the renderer path is still in `js/core/map_renderer.js`.
- Runtime defaults in `js/core/state_defaults.js` are already lower than `index.html` initial values and several UI fallback literals.
- Performance hypothesis: modern lights redraw expensive gradient blobs every non-interactive day/night pass; manual time changes only alter night clipping, so the static modern light layer can be cached per projection/config.
- Main agent owns live tests/browser for this task. Subagents may do only static analysis.

## Implementation notes

- Added a modern city-lights static layer cache in `js/core/map_renderer.js`.
- Cache key includes canvas size, DPR, zoom transform, projection key, scenario/topology/context/city revisions, and modern city-light visual settings.
- Cache key intentionally excludes `manualUtcMinutes`, `shadowOpacity`, `twilightWidthDeg`, and solar state, so time/shadow changes can reuse the expensive static light layer.
- Reduced modern defaults: intensity `0.68`, texture opacity `0.20`, corridor strength `0.08`, core sharpness `0.64`, population boost strength `0.58`, shadow opacity `0.24`.
- Synchronized `index.html`, runtime defaults, UI invalid-value fallbacks, and E2E default config.
- HTML initial contract also caught historical defaults drifting from runtime values; historical density and retention were synced to `112%` and `46%`.

## Review and validation notes

- Main-thread self review added `contextLayerRevision` to the cache key because modern urban core entries depend on context/urban data.
- Native subagent review lanes were launched but did not return within the time box and were closed without live process ownership.
- Long Playwright city-lights regression was attempted under main ownership and logged to `.runtime/tests/day-night-modern-optimization/`; it exited immediately because `node_modules/@playwright/test/cli.js` is absent.
