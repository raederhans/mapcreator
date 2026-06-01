# Landing Product Showcase Context

## Progress Log

- Started from `main` in an isolated worktree: `C:\Users\raede\Desktop\dev\mapcreator-landing-product-showcase`.
- Main checkout was ahead 1 and behind 4, with only `.omx/metrics.json` dirty.
- Best-practice research confirmed native semantic HTML plus small JS enhancement is the preferred path for this static page.
- Repo asset exploration confirmed Japan road/rail is the strongest product preview candidate.
- Live process ownership: main agent owns all builds, tests, browser checks, and `verify:pages-dist`. Subagents were read-only research lanes.
- Fixed an execution-surface mistake by moving initial landing edits from the main checkout into the isolated worktree; the main checkout returned to its pre-task dirty state.

## Current Constraints

- `landing/` is the authored source for the showcase.
- `dist/` must be regenerated through `npm run verify:pages-dist`.
- No React, Tailwind, shadcn component install, or new dependency is needed for this static page.
- Shared app files `index.html`, `css/style.css`, and `js/ui/toolbar.js` are out of scope.

## Implementation Notes

- Use static, accessible tabs for the mini preview.
- Use `<details>/<summary>` for FAQ.
- Keep data source and license/edition claims conservative because the product is still evolving.

## Closeout Notes

- Implemented the Japan mini preview with four layer tabs: transport, cities, terrain, and night-light context.
- Expanded the landing page with product modules, data foundation, edition direction, sample use cases, and FAQ.
- Updated `tests/test_pages_dist_startup_shell.py` to lock the new landing contract and stale-copy guards.
- Regenerated `dist/` through the existing pages-dist flow.
- Verified with `node --check landing\app.js`, `git diff --check`, custom i18n/ARIA checks, `npm run verify:pages-dist`, and a file-URL Playwright smoke across desktop/mobile.
- Addressed final review findings by separating current Japan road/rail proof points from future infrastructure families, reducing brittle copy-level test assertions, removing unused hero metric i18n keys, and polishing Chinese landing copy.
