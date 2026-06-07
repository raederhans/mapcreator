# Landing Showcase Rail Clarity Plan

## Goal

Make the showcase rail layer read as a clean rail-corridor view.

## Acceptance

- Rail mode hides country labels and capital/city labels.
- Rail mode uses a thinner rail stroke than the current active stroke.
- Rail mode dims the map substrate enough for the rail corridors to stand out.
- The checked-in landing and dist SVG assets are regenerated from the same source.
- The change is committed locally.

## Tasks

- [x] Inspect the showcase SVG generator and existing landing tests.
- [x] Adjust rail-layer SVG styling.
- [x] Add tests for the rail-layer visual contract.
- [x] Rebuild landing and pages dist assets.
- [x] Run targeted tests and diff checks.
- [x] Review the diff, archive this plan, and create a local commit.

## Context

- User requested local-only development for this landing iteration, followed by a commit.
- Current branch is behind `origin/main` by one commit; this task will create a local commit on the current branch.
- `.omx/metrics.json` is runtime state and should stay out of the product commit.
- Main agent owns build and test commands for this task.

## Completion Evidence

- `python tools\build_landing_europe_1936_showcase.py` passed.
- `python tools\build_pages_dist.py` passed.
- `python -m unittest tests.test_pages_dist_startup_shell -q` passed with 33 tests.
- `node --test tests\landing_showcase_view_behavior.test.mjs` passed.
- `git diff --check -- . ':(exclude).omx/metrics.json'` passed with line-ending warnings only.
- `landing/assets/europe-1936-showcase.svg` and `dist/assets/europe-1936-showcase.svg` both contain `railGlow`, active rail stroke width `1.75`, and rail-mode label opacity `0`.
