# Landing Europe 1936 Showcase Plan

## Goal
Replace the static Europe showcase map on the landing page with a dedicated, source-backed Europe 1936 display layer for the homepage.

## Product Scope
- Keep this homepage-only: a lightweight presentation surface that previews a few map capabilities.
- Use real checked-in data where available: Europe political geometry, HOI4 1936 scenario state/country data, city points, and transport layers.
- Show four limited functions:
  - Political borders
  - Capitals and cities
  - Rail backbone
  - 1936 scenario changes/context

## Non-Goals
- Do not build the full editor runtime into the landing page.
- Do not introduce new dependencies.
- Do not mock production data.
- Do not change README.

## Acceptance Criteria
- `landing/assets/europe-1936-showcase.svg` is generated from repo data.
- `landing/assets/europe-1936-showcase.json` records bounded source counts and source paths for the landing display layer.
- The `#showcase` section uses the new Europe 1936 asset and offers fixed-height layer controls.
- The landing JS toggles the finite layer set and updates the displayed copy.
- Existing English/Chinese i18n remains aligned.
- Existing Pages dist contract tests are extended rather than replaced.
- `npm run verify:pages-dist` passes and refreshes `dist`.
- A read-only reviewer confirms no blocking issue before merge.

## Live Process Ownership
- Main agent owns all builds, tests, dist sync, dev-server checks, and final git integration.
- Sidecar agents are read-only unless explicitly reassigned to a disjoint write scope.

## Task List
- [x] Create isolated worktree from `origin/main`.
- [x] Read required skills, lessons, and agent tier guidance.
- [x] Start read-only sidecars for data discovery and landing/test mapping.
- [x] Inspect source data and current landing implementation.
- [x] Implement generator and generated assets.
- [x] Wire landing HTML/CSS/JS/i18n.
- [x] Extend tests.
- [x] Run `npm run verify:pages-dist`.
- [x] Run final static and review checks.
- [x] Archive this task folder.
- [ ] Merge to `main`, push, and clean worktree.
