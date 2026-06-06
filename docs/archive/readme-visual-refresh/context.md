# README Visual Refresh Context

## 2026-06-06

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-readme-visual-refresh`.
- Branch: `codex/readme-visual-refresh`.
- Base: `daf692e5`, which includes `origin/main` plus the external-facing README update.
- Main checkout is kept separate; `.omx/metrics.json` remains an unrelated dirty file there.
- Generated logo candidates were preview-only under `C:\Users\raede\.codex\generated_images\019e9d4c-d63d-71a1-ab97-284839cb7748`.
- Selected logo direction: third batch A7, cropped into `docs/readme/logo-mark.png` and `docs/readme/logo-mark.webp`.
- The hand-drawn SVG attempt was rejected because it lost the original proportions and looked too rough.
- The README now uses the PNG/WebP-derived A7 logo asset. No SVG logo remains in the README assets.
- Real app screenshots were captured through the local editor at `http://127.0.0.1:8000/app/?render_profile=balanced&startup_interaction=full&startup_worker=0&startup_cache=0`.
- README assets saved under `docs/readme/`: `hero-workspace.webp`, `shot-scenario.webp`, `shot-transport.webp`, `shot-night.webp`, `shot-export.webp`, `logo-mark.png`, and `logo-mark.webp`.
- `README.md` and `README.zh-CN.md` now share the same public showcase structure: centered hero, badges, CTA, screenshot grid, core abilities, usage, workflow, feature status, collapsed capability matrix, collapsed data sources, and compact project info.
- Static checks completed: no banned Chinese module term, no manual update date, no SVG logo reference, all README image paths exist, and `git diff --check` passes with Windows CRLF warnings only.
- Read-only subagent review found one process risk: `docs/readme/` must be staged with the README files so image references do not break after commit.
- Final archive target: `docs/archive/readme-visual-refresh/`.

## Live Process Ownership

- Main agent owns local server startup, screenshot capture, and process cleanup.
- Other agents may only perform static review or inspect completed files/log snapshots.
