# Landing Alive Cartography Context

## 2026-06-06

- User approved full execution in one pass.
- Priority is visual identity first.
- Hero truth model is brand-style code-driven cartography animation.
- App fixes are bounded to appearance/transport visible screenshot blockers.
- Worktree created at `C:\Users\raede\Desktop\dev\mapcreator-landing-alive-cartography`.
- Main worktree has unrelated dirty `.omx/metrics.json`, `README.md`, and `README.zh-CN.md`; leave them alone.
- Existing appearance/transport followup worktree has unrelated dirty work; keep this task isolated.
- Subagent A recommended generating `landing/assets/hero-cartography.svg` from `data/europe_topology.json`; `build_pages_dist.py` copies landing assets automatically.
- Subagent B recommended reusing `landing/app.js` tabs/reveal/i18n functions and adding only thin interaction helpers.
- Subagent C found weak screenshot assets in existing webp files; prefer generated SVG assets before touching app code.
- Final review found and fixed: showcase responsive single-column behavior, Japan cities source priority, dist manifest asset assertions, and LF-stable generated SVG writes.
- Browser visual QA attempted through Computer Use after user allowed it; Windows automation returned `Computer Use native pipe path is unavailable`, so no screenshot evidence was captured in this turn.
- Verified publish contract with `npm run verify:pages-dist`; it rebuilt `dist/` and ran 25 pages-dist tests successfully.
- 2026-06-06 doc hygiene pass confirmed the landing work is already on `main` via `e8de45bc` and merge commit `10339b14`; the old isolated worktree path is gone, so this task record is ready for archive.

## Live Process Ownership

- Main agent owns all live tests, browser QA, and pages-dist builds.
- Subagents are read-only/static unless explicitly reassigned.
