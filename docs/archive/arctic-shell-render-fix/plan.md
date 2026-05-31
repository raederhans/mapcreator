# Arctic Shell Render Fix Plan

## Goal

Fix the tno_1962 Russian Arctic transparent band by restoring visual political fill for load-bearing `shell_fallback` features while keeping them non-interactive.

## Acceptance Criteria

- `RU_ARCTIC_FB_*` shell fallback features can enter the political visual fill path.
- Scenario shell fallback features still cannot enter the political interaction path.
- The 73-82N Russian Arctic coverage regression is locked by an automated test.
- Existing startup/chunk/physical contracts still pass.
- Source and checked-in `dist/app` rendering code stay in sync.

## Work Plan

- [x] Verify the reported root cause in `js/core/map_renderer.js`.
- [x] Find the smallest existing test file that can cover shell visual fill and interaction exclusion.
- [x] Add a failing regression for the Russian Arctic fallback coverage.
- [x] Implement the smallest renderer-layer fix.
- [x] Sync `dist/app` when source behavior is verified.
- [x] Run targeted contract tests and source/dist parity checks.
- [x] Do final bug review and archive this folder after merge.

## Live Process Ownership

The main agent owns all tests, builds, browser checks, and long-running commands. Subagents are limited to static analysis and review.
