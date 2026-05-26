# Context

- Current checkout started on `codex/render-startup-appearance-cleanup`.
- `origin/main` is ahead of the feature branch, so the closeout must commit local changes first and then integrate with latest `main`.
- `.omx` files show local runtime state changes; they are tracked in this repository and must be handled deliberately so the checkout does not stay half-dirty.
- Worktree cleanup requires proof before deletion: clean working tree plus branch ancestry, or a Git-prunable broken reference.
- Removed 15 clean stale worktrees whose HEADs were already ancestors of `origin/main`, then ran `git worktree prune`.
- Preserved 5 dirty or active worktrees: current checkout, `0a63`, `c7af`, `mapcreator-data-foundation-audit`, `mapcreator-data-foundation-main-merge`, and `mapcreator-tno-color-policy-fix`.
- Dropped tracked `.omx` runtime-state changes from the staged closeout because they only recorded local session/update metadata.
