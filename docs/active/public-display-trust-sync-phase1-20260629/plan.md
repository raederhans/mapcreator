# Public Display Trust Sync Phase 1 Plan

Task level: complex
Owner: main Codex agent
Live process owner: main Codex agent only
Worktree: `C:\Users\raede\.codex\worktrees\scenario-forge-phase1`
Branch: `codex/phase1-public-trust-sync`
Base: `origin/main@e0bd74b989b79184c0c25c14fdfbcf233238b559`

## First-Principles Goal

Public trust comes from one simple rule: the public page and docs must describe the product state that the repository can actually prove. The implementation should reduce drift by making data-source-backed facts testable and by keeping generated dist output synchronized with source.

## Scenario Policy

Use the existing product maturity model: 5 public baselines plus 1 HGO developer/local preview. Public baselines remain Blank Map, Modern World, HOI4 1936, HOI4 1939, and TNO 1962. HGO 1936 remains present in the runtime scenario registry, but public copy should label it as developer/local preview.

## Execution Steps

- [x] Create isolated worktree from current `origin/main`.
- [x] Read target files, lessons learned, and existing test entry points.
- [x] Patch public English and Chinese README copy.
- [x] Patch landing source copy and public stat source markers.
- [x] Add/strengthen landing stats drift tests.
- [x] Patch Pages dist hard max and manifest tests.
- [x] Add/confirm direct-open guide E2E coverage.
- [x] Rebuild checked-in dist through existing Pages dist command.
- [x] Run required verification.
- [x] Run final review/bug/first-principles self-check and independent review lanes.
- [x] Update registry delivery package.
- [ ] Commit and push branch after final staged review.
- [ ] Clean worktree after integration is confirmed.

## Validation Plan

- `python -m unittest tests.test_pages_dist_startup_shell -q`
- `npm run test:node:landing-showcase-view`
- `npm run verify:pages-dist`
- Focused Playwright guide spec when dependencies are available: `npm run test:e2e:ui-rework-support -- --grep "guide"`

## Current Risk Notes

- The new 1 GiB hard cap may fail if current generated dist exceeds it. If so, the build should fail transparently and the manifest should expose large files for follow-up pruning.
- `dist/pages-dist-manifest.json` is byte-sensitive and records itself; always regenerate through `tools/build_pages_dist.py`.
- Existing `main` checkout has unrelated docs/archive WIP, so this worktree must stay isolated until final integration.
- Current Pages payload exceeds the 1 GiB cap by 81,569,740 bytes. This is the intended Phase 1 deploy-health result: the manifest remains valid and the build fails with exact size evidence.
