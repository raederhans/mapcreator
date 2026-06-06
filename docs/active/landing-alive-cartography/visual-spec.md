# Landing Alive Cartography Visual Spec

## Goal

Make the first viewport read as a cartography product before the user reads copy.

## Visual Direction

- Lead with a generated political map asset built from checked-in topology.
- Use layered map marks: boundaries, water, graticule, routes, city points, lights, and labels.
- Keep the brand palette balanced: ink, paper, teal, warm amber, clay, and controlled blue.
- Use large editorial type for the hero, compact type inside cards and controls.
- Keep motion map-native: route drawing, marker glow, subtle pan, reveal, and tab-driven image swaps.

## Implementation Contract

- Generate landing SVG assets from repository data through `tools/build_landing_hero_cartography.py`.
- Commit generated assets under `landing/assets/` so Pages serves them as static files.
- Keep interaction in `landing/app.js` thin: language, tabs, reveal, metric count-up, scroll state, hero chip state.
- Keep app workspace changes bounded to screenshot blockers found during QA.

## Acceptance Checks

- `landing/index.html` references `hero-cartography.svg` and generated preview/template assets.
- `landing/app.js` passes `node --check`.
- `python -m unittest tests.test_pages_dist_startup_shell -q` passes.
- `npm run verify:pages-dist` passes.
- Browser QA confirms first viewport, product preview, and template cards render without overlap on desktop and mobile.
