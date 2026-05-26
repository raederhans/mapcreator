# Context

- Starting point: `main` at `8a2a49b`, synchronized with `origin/main`.
- Remaining worktrees are dirty or active: `0a63`, `c7af`, `mapcreator-data-foundation-audit`, `mapcreator-data-foundation-main-merge`, and `mapcreator-tno-color-policy-fix`.
- `.omx/metrics.json` in the main checkout is local runtime noise and should not be committed.

## Progress

- Compared all five dirty worktrees against current `main`.
- Kept and reimplemented `0a63` bathymetry/relief fixes on current files.
- Discarded `c7af` because current import funnel already carries the import-audit contract.
- Discarded both data foundation worktrees because their branch commits are already in `main` and only line-ending dirty state remained.
- Kept only the useful `color_policy` line from `tno-color-policy-fix`; avoided the old worktree's large stale generated-data and builder diff.
- Verification passed for JS/Python syntax and targeted unit tests listed in `plan.md`.
- Read-only review found two issues: a stale static TNO color override list and color save payload carrying unsaved name edits. Both were removed; retest passed.

## Next

- Archive this task folder, commit, and push.
