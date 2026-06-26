# P22 Context

## Baseline

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-p22-map-interaction-event-binding-owner`
- Branch: `codex/p22-map-interaction-event-binding-owner`
- Base: `origin/main@cb6f551a0d02e67433947bf4cc1553b52666b45f`
- P21 prerequisite: `js/core/renderer/zoom_interaction_lifecycle_owner.js` exists.

## Live Process Ownership

- Main Codex agent owns all long-running tests, dev server, browser smoke, and E2E commands.
- Subagents are read-only/static for code mapping, test advice, architecture review, and final code review.

## Findings

- Current `bindEvents()` owns all event registration in `js/core/map_renderer.js`.
- `mouseleave` cleanup mutates renderer host state and remains in `map_renderer.js` as `handleMapMouseLeave()`.
- P22 should mirror the P21 owner pattern: singleton owner getter, injected getters/helpers/handlers/effects, wrapper function near `initZoom()`.
- Implemented `createMapInteractionEventBindingOwner()` as a registration-only owner. It returns `false` when the interaction rect is absent and otherwise wires the same D3 selection, native node, window, resize observer, and browser zoom observer hooks.
- `map_renderer.js` now injects host handlers and effects through `getMapInteractionEventBindingOwner()`. Handler bodies and runtime state writes remain in the host.

## Verification Evidence

- Syntax: `node --check` passed for the new owner, `map_renderer.js`, new test, and architecture checker.
- Node: map interaction event binding owner 6/6; zoom owner 6/6; viewport command 8/8; viewport resize lifecycle 12/12; viewport read model 12/12; renderer host inventory 7/7.
- Gates: architecture boundaries passed; state-write allowlist passed with 115 tracked files; test import graph passed for 49 specs; `git diff --check` passed with Windows line-ending warnings only.
- E2E: TNO ready-state 5/5; smoke 4/4; interaction funnel 3/3; strategic overlay smoke 1/1.
- Known smoke diagnostics: local `/api/backend/auth/me` 401 and existing D3 unsafe water geometry warnings for Arctic/Southern ocean entries.
