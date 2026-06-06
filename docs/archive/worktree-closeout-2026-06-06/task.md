# Worktree Closeout 2026-06-06

## Objective

Audit current local changes, commit only project-relevant closeout evidence, review registered Git worktrees, merge any necessary worktree content into `main`, and clean up worktrees proven safe to remove.

## Scope

- Current checkout: `C:/Users/raede/Desktop/dev/mapcreator`.
- Git worktrees listed by `git worktree list --porcelain`.
- Local runtime state such as `.omx/metrics.json` is reviewed separately from project/product changes.

## Stop Conditions

- `main` is aligned with `origin/main` before closeout.
- All registered Git worktrees are classified.
- Runtime-only local state is preserved outside the project commit path.
- Closeout evidence is committed and pushed.
