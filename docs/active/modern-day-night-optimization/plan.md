# Modern day-night optimization plan

## Checklist

- [x] Confirm current day/night defaults and renderer path.
- [x] Add a small cache for modern city lights static drawing so time changes only reclip/reblit.
- [x] Tune modern defaults and HTML/UI fallbacks to one source of truth.
- [x] Extend existing tests instead of creating a parallel test system.
- [x] Run targeted syntax/tests and one static review pass.
- [x] Record any durable lesson if this task reveals a reusable project rule.

## Verification

- `node --check js/core/map_renderer.js` passed.
- `node --check js/core/state_defaults.js` passed.
- `node --check js/ui/toolbar/appearance_texture_owner.js` passed.
- `node --check tests/e2e/city_lights_layer_regression.spec.js` passed.
- `npm run test:node:appearance-texture-owner` passed.
- `python -m unittest tests.test_map_renderer_render_cache_owner_boundary_contract -q` passed.
- `npm run verify:toolbar-split-boundary` passed.
- `git diff --check -- ...` passed for the task-owned files.
- `tests/e2e/city_lights_layer_regression.spec.js` could not run because `node_modules/@playwright/test/cli.js` is missing in this checkout.

## Constraints

- Keep changes narrow to day/night city lights.
- Preserve existing unrelated dirty work in the main checkout.
- Shared files are integrated serially by the main agent.
- No new dependency.
