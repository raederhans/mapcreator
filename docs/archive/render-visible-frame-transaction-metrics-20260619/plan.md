# Render Visible Frame Transaction Metrics Plan

Last updated: 2026-06-19

## Goal

Complete the P1-P3 render fluidity plan on a clean branch from `origin/main@d1faea1f`.

## Acceptance Criteria

- P1: visible-frame continuity events are exposed as a coherent transaction metric surface covering committed frames, reused last-good frames, rejected continuity frames, base fallback frames, missing visible frames, and first-visible-frame blocks.
- P2: visual fill actions record input-to-first-pixel timing and reuse the existing dirty political repaint path for immediate feedback without changing saved color contracts.
- P3: viewport-visible subset metrics are hardened so primary visible counts stay separate from full authoritative political payload counts.
- Existing behavior remains covered by targeted Node/Python tests.
- `verify:pages-dist` is run before final integration because `js/core/map_renderer.js` changes affect the Pages runtime mirror.
- Main checkout local user changes are preserved; all implementation happens in `C:\Users\raede\Desktop\dev\mapcreator-render-fluidity-p1-p3`.

## Steps

- [x] Create isolated worktree from `origin/main@d1faea1f`.
- [x] Create active docs and update worktree registry.
- [x] P1 implement visible-frame transaction metric helper and hook existing continuity points.
- [x] P2 implement fill input-to-first-pixel metric using existing partial repaint/render completion paths.
- [x] P3 harden viewport-visible subset metrics and tests.
- [x] Run targeted tests and syntax checks.
- [x] Run final Pages dist verification.
- [x] Run changed-file simplification/review gate and fix findings.
- [x] Commit, push, integrate to main, archive docs, and clean worktree.

## Live Process Ownership

Main Codex agent owns all live tests, build commands, dev server or browser work, and final integration commands. Child agents may perform static code mapping, test strategy, and review only unless a later task explicitly assigns a disjoint write scope.
