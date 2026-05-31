# Browser Zoom Overlay Scale Plan

## Goal

Fix browser-native zoom changes so city points and other appearance overlays redraw from the current viewport and DPR inputs every time zoom changes, including 100% -> 90% -> 100%.

## Current Plan

- [x] Read current project lessons and narrow candidate files with `rg --files`.
- [x] Confirm browser zoom / DPR behavior against official browser documentation.
- [x] Map city points, texture, and render-pass cache invalidation paths.
- [x] Add the smallest centralized DPR / visual viewport observer that routes browser zoom changes into the existing resize pipeline.
- [x] Extend existing render boundary tests for the observer and overlay invalidation contract.
- [x] Run targeted tests and `npm run verify:pages-dist`.
- [x] Review the patch for simpler failure modes, update context, and archive this folder when complete.
