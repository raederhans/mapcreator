# P17 Viewport Read-Model Owner Plan

## Scope

Extract viewport read-model helpers from `js/core/map_renderer.js` into `js/core/renderer/viewport_read_model_owner.js`.

## Non-goals

- Do not modify `dist/app/**`.
- Do not modify `tools/eslint-rules/state-writer-allowlist.json`.
- Do not modify `js/core/map_renderer/public.js`.
- Do not move DOM/canvas/SVG/projection/zoom lifecycle code.
- Do not move `updateMap`, `resetZoomToFit`, `zoomByStep`, `setZoomPercent`, `enforceZoomConstraints`, `fitProjection`, `handleResize`, or `initZoom`.

## Steps

1. [x] Create isolated worktree from current `origin/main`.
2. [x] Confirm P16 artifacts exist in the base.
3. [x] Register P17 active worktree and create active task docs.
4. [x] Add `viewport_read_model_owner.js` and delegate existing wrappers from `map_renderer.js`.
5. [x] Add focused owner behavior tests and package script.
6. [x] Extend architecture boundary checks.
7. [x] Run syntax, focused Node, architecture, state-write, import graph, and e2e gates.
8. [ ] Run final review/self-check, commit, push, archive docs, update registry, and clean worktree.

## Validation Owner

Main Codex agent owns all live commands and browser/e2e commands for P17.
