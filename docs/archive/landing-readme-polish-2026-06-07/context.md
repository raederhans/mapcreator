# Landing + README Polish Context

## 2026-06-07 Intake

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-landing-readme-polish`
- Branch: `codex/landing-readme-polish`
- Parent checkout had only unrelated `.omx/metrics.json` dirty.
- Main thread owns asset generation, dev server, browser, and test runs.
- Subagents are limited to static analysis/review to avoid competing over shared landing files.
- Relevant standing lessons:
  - Static landing SVG generation should use deterministic geometry repair when generating from topology.
  - Embedded SVG object interactions should preserve page scroll.
  - Source/dist drift should be scoped and verified with `verify:pages-dist` when delivery files are touched.

## Live Process Ownership

- Current owner: main agent.
- Live processes: none.
- Browser QA script stayed under `.runtime/tmp/landing-browser-qa.cjs`.

## Progress

- [x] Created isolated worktree.
- [x] Created active task docs.
- [x] Inspect code and assets.
- [x] Implement changes.
- [x] Verify and archive.

## 2026-06-07 Implementation Notes

- Added `tools/rasterize_landing_assets.py` as the explicit landing resource generation step; `tools/build_pages_dist.py` copies committed landing delivery assets for deploy-minimal compatibility.
- Replaced display-only landing `<img>` references with generated WebP assets.
- Kept `europe-1936-showcase.svg` as the interactive `<object>` source.
- Added a static asset existence check to `tests/landing_showcase_view_behavior.test.mjs`.
- WebP outputs are all below 120 KB; Europe SVG optimized to about 132.5 KB with hidden interactive layers preserved.
- Fixed `build_landing_japan_preview.py` to manually decode clipped TopoJSON line layers before GeoJSON serialization, avoiding the previous 6.9 GiB NumPy allocation path.
- Fixed hero switching so clicking the already-loaded active chip leaves the map in `ready` state.
