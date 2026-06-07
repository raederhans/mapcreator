# Landing Showcase Day-Night Context

- Current branch is `main`, ahead of `origin/main` by two local landing commits and behind by one remote commit.
- Working tree initially had only `.omx/metrics.json` as a runtime dirty file.
- Relevant generator: `tools/build_landing_europe_1936_showcase.py`.
- Relevant tests: `tests/test_pages_dist_startup_shell.py` and `tests/landing_showcase_view_behavior.test.mjs`.
- Current Day-Night implementation has `nightCycleGradient`, `terminator-line`, and point lights. It lacks a broad dark night mask and richer light-band texture.
- Live process owner for build/test commands: main agent. Subagents/static lanes may read files only if later introduced.
- Implemented a moving `nightActivityClip` so smears, belts, ambient lights, and focus lights are visible through the animated night region.
- Rebuilt `landing/assets/europe-1936-showcase.*`, `dist/assets/europe-1936-showcase.*`, and `dist/pages-dist-manifest.json`.
- Verification passed: `python tools\build_landing_europe_1936_showcase.py`, `python tools\build_pages_dist.py`, `python -m unittest tests.test_pages_dist_startup_shell -q`, `node --test tests\landing_showcase_view_behavior.test.mjs`, XML parse, and metadata quick check.
