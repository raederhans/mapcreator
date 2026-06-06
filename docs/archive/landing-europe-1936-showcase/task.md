# Landing Europe 1936 Showcase Task

## Current Step
Completed. The landing-only Europe 1936 showcase layer is implemented, verified, and ready for merge.

## Verification Commands
- `npm run verify:pages-dist`
- Static scan for new asset references in `landing` and `dist`
- Manifest size check after Pages dist build

## Expected Deliverables
- `tools/build_landing_europe_1936_showcase.py`
- `landing/assets/europe-1936-showcase.svg`
- `landing/assets/europe-1936-showcase.json`
- Updated `landing/index.html`, `landing/styles.css`, `landing/app.js`
- Updated `tests/test_pages_dist_startup_shell.py`
- Refreshed `dist`

## Delivered
- Generator uses HOI4 1936 manifest data and Europe rail catalog data.
- SVG/JSON assets are checked in for Pages.
- Showcase buttons are fixed-height and update SVG layer state plus copy.
- English and Chinese copy are both covered by tests.
- `npm run verify:pages-dist` passed.
