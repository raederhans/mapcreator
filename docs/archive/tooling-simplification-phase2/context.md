# Tooling Simplification Phase 2 Context

## 2026-06-14

- Main checkout was clean before creating this worktree.
- Created `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase2` from `origin/main` at `fba1b710`.
- Existing unrelated worktrees were left untouched, including the currently active data-chain worktree.
- Phase 1 plan shows prior work already fixed data catalog validation and adaptive selector golden coverage.
- `lessons learned.md` highlights two relevant rules for this phase:
  - `--write-safe` scenario repair can be slow for large scenario bundles, so targeted fixtures are preferred before broad strict repair.
  - Validation paths should stay read-only unless the command explicitly owns safe repair or publish preparation.

## Current Owner Map

- Main agent owns live process execution.
- Planned child agents will be read-only static reviewers.

## Findings

- `--write-safe` precheck built an empty report before classifying risky/forbidden violations. The public repair function could run before the real strict errors were inspected.
- Existing risky repair test mocked `build_scenario_report()` and the compatibility alias `_apply_safe_repairs`, so it did not exercise the real public repair call used by `main()`.
- Fresh worktree strict inspection exposed HOI4 snapshot drift caused by CRLF bytes in the older main working tree and LF bytes in the fresh checkout. Git normalized content is the same, but the checked-in snapshot recorded the older CRLF-byte hash.
- Browser smoke tooling currently maps through the broad `perf` selector rule. A lightweight static contract route gives agents a child-safe check for smoke script/profile edits.

## Implemented

- `--write-safe` now prechecks with `inspect_scenario_contract(...)`.
- The risky repair test now mocks `inspect_scenario_contract(...)` and the public `apply_safe_scenario_contract_repairs(...)`.
- Removed one duplicated risky marker and reused a single resolved `report_path` inside `main()`.
- Synchronized HOI4 1936/1939 manifest, audit, and build snapshot fingerprints for LF/fresh checkout bytes.
- Added a browser smoke static route and profile budget/output contract.

## First-Principles Check

- The root risk was not missing fallback logic; it was the safe-repair command making a write decision before reading the real validation errors.
- The smallest stable fix is one call-site change plus a test that watches the public repair function.
- The browser smoke chain was not ready for a live-process rewrite in this phase. A child-safe static route gives agents better routing information without changing smoke execution.
- The HOI4 data diff is limited to derived fingerprints created by the existing safe repair path.

## Review Notes

- Read-only child review was attempted after verification. The reviewer did not return findings before shutdown.
- Main-thread review found no blocking issue after checking diff scope, route ownership, write-safe precheck behavior, and fresh worktree HOI4 strict validation.
- Full `--write-safe` over all scenarios was kept out of this phase because it can write many scenario directories; targeted HOI4 write-safe covered the detected fresh-checkout fingerprint drift.
