# TNO Coverage Contract Follow-up Context

## 2026-06-20 Start

- Branch: `codex/tno-coverage-contract-followup`.
- Base: `origin/main@ffab42b8`.
- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-tno-coverage-chain-audit`.
- Parent checkout remains dirty with unrelated archive deletions and `lessons learned.md` WIP.

## Review Findings Being Addressed

- MEDIUM: Atlantropa basin probes use bbox intersection instead of actual geometry coverage.
- LOW: Registry/archive docs contain stale closeout state.
- WATCH: `coverage_ledger_paths` and full `coverage_report_paths` are not fully locked in tests.
- WATCH: strict report should expose `polar_spherical_failures` as a machine-readable field.

## Live Process Ownership

Main Codex agent owns all tests/builds. Subagents are static review lanes only.

## 2026-06-20 Implementation Notes

- `tools/check_scenario_contracts.py` now evaluates Atlantropa basin probes with real GeoJSON geometry intersection after a bbox prefilter.
- The private `_probe_geometry` row field is stripped before writing `derived/atlantropa_donor_ledger.json`, so persistent ledger size stays bounded.
- Strict reports now expose `polar_spherical_failures`; the current TNO strict report has `polar_spherical_failures=[]` and `polar_feature_count=1`.
- Source and Pages tests now lock the full `coverage_ledger_paths` and `coverage_report_paths` dictionaries.
- `write-safe` refreshed TNO source generated artifacts through the existing builder; `verify:pages-dist` refreshed Pages output.

## 2026-06-20 Verification

- `npm run python -- -m py_compile tools/check_scenario_contracts.py` passed.
- `npm run python -- -m unittest tests.test_scenario_contracts -q` passed 41 tests.
- `npm run python -- tools/check_scenario_contracts.py --strict --write-safe --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962.coverage_contract_followup_write_safe_report.json` passed.
- `npm run verify:pages-dist` passed: Pages startup shell 38 tests and landing showcase 8 tests.
- `npm run verify:tno-coverage-chain` passed: strict, coverage ledger, Atlantropa, polar, and 54 scenario chunk contracts.
