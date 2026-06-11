# Appearance Postmerge Audit Plan - 2026-06-11

## Goal

Review commit `440a6739` after merge to `origin/main`, fix confirmed defects, and verify the Physical intensity-field pilot stays aligned across source, history, save/load, renderer, and checked-in Pages output.

## Constraints

- Keep the dirty parent checkout untouched.
- Use `C:\Users\raede\Desktop\dev\mapcreator-hgo-postmerge-audit` as the isolated audit worktree.
- Main thread owns live tests, builds, and dist verification.
- Subagents are read-only static review lanes.
- If source or `dist/app` changes, run `npm run verify:pages-dist`.

## Acceptance

- Confirmed review findings are fixed with the smallest scoped changes.
- Relevant targeted tests pass.
- `verify:state-write-allowlist`, `verify:pages-dist`, and `git diff --check` pass if code changes touch the Physical/source-dist surface.
- Final report lists completed steps, remaining work, and recommended next action.

## Task List

- [x] Confirm clean isolated worktree.
- [x] Read `lessons learned.md` and agent tier guidance.
- [x] Review latest commit and collect independent static findings.
- [x] Fix confirmed issues.
- [ ] Run targeted verification.
- [x] Run final review/bug pass.
- [ ] Commit, push, and clean worktree when fixes are complete.
