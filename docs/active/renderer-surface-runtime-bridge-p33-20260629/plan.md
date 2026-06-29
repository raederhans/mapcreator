# Scenario Forge Renderer P33 Plan

## Scope

- Base: `origin/main` at `2f78a9cffda64ea69378b789a735f7aa1ae8c426`.
- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-p33-renderer-surface-runtime-bridge`.
- Branch: `codex/p33-renderer-surface-runtime-bridge`.
- Goal: move the `initMap` surface runtimeState bridge write set into one exported state operation in `js/core/state/renderer_runtime_state.js`.

## First Principles

- `runtimeState` field writes are state ownership, so the operation belongs in `renderer_runtime_state.js`.
- `map_renderer.js` remains the composition root and passes plain handles from `rendererSurfaceHost`.
- `renderer_runtime_state.js` must stay independent of `renderer_surface_host.js`.
- No new state-writer allowlist entry is needed because `renderer_runtime_state.js` is already the state owner.

## Implementation Plan

1. Export `applyRendererSurfaceBridgeState(target, handles = {})` from `js/core/state/renderer_runtime_state.js`.
2. Replace the direct `runtimeState` bridge writes in `initMap` with one helper call after `rebuildPoliticalLandCollections()` and before `migrateLegacyColorState()`.
3. Add `tests/renderer_surface_runtime_bridge_state_behavior.test.mjs` for field mapping, null-cleared line fields, invalid targets, and source handle immutability.
4. Update lifecycle inventory and architecture boundary checks so they require the helper call and reject the old direct bridge writes.
5. Add `test:node:renderer-surface-runtime-bridge-state` to `package.json`.
6. Sync `dist/app/**` with the source changes through the Pages dist gate.

## Validation Plan

- `node --check js/core/state/renderer_runtime_state.js`
- `node --check js/core/map_renderer.js`
- `node --check tests/renderer_surface_runtime_bridge_state_behavior.test.mjs`
- `node --check tools/check_architecture_boundaries.mjs`
- `npm run test:node:renderer-surface-runtime-bridge-state`
- `npm run test:node:renderer-surface-lifecycle`
- `npm run test:node:renderer-fit-projection-lifecycle`
- `npm run test:node:renderer-runtime-state-behavior`
- `npm run python -- -m unittest tests.test_renderer_runtime_state_boundary_contract -q`
- `npm run python -- -m unittest tests.test_map_renderer_spatial_index_runtime_owner_boundary_contract -q`
- `npm run verify:architecture-boundaries`
- `npm run verify:state-write-allowlist`
- `npm run verify:test-import-graph`
- `git diff --check`
- `npm run verify:pages-dist`
- `npm run verify:dist-drift`

## Integration Notes

- Shared hot files: `js/core/map_renderer.js`, `js/core/state/renderer_runtime_state.js`, `tools/check_architecture_boundaries.mjs`, `package.json`, `dist/app/**`.
- Live process owner: main Codex thread.
- Recommended integration route: commit on the P33 branch, rebase or fast-forward onto current `origin/main`, rerun the required gates, then push `HEAD:main` if the push is a fast-forward.
