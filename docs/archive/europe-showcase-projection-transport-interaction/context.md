# Europe Showcase Projection Transport Interaction Context

## 2026-06-06
- User reported the Europe showcase map has severe horizontal stretching, incomplete transport display, and needs limited zoom/pan interaction.
- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-europe-showcase-interaction`.
- Branch: `codex/europe-showcase-interaction`.
- Main checkout has unrelated `.omx/metrics.json` dirty file; keep it untouched.
- Main agent owns all live builds, tests, dev server, and browser checks.

## Initial Touchpoints
- `tools/build_landing_europe_1936_showcase.py`
- `landing/assets/europe-1936-showcase.svg`
- `landing/assets/europe-1936-showcase.json`
- `landing/index.html`
- `landing/app.js`
- `landing/styles.css`
- `tools/build_pages_dist.py`
- `tests/test_pages_dist_startup_shell.py`

## Implementation Notes
- Replaced independent x/y map fitting with a Lambert Azimuthal Equal-Area Europe viewport centered on 10E, 52N.
- Switched Europe rail showcase data from preview rail paths to full Europe rail shard paths.
- Rail selection now ranks clipped projected paths by visible pixel length, removes very short lines, and keeps at least 55 selected paths from each Europe rail shard before filling the global 220-line limit.
- Added a `data-showcase-viewport` SVG group so page interactions can change view state without changing generated data semantics.
- Added bounded zoom, pan, drag, wheel, and reset controls in `landing/app.js` and copied them through Pages dist.

## Verification
- `python -m py_compile tools/build_landing_europe_1936_showcase.py tools/build_pages_dist.py`
- `node --check landing/app.js`
- `python tools/build_landing_europe_1936_showcase.py`
- `npm run verify:pages-dist`
- `git diff --check`

## Current Evidence
- `landing/assets/europe-1936-showcase.json` uses `projection.name = lambert_azimuthal_equal_area`.
- Rail selected count is 220 from 516 candidates.
- Rail shard coverage is `eu_e010_e025=55`, `eu_e025_e045=99`, `eu_w012_e010=66`.
- Generated SVG size is 114803 bytes after 2px projected rail dedupe.
- Reviewer found no P0/P1 blockers. P2 wheel/touch scroll capture was fixed by requiring Ctrl/Command wheel and using `touch-action: pan-y` until zoomed.
