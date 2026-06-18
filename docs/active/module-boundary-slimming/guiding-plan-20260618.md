# Module Boundary Slimming Guiding Plan

Date: 2026-06-18

## Goal

Reduce the remaining weight in the core shell by moving cross-cutting UI dependencies behind stable core contracts and runtime hooks.

## Starting Evidence

- `js/core/map_renderer.js` imported UI i18n and UI toast directly.
- Several core scenario/runtime modules imported `../ui/i18n.js` and `../ui/toast.js`.
- `js/ui/i18n.js` owned both pure translation/tooltip logic and DOM refresh/language-toggle behavior.
- `js/main.js` initialized toast UI but did not register a runtime hook for core modules to notify the UI toast surface.

## Phase Plan

1. Phase 1: Move pure i18n/catalog/tooltip logic to `js/core`, keep DOM translation refresh in `js/ui`, and route core toast calls through `showToastFn`.
2. Phase 2: Review refresh/chunk/render scheduling ownership and move reusable policy code out of the renderer shell.
3. Phase 3: Review hit/ranking/tooltip selection paths and keep public renderer facade stable.
4. Phase 4: Review sidebar/toolbar bridges and keep UI controllers as owners for DOM work.
5. Phase 5: Review backend/tooling path references and archive task docs after all phases land.

## Constraints

- Keep public UI imports compatible through `js/ui/i18n.js` and `js/ui/i18n_catalog.js`.
- Keep source and `dist/app` synchronized.
- Keep `main` untouched while the parent checkout is dirty; use the isolated worktree.
- Do not add dependencies.
- Do not move DOM or `localStorage` behavior into core.
