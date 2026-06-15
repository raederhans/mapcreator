# Tooling Simplification Phase 4A Plan

Base branch: `origin/main`
Current base commit: `b06e2ece00d41e48733e8a9d1995b1fcfc51fef5`
Worktree: `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase4a`
Branch: `codex/tooling-simplification-phase4a`
Live process owner: main Codex agent only

## Plan

- [x] Create an isolated worktree from current `origin/main`.
- [x] Read project lessons and agent tier rules.
- [x] Record phase4A in `docs/active/_worktree_registry.md`.
- [x] Add behavior-lock tests for invalid browser smoke profiles.
- [x] Implement the smallest stdlib validator.
- [x] Wire the validator into the existing static contract route.
- [x] Run targeted verification.
- [x] Do read-only review and first-principles self-check.
- [ ] Commit, push, merge to `main`, verify on `main`, and clean the worktree.

## Validation Commands

- `python -m unittest tests.test_playwright_app_ready_gate_contract -q`
- `python -m unittest tests.test_e2e_structural_tooling -q`
- `node tools/select_verification_targets.mjs --check`
- `node tools/select_verification_targets.mjs --changed-file ops/browser-mcp/inspection-profile.toml --json`
- `node tools/select_verification_targets.mjs --changed-file tools/browser_smoke_profile_contract.py --json`
- `npm run test:adaptive -- --dry-run`
- `git diff --check`

## Boundary Notes

- `ops/browser-mcp/` is mixed-domain. Profile and smoke shell files must route to
  the static browser smoke contract, while performance benchmark files keep the
  perf route.
- The shell currently has defaults for missing profile values. The validator
  should catch profile contract errors before those defaults hide bad edits.
- This phase keeps browser live execution out of scope.

## Progress

- Added `tools/browser_smoke_profile_contract.py`.
- Added a shell preflight so `run-smoke-browser-inspection.sh` validates the
  profile before parsing it into defaults and TSV files.
- Extended `tests.test_playwright_app_ready_gate_contract` with malformed profile
  cases for top-level shape, invalid modes, unknown page references, output path
  escapes, unknown fields, invalid route URLs, required gesture type, and
  quick/full budget relationships.
- Added the validator helper to browser-smoke route `sourceRef`,
  `BROWSER_SMOKE_STATIC_SUPPORT_FILES`, and structural golden cases.
- Rebasing note: phase4A was rebased from initial base `3d247f17` onto
  `origin/main` `b06e2ece` after the transport deepening commits landed.
- Verified:
  - `python -m unittest tests.test_playwright_app_ready_gate_contract -q` passed.
  - `python -m unittest tests.test_e2e_structural_tooling -q` passed after
    restoring this worktree's lockfile dependencies with `npm ci --no-audit --no-fund`.
  - `node tools/select_verification_targets.mjs --check` passed.
  - `node tools/select_verification_targets.mjs --changed-file ops/browser-mcp/inspection-profile.toml --json` selected only the static browser-smoke contract.
  - `node tools/select_verification_targets.mjs --changed-file tools/browser_smoke_profile_contract.py --json` selected only the static browser-smoke contract.
  - `python tools/browser_smoke_profile_contract.py` passed.
  - LF-normalized `bash -n ops/browser-mcp/run-smoke-browser-inspection.sh`
    passed. Direct `bash -n` on this Windows checkout hit CRLF parsing.
  - `npm run test:adaptive -- --dry-run` passed.
  - `git diff --check` passed with Windows LF/CRLF warnings only.

## Review Closure

- Read-only reviewer requested changes for unknown fields, live smoke preflight,
  route URL shape, and required gesture type.
- All requested changes were implemented and re-verified.
