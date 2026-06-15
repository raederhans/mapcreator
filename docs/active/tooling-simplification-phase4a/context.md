# Tooling Simplification Phase 4A Context

## 2026-06-14

- Started from `origin/main` at `3d247f17387e1d6628f3776a9c9e8cfdae09d6ab`.
- Rebased onto `origin/main` at `b06e2ece00d41e48733e8a9d1995b1fcfc51fef5`
  after transport deepening landed.
- Created `codex/tooling-simplification-phase4a` in
  `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase4a`.
- Current owner: main Codex agent.
- Live process rule: no dev server, browser, Playwright, or smoke run in this
  phase; main agent owns all test commands.
- Static subagents:
  - `019ec880-2489-7250-9127-0f9685db7c40`: profile/schema validator boundary review.
  - `019ec880-5fc0-7511-a355-605c4ac7d98d`: test and adaptive routing review.

## Findings

- `tests/test_playwright_app_ready_gate_contract.py` already imports `tomllib`
  and checks the checked-in profile, so phase4A can extend the existing unittest
  entry.
- `run-smoke-browser-inspection.sh` parses the TOML into env and TSV files and
  uses defaults for missing or malformed optional data. Static validation should
  fail contract errors before shell defaults hide them.
- Existing adaptive selector keeps browser smoke profile/schema/shell files on
  `infra:browser-smoke-static-contract`.
- `lessons learned.md` warns that mixed `ops/browser-mcp/` files need explicit
  static smoke routing and that isolated worktrees should be written through the
  intended path.

## Open Items

- None for phase4A.

## Implementation Notes

- Validator placement: new `tools/browser_smoke_profile_contract.py`, imported by
  the existing `tests.test_playwright_app_ready_gate_contract` route.
- Adaptive routing placement:
  - `tools/test_route_registry.mjs` sourceRef includes the validator helper.
  - `tools/select_verification_targets.mjs` static browser-smoke support files
    include the validator helper.
  - `tests/test_e2e_structural_tooling.py` golden case includes the validator
    helper and still forbids perf/live browser-smoke commands for static profile
    changes.
- First-principles adjustment: `wheel` is validated as an integer without a
  non-negative clamp because wheel direction can be meaningful.
- Review fix: unknown fields are rejected so profile typos do not fall through
  to shell defaults.
- Review fix: live smoke now runs the validator before TOML parsing.
- Review fix: route URLs must be app-relative from `/` or absolute `http(s)`.
- Review fix: `gestures[].type` is required to match the checked-in schema.

## Delivery Package

1. Changed scope: browser smoke profile static validation and route wiring.
2. Core files: `tools/browser_smoke_profile_contract.py`,
   `ops/browser-mcp/run-smoke-browser-inspection.sh`,
   `tools/select_verification_targets.mjs`, `tools/test_route_registry.mjs`.
3. Tests/docs: `tests/test_playwright_app_ready_gate_contract.py`,
   `tests/test_e2e_structural_tooling.py`, active phase4A docs, worktree registry,
   `lessons learned.md`.
4. Commit state: committed as `16360a6f`, pushed to branch and `main`.
5. Main divergence: resolved; `main` includes phase4A.
6. Conflict risk: yellow semantic overlap with phase3 routing files; no known
   file overlap with the active phase2 worktree.
7. Verification: targeted unittest, structural unittest, selector check,
   selector JSON dry-runs, validator CLI, py_compile, adaptive dry-run,
   LF-normalized shell syntax, and diff check passed.
8. Remaining risk: direct `bash -n` on this Windows checkout reads CRLF; the
   normalized syntax check passed and Git diff check is clean.
9. Recommended next step: continue with the next tooling simplification slice.

## Closeout

- `codex/tooling-simplification-phase4a` was fast-forward merged into `main`.
- Main verification passed after merge.
- The phase4A worktree and local branch were removed.
