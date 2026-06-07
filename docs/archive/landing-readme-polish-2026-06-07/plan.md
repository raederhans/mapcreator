# Landing + README Polish Plan

## Checklist

- [x] Inspect current landing/README asset references and existing tests.
- [x] Generate task context and assign static-only subagent review.
- [x] Convert display-only SVG assets to WebP and optimize interactive Europe SVG.
- [x] Patch `landing/styles.css` for clamp, palette, hover, reveal, and active nav styles.
- [x] Patch `landing/app.js` for hero decode gating, idle prefetch, scrollspy, and reveal cascade.
- [x] Patch `landing/index.html`, `README.md`, and `README.zh-CN.md` references/copy.
- [x] Run targeted static checks and landing tests.
- [x] Run local browser verification for desktop, tablet, mobile, reduced motion, network assets, hover, reveal, scrollspy, and hero switching.
- [x] Run final review/bug pass and fix findings.
- [x] Update lessons learned only if a durable new lesson appears.
- [x] Archive this task folder after completion.

## Validation Targets

- `node --check landing/app.js`
- `npm run test:node:landing-showcase-view`
- `npm run verify:pages-dist`
- Browser smoke on `landing/index.html` through one owned local server.
- Manual DOM/CSS checks for requested selectors and README text.

## Verification Evidence

- `node --check landing/app.js`
- `python -m py_compile tools/rasterize_landing_assets.py tools/build_pages_dist.py tools/build_landing_japan_preview.py tests/test_pages_dist_startup_shell.py`
- `npm.cmd run test:node:landing-showcase-view`
- `npm.cmd run verify:pages-dist`
- `.runtime/tmp/landing-browser-qa.cjs`: passed with no console/network failures, responsive hero font `86.4px` at 1440 and `61.44px` at 1024, reveal delays `0ms/0ms/60ms/120ms`, reduced-motion animations disabled, and all targeted WebP assets below 120 KB.
