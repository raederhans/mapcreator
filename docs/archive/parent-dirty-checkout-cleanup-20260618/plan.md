# Parent Dirty Checkout Cleanup Plan

Status: complete
Date: 2026-06-18

## Goal

Return the parent checkout at `C:\Users\raede\Desktop\dev\mapcreator` to clean `main` while preserving every recovery path for the former dirty `codex/tno-political-color-recovery` checkout.

## Checklist

- [x] Confirm worktree list and parent status before cleanup.
- [x] Audit dirty tracked and untracked files against `origin/main`.
- [x] Classify dirty content by source: TNO renderer recovery, landing work maps, module-boundary docs, generated dist, package/test residue, and registry residue.
- [x] Save a file-level backup under `.runtime/cleanup-backups/parent-dirty-cleanup-20260618T194327Z/`.
- [x] Save a git stash with untracked files before switching branches.
- [x] Switch the parent checkout to clean `main@8f289606`.
- [x] Update `docs/active/_worktree_registry.md` with recovery references and current state.
- [x] Run docs-only verification and record remaining risk.

## Recovery References

- Former branch: `codex/tno-political-color-recovery@a4957713cb73fdfb02aa0c4d1c265377b5ceaff5`
- Current main: `8f2896060e5f3d9f461db56bdf30a0f5e1915def`
- Stash: `3a251933f031959dbe303700ed0cebd6e77486d3`
- Backup folder: `.runtime/cleanup-backups/parent-dirty-cleanup-20260618T194327Z/`
- Integrated TNO recovery branch: `origin/codex/tno-political-recovery-integration@fcd63a32ba4ed4e5eeab48288bcdf2506eb6ecca`
