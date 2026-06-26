# P20 Viewport Resize Lifecycle Owner Plan

## Classification

- Grade: complex.
- Live process owner: main Codex agent only.
- Subagents: static code mapping, test design, architecture review, and final code review.
- Base: `origin/main@d2171b5fec0f78557736bf456416c1691925e204`.

## Goals

1. Move resize and DPR lifecycle scheduling handles from `js/core/map_renderer.js` into `js/core/renderer/viewport_resize_lifecycle_owner.js`.
2. Keep renderer wrapper names and host side effects in `map_renderer.js`.
3. Preserve current resize/DPR behavior: RAF coalescing, 120ms container debounce, 360ms spatial refresh, DPR media-query rebind, visualViewport listener, and interactive layout phase handling.
4. Add focused owner behavior tests, architecture boundary checks, and selector routing coverage.
5. Verify targeted Node/static gates plus main-thread E2E gates.

## Non-Goals

- Do not modify `dist/app/**`; Pages dist sync is a downstream gate after P20.
- Do not modify `tools/eslint-rules/state-writer-allowlist.json`.
- Do not modify `js/core/map_renderer/public.js`.
- Do not migrate DOM/canvas/SVG/projection ownership.
- Do not migrate `initZoom`, `updateMap`, `drawCanvas`, or `renderPassToCache`.

## Steps

- [x] Confirm P18/P19 artifacts exist on latest `origin/main`.
- [x] Create isolated P20 worktree from latest `origin/main`.
- [x] Register worktree and active docs.
- [x] Map current resize/DPR lifecycle implementation and host effects.
- [x] Implement `viewport_resize_lifecycle_owner.js`.
- [x] Delegate wrappers from `map_renderer.js`.
- [x] Add owner behavior tests and package script.
- [x] Extend architecture boundary checker and selector routing.
- [x] Run full verification matrix.
- [x] Review for simpler/safer implementation.
- [x] Commit, push, archive docs, update registry, and clean the worktree.
