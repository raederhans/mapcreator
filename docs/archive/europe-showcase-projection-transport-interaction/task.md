# Europe Showcase Projection Transport Interaction Task

## Current Step
Final review, archive, merge, push, and cleanup.

## Verification Commands
- `node --check landing/app.js`
- `python -m py_compile tools/build_landing_europe_1936_showcase.py tools/build_pages_dist.py`
- Targeted `tests.test_pages_dist_startup_shell` checks
- `npm run verify:pages-dist`

## Completed
- Projection replacement implemented and generated.
- Full Europe rail source selection implemented and generated.
- Limited zoom/pan/reset interaction implemented.
- Pages dist regenerated.
- `npm run verify:pages-dist` passed.
- Hume read-only review found no P0/P1 blockers.
- P2 wheel/touch scroll capture fixed and reverified.
