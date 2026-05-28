# Review transport sidebar entry plan

## Goal

Review the transport sidebar entry migration, fix confirmed regressions, and push a follow-up commit.

## Tasks

- [x] Review the previous transport sidebar entry diff.
- [x] Fix the empty top workspace utility group left behind by moving the transport entry.
- [x] Mirror the fix into packaged `dist/app`.
- [x] Update focused contracts.
- [x] Run targeted verification.
- [x] Archive this record after verification.

## Acceptance

- The top workspace utility group is hidden until developer mode needs its fallback entry.
- The transport entry remains in the Project sidebar.
- Source and dist stay mirrored.
- Targeted unit/static checks pass.
