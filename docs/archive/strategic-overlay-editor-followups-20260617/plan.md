# Strategic Overlay Editor Followups Plan

Last updated: 2026-06-17

## Goal

Move remaining Strategic Overlay editor write transactions out of `map_renderer.js` while preserving visible behavior and keeping production dependencies unchanged.

## Scope

- Operation Graphic midpoint vertex insertion.
- Special Zone membership click and drag sessions.
- Dependency Spike report for `simplify-js`, `rbush`, and `flatbush` only.

## Acceptance

- `map_renderer.js` keeps D3 binding, hit/event extraction, cursor, and render order.
- Operation Graphic midpoint insertion history/dirty/UI/render transaction lives in the Operation Graphics runtime domain.
- Special Zone membership click/drag history/dirty/UI/render transaction lives in the Strategic Overlay runtime owner.
- `package.json` production dependencies remain unchanged.
- Source and `dist/app` stay synchronized through `verify:pages-dist`.

## Validation

- `node --test tests/strategic_overlay_runtime_owner_behavior.test.mjs tests/strategic_overlay_render_owner_behavior.test.mjs`
- `py -3 -m unittest tests.test_map_renderer_strategic_overlay_runtime_owner_boundary_contract tests.test_map_renderer_strategic_overlay_render_owner_boundary_contract -q`
- `npm run test:node:renderer-splits`
- `node --check` changed JavaScript files
- `git diff --check`
- `cmd /c "set PATH=C:\Users\raede\AppData\Local\hermes\hermes-agent\venv\Scripts;%PATH%&& npm run verify:pages-dist"`
