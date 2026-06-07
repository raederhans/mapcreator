# Landing Showcase City Zoom Plan

## Goal

Make the showcase Cities layer reveal more city detail as the user zooms in.

## Acceptance

- Default showcase city view shows fewer labels than the current all-capitals layer.
- Zooming the embedded showcase SVG updates a city detail attribute.
- The generated SVG includes a fixed set of city labels split into visible tiers.
- Later tiers include major non-capital cities from `data/world_cities.geojson`.
- City label font and marker size become slightly smaller as detail increases.
- Landing source and checked-in dist assets stay in sync.
- The change is committed locally.

## Tasks

- [x] Inspect current showcase generator, zoom JS, and tests.
- [x] Add deterministic city-label tier selection.
- [x] Link showcase zoom state to the embedded SVG city detail level.
- [x] Update metadata and tests for the new city label contract.
- [x] Rebuild landing and pages dist assets.
- [x] Run targeted tests and diff checks.
- [x] Review the diff, archive this plan, and create a local commit.

## Context

- User requested local development and a local commit after the change.
- Current branch is already `ahead 1, behind 1` from the previous local showcase commit.
- `.omx/metrics.json` is runtime state and should stay out of the product commit.
- Main agent owns build and test commands for this task.

## Completion Evidence

- `python tools\build_landing_europe_1936_showcase.py` passed.
- `python tools\build_pages_dist.py` passed.
- `python -m unittest tests.test_pages_dist_startup_shell -q` passed with 33 tests.
- `node --test tests\landing_showcase_view_behavior.test.mjs` passed.
- `git diff --check -- . ':(exclude).omx/metrics.json'` passed with line-ending warnings only.
- `landing/assets/europe-1936-showcase.svg` and `dist/assets/europe-1936-showcase.svg` both contain `data-showcase-city-detail`, tiered `showcase-city` nodes, and `world_cities` city sources.
