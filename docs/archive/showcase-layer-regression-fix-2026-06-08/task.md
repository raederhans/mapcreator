# Showcase Layer Regression Fix Task

## Goal

Investigate why the landing Europe showcase appears to have lost the day-night, rail, and city layer behavior, then fix the regression, verify in browser and source/dist tests, merge to `main`, push, and clean this worktree.

## Scope

- `landing/index.html`
- `landing/app.js`
- `landing/assets/europe-1936-showcase.svg`
- `dist/` mirrored landing files and assets
- Landing showcase tests and Pages dist contracts as needed

## Live Process Owner

- Main agent owns all localhost/browser/server/test processes.
- Subagents are static review and root-cause lanes only.
