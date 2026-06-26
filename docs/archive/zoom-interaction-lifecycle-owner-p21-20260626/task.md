# P21 Zoom Interaction Lifecycle Owner

## Objective

Move the `initZoom()` interaction lifecycle from `js/core/map_renderer.js` into `js/core/renderer/zoom_interaction_lifecycle_owner.js`.

## Scope

- Add `createZoomInteractionLifecycleOwner`.
- Keep `map_renderer.js` as the orchestration host with an `initZoom()` wrapper.
- Keep `updateMap`, `bindEvents`, viewport command wrappers, resize lifecycle, canvas/SVG/projection ownership, `drawCanvas`, and `renderPassToCache` in `map_renderer.js`.
- Do not modify `dist/app/**`, `tools/eslint-rules/state-writer-allowlist.json`, or `js/core/map_renderer/public.js`.

## Acceptance

- `initZoom` behavior remains equivalent for start, zoom, end, pending frame flush, target binding, double-click zoom disable, reset-to-fit, and constraint enforcement.
- New owner has behavior tests and architecture boundary coverage.
- Main thread owns all live browser/dev-server/e2e validation.

## Status

Ready for functional commit. Final validation and review are recorded in `context.md`.
