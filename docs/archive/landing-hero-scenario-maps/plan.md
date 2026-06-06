# Landing Hero Scenario Maps Plan

## Goal
Replace the landing hero's filter-based map variants with four real static Europe scenario maps generated from repository data.

## Scope
- Generate hero assets for `Blank`, `HOI4 1936`, `HOI4 1939`, and `TNO 1962`.
- Keep the existing lower-page `europe-1936-showcase.svg/json` asset contract.
- Update the landing hero chips to switch image source, alt text, pressed state, and `data-hero-mode`.
- Sync checked-in landing assets and packaged `dist/` assets.
- Extend pages-dist tests to cover the new public asset contract.

## Data Sources
- `data/scenarios/hoi4_1936/manifest.json`
- `data/scenarios/hoi4_1939/manifest.json`
- `data/scenarios/tno_1962/manifest.json`
- `data/scenarios/tno_1962/capital_defaults.partial.json`
- `data/scenarios/tno_1962/scenario_atlantropa.topo.json`
- `data/scenarios/tno_1962/scenario_atlantropa_metadata.json`
- `data/scenarios/blank_base/manifest.json`
- `data/europe_topology.runtime_political_v1.json`

## Live Process Ownership
The main thread owns all long or live processes for this task:
- `python -m unittest tests.test_pages_dist_startup_shell -q`
- `npm run test:node:landing-showcase-view`
- `npm run verify:pages-dist`
- localhost/browser visual inspection

Subagents may perform static review only. They must not start, poll, retry, stop, or interpret live process status.

## Phases
1. Inspect generator, data shapes, existing hero UI, and pages-dist tests.
2. Implement parameterized scenario hero asset generation.
3. Update landing hero markup, script behavior, styling, and i18n.
4. Extend tests and regenerate landing/dist assets.
5. Run verification, perform browser visual check, self-review, and archive this active task folder.
