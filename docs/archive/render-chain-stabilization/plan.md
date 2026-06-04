# Render Chain Stabilization Plan

## Goal

Stabilize the scenario render, draw, interaction, and map recolor chain from the latest `origin/main` baseline without mixing unrelated local `main` changes.

## Execution Order

- [x] Establish isolated worktree and task documentation.
- [x] Fix confirmed render correctness leaks:
  - Color refresh invalidation must stay scoped to passes that actually consume resolved land colors.
  - Water selection-only interactions must request an interaction redraw.
  - Startup visual readiness must wait for real political selection, land data, and colors.
- [x] Add or extend targeted tests through existing test entrypoints.
- [x] Run focused verification first, then `verify:pages-dist`.
- [x] Review changed files for simpler implementation and behavior regressions.
- [x] Run the next structural/performance pass: split only narrow renderer responsibilities and add measurements before dependency changes.
- [x] Final review for bugs and simpler implementation.
- [ ] Merge back to `main`, commit, push, and remove the worktree after verification.

## Acceptance

- Current dirty `main` user changes remain untouched until the controlled merge step.
- Source and `dist/app` render-chain files stay synchronized where delivery files are affected.
- Targeted Python and Node tests prove the changed behavior.
- Pages dist manifest generation is LF-stable on Windows and does not keep reintroducing platform-size drift.
- Browser/E2E checks are used only for behavior that cannot be proved through lighter tests.
- Final report lists completed phase, remaining work, changed files, tests, and risks.

## Live Process Ownership

Main thread owns all long tests, build, Pages dist verification, dev server, and browser sessions. Child agents may do static code/test review and read completed logs only.
