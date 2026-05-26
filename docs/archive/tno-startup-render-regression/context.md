# TNO startup render regression context

## Current state

- The worktree was dirty before this task, including unrelated docs and appearance/transport changes.
- This task used a whitelist: renderer startup political baseline code, focused tests, this doc folder, and `lessons learned.md`.
- Main thread owned live tests and browser validation.
- Browser access to `127.0.0.1:8000` was blocked by policy in the available Browser channel, so browser validation is recorded as blocked.

## Findings

- `rebuildPoliticalLandCollections()` filtered runtime-only `shell_fallback` political features through `getRuntimePoliticalBaseCollection()`.
- When the runtime collection existed but became empty after filtering, the function fell through to `primaryTopology`, which could draw modern Russia, China, and other large modern shapes over TNO scenario chunks.
- TNO bootstrap political payload contains shell fallback helper geometry, while full runtime/chunk payloads are scenario-owned data and must remain the active baseline.
- The fix keeps an active scenario-owned empty `FeatureCollection` when runtime political topology exists but visual base features are filtered away. Source ownership is checked from `runtimeTopology.objects.political`, not from the post-conversion collection.

## Agent ownership

- Main thread: implementation, tests, final verification.
- Hume subagent: read-only static test-location/risk review. No live process ownership.
- Poincare subagent: read-only final diff review. No live process ownership.
- Poincare reported no real issues in the final static review.

## Verification

- `npm run test:node:startup-hydration-behavior` passed.
- `npm run test:node:scenario-chunk-contracts` passed.
- `npm run test:node:renderer-runtime-state-behavior` passed.
- `npm run test:node:physical-layer-contracts` passed.
- `python -m unittest tests.test_main_deferred_detail_promotion_boundary_contract tests.test_startup_hydration_boundary_contract tests.test_map_renderer_render_cache_owner_boundary_contract -q` passed.
- `node --check js/core/map_renderer.js` passed.
- Browser validation remains blocked by the available Browser channel policy for `127.0.0.1:8000`.
