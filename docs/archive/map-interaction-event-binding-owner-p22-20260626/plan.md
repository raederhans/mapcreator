# P22 Map Interaction Event Binding Owner Plan

## Scope

- Move map interaction event registration mechanics into `js/core/renderer/map_interaction_event_binding_owner.js`.
- Keep `map_renderer.js` as the host for click, fill, hover, brush, tooltip, resize behavior, and all `runtimeState` writes.
- Keep `dist/app/**`, `tools/eslint-rules/state-writer-allowlist.json`, and `js/core/map_renderer/public.js` unchanged.

## Acceptance Criteria

- `map_renderer.js` keeps a `bindEvents()` wrapper that delegates to the new owner.
- The owner registers the same interaction rect, window, native node, resize observer, and browser zoom observer hooks.
- The owner imports no renderer host file and contains no renderer behavior/state tokens.
- Targeted node tests, architecture/state/import graph checks, and requested interaction E2E gates pass.

## Task List

- [x] Confirm P21 is present on the `origin/main` baseline.
- [x] Create isolated P22 worktree from `origin/main`.
- [x] Record P22 active task context and live-process owner.
- [x] Implement event binding owner and renderer wrapper.
- [x] Add owner behavior tests and package script.
- [x] Extend architecture boundary checks.
- [x] Run targeted verification and E2E gates.
- [ ] Run review, fix findings, commit, push, archive docs, update registry, and clean the worktree.
