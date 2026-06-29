# Phase 2B Pages Deployment Validation Plan

## Goal

Prove the current `main` branch can build, deploy to GitHub Pages, and serve the public demo surface after Phase 2A payload slimming and P32 renderer work.

## Scope

- Verify the current `origin/main` Pages dist on a clean worktree.
- Record the current manifest size gate evidence.
- Verify or trigger the GitHub Pages deploy workflow.
- Run the smallest public URL smoke that proves the landing page and app demo entry points work.
- Preserve Phase 2A publishing policy: five public baselines plus local-only HGO developer preview.

## Non-Goals

- README redesign.
- Landing/product narrative redesign.
- Reintroducing HGO runtime payload, Japan industrial preview GeoJSON, or the full city alias catalog into Pages.

## Checklist

- [x] Create isolated clean worktree from current `origin/main`.
- [x] Register the active worktree and live-process ownership.
- [x] Run `npm run verify:pages-dist`.
- [x] Confirm `dist/pages-dist-manifest.json` size gate and total bytes.
- [x] Commit generated manifest if verification changes only checked-in byte counts.
- [ ] Verify or trigger `.github/workflows/deploy.yml`.
- [x] Run local generated `dist/` smoke.
- [ ] Run deployed public URL smoke or record the exact tooling/deployment blocker.
- [ ] Record release-gate evidence in archive docs.
- [ ] Run focused validation commands and `git diff --check`.
- [ ] Complete review and QA gates.
- [ ] Commit, push, archive active docs, and clean the temporary worktree when safe.

## Live Process Owner

The main Codex agent owns all live build, deploy, dev-server, browser, and GitHub workflow polling commands for this task. Any review lanes stay static/read-only unless explicitly assigned a separate non-live check.
