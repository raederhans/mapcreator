# Tooling Simplification Phase 3 Plan

## Cleanup Plan

Smell: browser smoke support files currently share the broad `perf` selector domain, so adaptive routing can pull in live perf gates for static smoke script/profile edits.

Order:

1. Confirm repository state, active worktrees, and phase boundaries.
2. Create phase3 docs and context snapshot.
3. Add a regression lock proving browser smoke tooling selects the static smoke contract and excludes live perf gate commands.
4. Change only route metadata and selector domain matching needed to satisfy the lock.
5. Run targeted validation.
6. Run read-only review plus first-principles self-check.
7. Commit, push, merge to `main`, verify on `main`, and remove this worktree.

## Acceptance Criteria

- `ops/browser-mcp/run-smoke-browser-inspection.sh` and `ops/browser-mcp/inspection-profile.toml` select `python -m unittest tests.test_playwright_app_ready_gate_contract -q`.
- The same change set does not select `perf:gate`, `verify:perf-gate-contract`, or `python -m unittest tests.test_perf_gate_contract -q`.
- `npm run test:adaptive -- --dry-run` still works.
- Public commands remain compatible:
  - `npm run test:adaptive`
  - `npm run test:adaptive:execute`
  - `node tools/select_verification_targets.mjs --check`

## Validation Commands

- `python -m unittest tests.test_e2e_structural_tooling -q`
- `python -m unittest tests.test_playwright_app_ready_gate_contract -q`
- `node tools/select_verification_targets.mjs --check`
- `node tools/select_verification_targets.mjs ops/browser-mcp/run-smoke-browser-inspection.sh ops/browser-mcp/inspection-profile.toml --json`
- `npm run test:adaptive -- --dry-run`
- `git diff --check`

## Progress

- [x] Created isolated phase3 worktree from `origin/main`.
- [x] Read `lessons learned.md` and `docs/shared/agent-tiers.md`.
- [x] Located current browser smoke over-selection path.
- [x] Created phase3 task, plan, and context docs.
- [x] Launch read-only review agents.
- [x] Add behavior lock.
- [x] Implement minimal route split.
- [x] Run targeted validation.
- [x] Review and self-check.
- [x] Commit, push, merge, verify on main, and clean worktree.

## Validation Log

- 2026-06-14: `python -m unittest tests.test_e2e_structural_tooling.E2eStructuralToolingContractTest.test_verification_selector_golden_cases_for_adaptive_routing -q` failed before the route split because browser smoke changes selected `perf:gate`, `verify:perf-gate-contract`, and `python -m unittest tests.test_perf_gate_contract -q`.
- 2026-06-14: The same targeted golden test passed after splitting the `browser-smoke` domain.
- 2026-06-14: `python -m unittest tests.test_e2e_structural_tooling.E2eStructuralToolingContractTest.test_route_registry_includes_every_package_test_node_script -q` passed.
- 2026-06-14: `node tools/select_verification_targets.mjs ops/browser-mcp/run-smoke-browser-inspection.sh ops/browser-mcp/inspection-profile.toml --json` selected only `python -m unittest tests.test_playwright_app_ready_gate_contract -q`, with `browser-smoke`, `child-safe`, and no resource locks.
- 2026-06-14: Read-only selector review found the directory-level `ops/browser-mcp/` rule still mixed smoke support files with perf benchmark files. The selector was tightened to an explicit browser-smoke support file set plus an explicit perf benchmark support file.
- 2026-06-14: `python -m unittest tests.test_e2e_structural_tooling.E2eStructuralToolingContractTest.test_verification_selector_golden_cases_for_adaptive_routing -q` passed after adding `inspection-profile.schema.md`, exact command, exact owner, exact lock, and exact main-thread assertions.
- 2026-06-14: `node tools/select_verification_targets.mjs ops/browser-mcp/run-smoke-browser-inspection.sh ops/browser-mcp/inspection-profile.toml ops/browser-mcp/inspection-profile.schema.md --json` selected only `python -m unittest tests.test_playwright_app_ready_gate_contract -q`, with `browser-smoke`, `child-safe`, no locks, and no main-thread serial verification.
- 2026-06-14: `python -m unittest tests.test_e2e_structural_tooling -q` initially failed because this new worktree lacked `@playwright/test`; `npm ci --ignore-scripts` installed lockfile dependencies with no tracked dependency changes.
- 2026-06-14: `python -m unittest tests.test_e2e_structural_tooling -q` passed: 28 tests in 4.526s.
- 2026-06-14: `python -m unittest tests.test_playwright_app_ready_gate_contract -q` passed: 5 tests in 0.002s.
- 2026-06-14: `node tools/select_verification_targets.mjs --check` passed: route schema check passed for 136 routes.
- 2026-06-14: `npm run test:adaptive -- --dry-run` passed: adaptive selection planned 4 commands, dry-run only.
- 2026-06-14: `node tools/select_verification_targets.mjs ops/browser-mcp/editor-performance-benchmark.py --json` confirmed the perf benchmark file still selects perf routes.
- 2026-06-14: `git diff --check` passed with Windows line-ending checkout warnings only.

## Review Notes

- Read-only browser-smoke reviewer confirmed shell rewrite should stay deferred and static route locking is the right phase3 scope.
- Read-only selector reviewer found the first directory-level route split could drift because `ops/browser-mcp/` also contains a perf benchmark file. The final implementation uses explicit file sets.
- Final reviewer did not return before closeout. Main-thread first-principles review found the smallest stable implementation is route metadata plus explicit file-set routing and exact golden assertions.

## Live Process Ownership

- The main Codex agent owns all live shell processes and all test/build commands.
- Child agents may read source files and completed command outputs only.
