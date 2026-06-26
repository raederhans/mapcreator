# P19 Viewport Command Owner Plan

## Scope

Extract bounded viewport zoom command wrappers from `js/core/map_renderer.js` into `js/core/renderer/viewport_command_owner.js`.

## Non-goals

- Do not modify `dist/app/**`.
- Do not modify `tools/eslint-rules/state-writer-allowlist.json`.
- Do not modify `js/core/map_renderer/public.js`.
- Do not move `updateMap`, `initZoom`, `handleResize`, `requestMapContainerResizeSync`, `fitProjection`, `setCanvasSize`, `drawCanvas`, or `renderPassToCache`.
- Do not move projection fitting, DOM setup, canvas drawing, SVG lifecycle, or resize lifecycle.

## Steps

1. [x] Confirm `origin/main` includes P18 and create isolated P19 worktree.
2. [x] Read lessons learned, registry, current viewport wrappers, owner tests, and architecture boundaries.
3. [x] Add `viewport_command_owner.js`, delegate existing host wrappers, add focused owner behavior tests, package script, and architecture checks.
4. [x] Run syntax, focused Node, dependent owner/static gates, state-write, import graph, and e2e gates.
5. [ ] Run final review/self-check, commit, push, archive docs, update registry, and clean the P19 worktree after remote confirmation.

## Validation Owner

Main Codex agent owns all live commands, dev server, browser, and e2e commands for P19. Subagents are limited to read-only static mapping, test design, and review.
