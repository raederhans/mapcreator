# Tooling Simplification Phase 2 Plan

## Scope

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-tooling-simplification-phase2`
- Branch: `codex/tooling-simplification-phase2`
- Owner: main Codex agent
- Live process owner: main Codex agent only
- Child agents: static analysis and review only
- Focus: scenario contract write-safe cleanup first, browser smoke and agent routing second

## Plan

1. Reconfirm repository context and phase boundaries.
2. Lock current `--write-safe` behavior with targeted tests.
3. Simplify only duplicated or tightly coupled helpers used by `check_scenario_contracts.py`.
4. Inspect browser smoke and agent routing chain, then apply only small behavior-preserving cleanup if evidence supports it.
5. Run targeted tests and static checks.
6. Run read-only review plus first-principles self-check.
7. Commit, push, merge to `main`, and remove this worktree after validation.

## Progress

- [x] Created isolated phase2 worktree from `origin/main`.
- [x] Read `lessons learned.md` and `docs/shared/agent-tiers.md`.
- [x] Created phase2 task, plan, and context docs.
- [x] Map current write-safe and browser smoke/tool-routing code.
- [x] Add behavior locks for unprotected cleanup.
- [x] Implement minimal cleanup.
- [x] Run verification.
- [x] Review and self-check.
- [ ] Commit, push, merge, and clean worktree.

## Validation Commands

- `python -m unittest tests.test_scenario_contracts -q`
- `python -m unittest tests.test_e2e_structural_tooling -q`
- `python -m unittest tests.test_playwright_app_ready_gate_contract -q`
- `python tools/check_scenario_contracts.py --strict --write-safe --scenario-dir data/scenarios/hoi4_1936 --scenario-dir data/scenarios/hoi4_1939`
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hoi4_1936 --scenario-dir data/scenarios/hoi4_1939`
- `node tools/select_verification_targets.mjs --check`
- `node tools/select_verification_targets.mjs ops/browser-mcp/run-smoke-browser-inspection.sh ops/browser-mcp/inspection-profile.toml --json`
- `python -m unittest tests.test_perf_gate_contract -q`
- `npm run test:node:perf-probe-snapshot-behavior`
- `npm run verify:perf-gate-contract`
- `npm run test:adaptive -- --dry-run`
- `git diff --check`

## Validation Log

- 2026-06-14: `python -m unittest tests.test_scenario_contracts.ScenarioContractTest.test_write_safe_main_blocks_risky_repairs_before_apply -q` failed before the fix because `apply_safe_scenario_contract_repairs()` was called twice for a risky report.
- 2026-06-14: The same targeted test passed after write-safe precheck switched to real strict inspection.
- 2026-06-14: `python tools/check_scenario_contracts.py --strict --write-safe --scenario-dir data/scenarios/hoi4_1936 --scenario-dir data/scenarios/hoi4_1939` passed and synchronized only manifest/audit/build_snapshot fingerprints.
- 2026-06-14: `python -m unittest tests.test_scenario_contracts -q` passed: 38 tests in 8.908s.
- 2026-06-14: `python -m unittest tests.test_playwright_app_ready_gate_contract -q` passed: 5 tests in 0.002s.
- 2026-06-14: `python -m unittest tests.test_e2e_structural_tooling -q` initially failed because isolated worktree dependencies were not installed; `npm ci --ignore-scripts` installed from the existing lockfile with no tracked dependency changes.
- 2026-06-14: `python -m unittest tests.test_e2e_structural_tooling -q` passed: 28 tests in 4.248s.
- 2026-06-14: `node tools/select_verification_targets.mjs --check` passed: route schema check passed for 136 routes.
- 2026-06-14: `npm run test:adaptive -- --dry-run` passed: adaptive selection planned 29 commands, dry-run only.
- 2026-06-14: `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hoi4_1936 --scenario-dir data/scenarios/hoi4_1939` passed.
- 2026-06-14: `git diff --check` passed with Windows line-ending checkout warnings only.
- 2026-06-14: A read-only review subagent was launched but did not return findings before shutdown. Main agent completed the final bug review and first-principles self-check.
- 2026-06-14: `node tools/select_verification_targets.mjs ops/browser-mcp/run-smoke-browser-inspection.sh ops/browser-mcp/inspection-profile.toml --json` passed and selected `python -m unittest tests.test_playwright_app_ready_gate_contract -q`.
- 2026-06-14: `python -m unittest tests.test_perf_gate_contract -q` passed: 22 tests in 0.286s.
- 2026-06-14: `npm run test:node:perf-probe-snapshot-behavior` passed: 5 node tests.
- 2026-06-14: `npm run verify:perf-gate-contract` passed: 22 tests in 0.050s.

## Live Process Ownership

- The main Codex agent owns all live tests and shell commands that execute tests/builds.
- Child agents may read source files and completed logs only.
