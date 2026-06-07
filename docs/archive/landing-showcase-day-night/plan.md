# Landing Showcase Day-Night Plan

## Goal

Improve the Europe showcase Day-Night layer so it reads like a simplified product night-light rendering: darkened night territory, textured light activity, and belt-like light clusters instead of isolated dots.

## Acceptance

- The checked-in `landing/assets/europe-1936-showcase.svg` contains a visible night mask/shade, texture filter, and light belt layer.
- The Day-Night layer keeps the existing curved terminator and supports the existing showcase zoom behavior.
- The generator metadata records the Day-Night visual policy.
- `python tools/build_landing_europe_1936_showcase.py`, `python tools/build_pages_dist.py`, `python -m unittest tests.test_pages_dist_startup_shell -q`, and `node --test tests/landing_showcase_view_behavior.test.mjs` pass.
- Product diffs are committed locally without mixing `.omx/metrics.json`.

## Steps

- [x] Locate the current showcase generator, styling, and tests.
- [x] Add deterministic night shade, texture, and light belt rendering in the SVG generator.
- [x] Rebuild landing and dist assets.
- [x] Update focused tests for the new Day-Night contract.
- [x] Run verification and self-review.
- [x] Archive this task folder after completion.
