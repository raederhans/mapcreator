# City Points Render Owner Context

Last updated: 2026-06-17

## Start State

- Branch: `codex/city-points-render-owner`
- Base commit: `38d7835a`
- Worktree: `C:\Users\raede\Desktop\dev\mapcreator`
- Main checkout was clean before branch creation: `## main...origin/main`
- Live process owner: main Codex agent only
- Child agents: static inspection/review only

## Read Before Work

- `AGENTS.md`
- `lessons learned.md`
- `docs/shared/agent-tiers.md`

## Findings

- Prior render-owner lessons apply: anchor edits to functions, keep generated dist in sync through `verify:pages-dist`, and validate layer invisibility/metrics through owner behavior tests where possible.
- Current owner extraction lineage is strong: City Lights, River, Ocean, Physical, Scenario Relief, Transport Overview, Special Zone, Border Draw, Render Cache owners already exist.
- `map_renderer.js` city points responsibilities sit between city policy and label drawing:
  - `urban_city_policy.js` produces `markerEntries` and `labelEntries`.
  - `city_label_owner.js` renders labels from entries.
  - `map_renderer.js` still orchestrates render state, marker sprite cache, marker drawing, hover cache, and label pass timing.
- `drawContextMarkersPass` draws interactive city points after transport/resource markers.
- `drawLabelsPass` draws non-interactive city markers before labels.
- Draw order and hover hit priority are the main behavior risks.
- Implementation update: `city_points_render_owner.js` now owns marker sprite cache, render state, marker drawing, labels pass orchestration, and city hover probing.
- `map_renderer.js` keeps thin delegates for city points render state, marker drawing, points layer, labels pass, marker sprite facade, and city hover tooltip facade.
- `getHoveredCityEntryFromEvent` now initializes `bestPriority` inside the owner and is covered by `city_points_render_owner_behavior.test.mjs`.

## Boundary Decision

New owner owns city point render orchestration. Existing city policy and city label owners remain source-of-truth for policy and label glyph drawing.

`map_renderer.js` stays responsible for:

- stable exported facade functions
- runtime owner construction
- cross-owner dependency injection
- high-level render pass order

## Validation Matrix

- Node behavior:
  - `npm run test:node:city-points-render-owner`
  - `npm run test:node:appearance-city-points-owner`
- Python boundary:
  - `python -m unittest tests.test_map_renderer_urban_city_policy_boundary_contract tests.test_map_renderer_city_label_owner_boundary_contract -q`
- Syntax:
  - `node --check js/core/renderer/city_points_render_owner.js`
  - `node --check js/core/map_renderer.js`
- E2E:
  - `npm run test:e2e:city-rendering`
  - `npm run test:e2e:layer:smoke`
- Dist:
  - `npm run verify:pages-dist`
- Final hygiene:
  - `git diff --check`

## Open Risks

- `npm run verify:pages-dist` needs the hermes venv `Scripts` directory first in `PATH` in this shell; the script passes with that explicit PATH.
- `city_points_render_owner.js` still uses `globalThis.d3` for pointer/zoom identity parity with the old renderer path. Future cleanup can inject those d3 helpers explicitly.
- The Pages dist manifest includes stale-size corrections for two generated-ignored data files; HEAD blob sizes match the refreshed values.

## Validation Log

- `node --check js/core/renderer/city_points_render_owner.js` passed.
- `node --check js/core/map_renderer.js` passed.
- `npm run test:node:city-points-render-owner` passed, 4/4.
- `python -m unittest tests.test_map_renderer_urban_city_policy_boundary_contract tests.test_map_renderer_city_label_owner_boundary_contract -q` passed, 3/3.
- `npm run test:node:appearance-city-points-owner` passed, 6/6.
- `npm run test:e2e:city-rendering` passed, 8/8, about 3.9 minutes. Logs: `.runtime/tests/city-points-render-owner/city-rendering.*.log`.
- `npm run test:e2e:layer:smoke` passed, 4/4, about 32.3 seconds. Logs: `.runtime/tests/city-points-render-owner/layer-smoke.*.log`.
- `npm run verify:pages-dist` initially found two environment issues:
  - missing `node_modules/@playwright/test/cli.js`; repaired with `npm ci`.
  - `python` in npm script did not reliably resolve to the hermes venv; `shapely` was installed into `C:\Users\raede\AppData\Local\hermes\hermes-agent\venv`, then the command passed with `cmd /c "set PATH=C:\Users\raede\AppData\Local\hermes\hermes-agent\venv\Scripts;%PATH%&& npm run verify:pages-dist"`.
- Pages dist final pass: builder succeeded, `tests.test_pages_dist_startup_shell` passed 37 tests with 6 skipped, `landing_showcase_view_behavior` passed 6/6.
- Review follow-up: two `dist/pages-dist-manifest.json` `generated_ignored` size changes for `app/data/europe_physical.geojson` and `app/data/ru_city_overrides.geojson` were checked against `git cat-file -s HEAD:data/...`; HEAD sizes match the refreshed manifest values, so these are stale-manifest corrections from the Pages dist builder.
- Review follow-up: city owner hover priority injection was renamed from facility-specific `getFacilityEntryHitPriority` to generic `getHoverEntryHitPriority`, with `map_renderer.js` adapting the existing facility helper at injection time.
- Final short rerun after review fixes:
  - `node --check js/core/renderer/city_points_render_owner.js` passed.
  - `node --check js/core/map_renderer.js` passed.
  - `npm run test:node:city-points-render-owner` passed, 4/4.
  - `C:\Users\raede\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe -m unittest tests.test_map_renderer_urban_city_policy_boundary_contract tests.test_map_renderer_city_label_owner_boundary_contract -q` passed, 3/3.
  - `npm run test:e2e:city-rendering` passed, 8/8. Logs: `.runtime/tests/city-points-render-owner/city-rendering.final.*.log`.
  - `npm run test:e2e:layer:smoke` passed, 4/4. Logs: `.runtime/tests/city-points-render-owner/layer-smoke.final.*.log`.
  - `cmd /c "set PATH=C:\Users\raede\AppData\Local\hermes\hermes-agent\venv\Scripts;%PATH%&& npm run verify:pages-dist"` passed.
- Integration closeout:
  - Commit `6b50e479` created on `codex/city-points-render-owner`.
  - `main` fast-forward merged from `38d7835a` to `6b50e479`.
  - Post-merge `npm run test:node:city-points-render-owner` passed, 4/4.
  - Post-merge hermes Python boundary tests passed, 3/3.
  - Post-merge `git diff --check` passed.
  - `main` was pushed to `origin/main`.
