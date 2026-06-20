# Parent WIP Docs Cleanup Context

## 2026-06-20 Start

- Branch: `codex/parent-wip-docs-cleanup`.
- Base: `origin/main@73e64166`.
- Parent checkout: `C:\Users\raede\Desktop\dev\mapcreator`, branch `main@c96af211`, behind `origin/main` by 7 commits.
- Parent WIP backup: `.runtime/cleanup-backups/parent-wip-classification-20260620T140804Z/parent-wip.patch`.

## Classification

- Parent WIP contains 47 deleted files under 17 `docs/archive/*` directories and one `lessons learned.md` edit.
- Exact path reference check for `docs/archive/data-foundation-audit` returned no matches.
- Directory-name reference check found only historical worktree-name mentions for `data-foundation-audit`, not archive path dependencies.
- Full parent patch does not apply cleanly to latest main because `lessons learned.md` changed during the TNO coverage follow-up. The docs cleanup is being replayed manually on the latest clean branch.

## Implementation

- Removed the 17 stale archive directories from the parent WIP.
- Merged the root `dist/assets/*.json` byte-contract lesson into the existing source/dist byte-contract rule.
- Kept the TNO coverage geometry-contract lesson added by the previous follow-up.
- Removed narrow duplicate lessons for registry alias tests, local Python resolution, city e2e timeout clamp, and Pages manifest line-ending byte counts.

## Verification

- Directory-name reference scan: 16 removed archive directory names have zero references; `data-foundation-audit` appears only in cleanup evidence and one historical worktree-name note.
- Exact path scan for `docs/archive/data-foundation-audit` has no pre-existing dependency.
- `git diff --check -- "lessons learned.md" docs` passed with line-ending warnings only.

## Live Process Ownership

Main Codex agent owns git operations and validation. No live tests are delegated.
