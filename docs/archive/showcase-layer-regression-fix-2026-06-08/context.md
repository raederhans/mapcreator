# Showcase Layer Regression Fix Context

## Snapshot

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-showcase-layer-regression-fix`
- Branch: `codex/showcase-layer-regression-fix`
- Base: current `main` at worktree creation, `416d3e31 Protect HGO projection cache correctness`.
- User report: on `http://localhost:8000/`, Europe showcase looks like day-night, cities, and rail changes have rolled back.

## Constraints

- Browser inspection comes first because the user selected a live page element.
- Main agent owns live browser/server/test processes.
- Subagents must remain static.
- Source/dist sync is a hard gate.

## Progress

- [x] Worktree created.
- [x] Active task docs created.
- [x] Browser behavior inspected.
- [x] Root cause found.
- [x] Fix implemented.
- [x] Verification complete.

## Findings

- Browser DOM on the reported `localhost:8000` page showed the tabs did update the embedded SVG `data-active-layer`, but the checked-in SVG lacked `.layer-rail`, `.layer-cities`, and `.layer-day-night` wrapper classes, so the visible state looked like the political map.
- The layer implementation still existed in `tools/build_landing_europe_1936_showcase.py`; the delivery SVG was the broken surface.
- SVGO had inlined and stripped the runtime CSS/class contract during the landing asset slimming pass.

## Fix

- Rebuilt `landing/assets/europe-1936-showcase.svg` from the generator.
- Updated `tools/svgo.landing.config.mjs` to preserve group structure, runtime CSS selectors, group classes, and SVG animation elements.
- Added embedded SVG animation state sync in `landing/app.js`: day-night runs only when the day-night tab is active and reduced motion is not requested; all other states pause.
- Extended `tests/landing_showcase_view_behavior.test.mjs` to lock optimized SVG layer classes/selectors, real `animateTransform` nodes, and animation behavior.
- Rebuilt `dist` with `npm run verify:pages-dist`.

## Verification

- `npm run test:node:landing-showcase-view`: pass, 5 tests.
- `npm run verify:pages-dist`: pass, 33 Python tests plus 5 landing Node tests.
- `node --check landing/app.js && node --check dist/app.js && node --test tests/landing_showcase_view_behavior.test.mjs`: pass.
- `git diff --check`: pass.
- Browser DOM smoke on `http://localhost:4179/`: rail tab made `.layer-rail` opacity `1`; cities tab made `.layer-cities` and a sample city opacity `1`; day-night tab made `.layer-day-night` opacity `1`, `data-showcase-animation` `running`, and `animateTransformCount` `2`.
