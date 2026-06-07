# HGO Preview Layer Context

## 2026-06-07

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-hgo-preview-layer`
- Branch: `codex/hgo-preview-layer`
- Base: `origin/main` at `884cecfa`
- Parent checkout has unrelated dirty appearance/transport work; this worktree isolates scheme 2.
- Live process owner: main agent only.
- Project lesson: HGO raster must repaint after normal `drawCanvas()` and hover/click must first use the same raster inspect mapping.

## Findings

- Latest `origin/main` already contains the basic HGO lifecycle bridge: `drawCanvas()` calls `renderHgoRuntimePreviewIfReady("draw-canvas")`, and hover/click inspect call `inspectHgoRuntimePreviewFromEvent()` before normal map hit handling.
- The remaining scheme 2 gap was testable ownership/diagnostics: the preview render summary did not expose the overlay owner, render reason, or render count, so post-draw repaint could not be asserted through the preview controller contract.
- Added `layerOwner`, `reason`, and `renderCount` to HGO preview render summaries.
- Added focused Node assertions for repeated render and toolbar reason forwarding.
- Added runtime hook boundary assertions for post-draw repaint order plus hover/click HGO inspect priority.

## Validation

- `npm run test:node:hgo-runtime-preview`: passed, 15 tests.
- `npm run test:node:hgo-raster-renderer`: passed, 12 tests.
- `python -m unittest tests.test_runtime_hooks_boundary_contract -q`: passed, 4 tests.
- `node --check js/core/hgo_runtime_preview.js js/ui/toolbar/hgo_runtime_preview_controller.js js/core/map_renderer.js`: passed.
- `npm run verify:hgo-runtime-poc`: passed.
- `npm run verify:pages-dist`: passed; rebuilt `dist/`, ran 33 startup shell tests, and ran the landing showcase Node test.
- `node .runtime/tmp/hgo_preview_layer_ultraqa.mjs`: passed; the temporary harness was removed after execution.
- Final inline UltraQA harness after the `renderPreview(null)` robustness fix: passed repeated redraw, null options, inspect, disable restore, and post-disable inspect checks.
