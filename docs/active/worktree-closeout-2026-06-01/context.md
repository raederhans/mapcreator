# Worktree Closeout Context

- `main` starts at `0399a1e6`, equal to `origin/main`, with localization / Cloud Saves i18n fixes and generated dist drift.
- `codex/backend-admin-ui-preview` is checked out at `C:\Users\raede\Desktop\dev\mapcreator-backend-ui-preview`; its branch head `12884f63` is already an ancestor of `main`, but the worktree has uncommitted backend preview changes.
- `codex/tno-zoom-water-fill-repair` is checked out at `C:\Users\raede\Desktop\dev\mapcreator-tno-zoom-water-fill-repair`; it is clean and has two commits not yet ancestors of `main`.
- Pages dist manifest currently picked up a Python `__pycache__` entry, so `tools/build_pages_dist.py` was tightened to skip disposable Python cache files before regenerating dist.

## 2026-06-03 current closeout pass

- `origin/main` refreshed to `56f6d646`; local `main` starts at `3dbf3829` and is behind by 25 commits.
- Local `main` dirty content is mostly docs hygiene:
  - delete obsolete `docs/REFACTOR_ARCHITECTURE_SPLIT_AUDIT_2026-04-19.md`
  - remove completed `docs/active/transport-data-rollout/`
  - preserve `docs/archive/transport-data-rollout/research-2026-06-02.md`
  - compress `lessons learned.md`
- Runtime-only drift is excluded from product commits:
  - `.omx/metrics.json`
  - `js/core/file_manager.js` currently has no content diff, only line-ending/status noise.
- Worktree inventory after fetch:
  - `C:\Users\raede\Desktop\dev\mapcreator-live-main-20260603` is detached at `81dcfb22`; that commit is already an ancestor of `origin/main`.
  - `codex/backend-admin-ui-preview` is clean except untracked `docs/active/backend-ui-preview/`; branch commit `5a721ea1` is not an ancestor of `origin/main`.
  - `codex/tno-toponym-zh-audit` is clean; commits `d332ec59..17de2d57` are not ancestors of `origin/main`.
  - `codex/tno-zoom-water-fill-repair` is clean; commits `71b91375..417c7b27` are not ancestors of `origin/main`.
- Integration shape: replay branch commits onto latest `origin/main` rather than merging stale branch histories directly, because branch-to-origin diffs include unrelated changes from old branch bases.
- Main thread owns live tests, builds, pushes, merges, and worktree deletion.
