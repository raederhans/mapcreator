# HGO Projection Audit Plan

## Goal
Review the HGO projection changes, repair real defects, prove the fix with targeted tests and distribution checks, then merge and push the result to `main`.

## Acceptance Criteria
- Static review covers the HGO projection commit and any newer mainline drift.
- Confirmed issues receive targeted source, dist, and test updates.
- Verification passes:
  - `npm run test:node:hgo-raster-renderer`
  - `npm run verify:hgo-runtime-poc`
  - `npm run verify:pages-dist`
  - `git diff --check`
- Final review confirms no remaining merge-blocking defects in the changed files.
- Worktree is merged back to `main`, pushed, and removed.

## Steps
- [x] Inspect prior HGO projection diff and current main drift.
- [x] Run parallel static review for cache/projection/rendering risks.
- [x] Fix confirmed bugs with focused tests.
- [x] Sync `dist/app` and run verification.
- [x] Run final review and first-principles simplification check.
- [x] Prepare branch for `main` merge; final merge, push, and worktree cleanup are recorded in the final report.

## Live Process Ownership
Main agent owns all tests/builds and status polling. Subagents may read code and completed logs only.
