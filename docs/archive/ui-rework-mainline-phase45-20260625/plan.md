# Phase4.5 UI Rework Mainline Layout Gate Plan

Last updated: 2026-06-25 16:28 UTC

## Goal

Restore `npm run test:e2e:ui-rework-mainline` as a trustworthy layout gate on current `origin/main`, without touching startup/bootstrap phase1-4 ownership files or the parent checkout docs/archive WIP.

## Constraints

- Work in clean worktree `C:\Users\raede\.codex\worktrees\mapcreator-ui-rework-mainline-phase45-20260625`.
- Base: `origin/main@9fce96593cc4ff8fa0e8616f86187a0580cb3cfc`.
- Allowed surface: `tests/e2e/ui_rework_mainline_shell_sidebar.spec.js`, direct test helpers/selectors/layout expectations, documented baseline artifacts, and narrowly scoped UI CSS/HTML/JS only if the product layout is wrong.
- Forbidden surface: `js/main.js`, phase1-4 bootstrap owner modules, scenario apply, map renderer, and state hook registry.

## Steps

1. [x] Prepare test dependencies for the clean worktree.
2. [x] Run `npm run test:e2e:ui-rework-mainline` and record failing test names, selectors, expected/actual values, and artifact paths.
3. [x] Classify each failure as product drift, product bug, selector/timing instability, or environment-specific assertion drift.
4. [x] Apply the smallest fix that preserves the real UI contract.
5. [x] Rerun `npm run test:e2e:ui-rework-mainline`.
6. [x] Run ready-state smoke, full smoke, render-runtime-binding, startup-failure-recovery, Pages dist, and dist drift checks.
7. [ ] Commit, push, archive docs, update registry, and clean temporary worktree.
