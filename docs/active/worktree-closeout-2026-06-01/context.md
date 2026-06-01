# Worktree Closeout Context

- `main` starts at `0399a1e6`, equal to `origin/main`, with localization / Cloud Saves i18n fixes and generated dist drift.
- `codex/backend-admin-ui-preview` is checked out at `C:\Users\raede\Desktop\dev\mapcreator-backend-ui-preview`; its branch head `12884f63` is already an ancestor of `main`, but the worktree has uncommitted backend preview changes.
- `codex/tno-zoom-water-fill-repair` is checked out at `C:\Users\raede\Desktop\dev\mapcreator-tno-zoom-water-fill-repair`; it is clean and has two commits not yet ancestors of `main`.
- Pages dist manifest currently picked up a Python `__pycache__` entry, so `tools/build_pages_dist.py` was tightened to skip disposable Python cache files before regenerating dist.
