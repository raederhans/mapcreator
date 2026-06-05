# Context

## 2026-06-05 intake

- `main` is checked out at `C:/Users/raede/Desktop/dev/mapcreator`.
- `git fetch origin --prune` completed.
- `git status --short --branch` shows `main...origin/main` with dirty source/docs/test/dist and `.omx/metrics.json`.
- Additional worktrees found:
  - `C:/Users/raede/Desktop/dev/mapcreator-belarus-fragment-interaction` on `codex/belarus-fragment-interaction`.
  - `C:/Users/raede/Desktop/dev/mapcreator-datatab-legend-workflow` on `codex/datatab-legend-workflow`.
  - `C:/Users/raede/Desktop/dev/mapcreator-render-chain-improvement` on `codex/render-chain-improvement`.
  - `C:/Users/raede/Desktop/dev/mapcreator-render-perf-eval` on `codex/render-performance-benchmark-eval`.
- Static status checks show the four additional worktrees have clean working directories. Their branches still need commit/diff classification against `main`.
- Main-thread owns all live verification.

## Current Risk Notes

- `main` dirty state includes `js/ui/toolbar/hgo_runtime_preview_controller.js`, matching `dist/app` file, `dist/pages-dist-manifest.json`, HGO tests, pages dist startup shell test, docs archive moves, `lessons learned.md`, and `.omx/metrics.json`.
- `.omx/metrics.json` is runtime state and should be preserved locally without mixing into product commits unless later evidence changes that judgment.
