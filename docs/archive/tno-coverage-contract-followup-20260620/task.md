# TNO Coverage Contract Follow-up Task

## Checklist

- [x] Create follow-up branch.
- [x] Create active follow-up docs.
- [x] Update worktree registry.
- [x] Add geometry-backed basin probe checks.
- [x] Add `polar_spherical_failures` strict report field.
- [x] Lock source and Pages path contracts.
- [x] Fix stale archive task state.
- [x] Run targeted verification.
- [x] Run independent review.
- [x] Commit, push, archive docs, and update registry.

## Delivery Package

### Changed What

1. Replaced Atlantropa basin probe acceptance with geometry-backed intersection after bbox prefiltering.
2. Added strict `polar_spherical_failures` report output.
3. Locked complete source and Pages `coverage_ledger_paths` / `coverage_report_paths` contracts.
4. Regenerated TNO source ledgers and Pages dist through existing builders.
5. Updated stale audit delivery docs and registry state for the retained follow-up worktree.

### Files

Core files:

- `tools/check_scenario_contracts.py`

Tests:

- `tests/test_scenario_contracts.py`
- `tests/test_pages_dist_startup_shell.py`

Generated data:

- `data/scenarios/tno_1962/derived/atlantropa_donor_ledger.json`
- `data/scenarios/tno_1962/audit.json`
- `data/scenarios/tno_1962/build_snapshot.json`
- `data/scenarios/tno_1962/manifest.json`
- `data/scenarios/tno_1962/runtime_meta.json`
- `dist/pages-dist-manifest.json`

Docs:

- `lessons learned.md`
- `docs/active/_worktree_registry.md`
- `docs/archive/tno-coverage-contract-followup-20260620/{plan.md,context.md,task.md}`
- `docs/archive/tno-coverage-chain-audit-20260620/task.md`

### Diff Summary

- `tools/check_scenario_contracts.py` carries private GeoJSON geometry through basin probe evaluation, strips it before ledger write, and emits `polar_spherical_failures`.
- `tests/test_scenario_contracts.py` adds a bbox-only false-positive regression and validates full source metadata path dictionaries.
- `tests/test_pages_dist_startup_shell.py` validates full dist metadata path dictionaries.
- Generated TNO ledger now records `bbox_candidate_count`, and Malta probe match count reflects true geometry intersection.

### Verification

- `npm run python -- -m py_compile tools/check_scenario_contracts.py` passed.
- `npm run python -- -m unittest tests.test_scenario_contracts -q` passed 41 tests.
- `npm run python -- tools/check_scenario_contracts.py --strict --write-safe --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962.coverage_contract_followup_write_safe_report.json` passed.
- `npm run verify:pages-dist` passed: Pages startup shell 38 tests and landing showcase 8 tests.
- `npm run verify:tno-coverage-chain` passed: strict, ledger, Atlantropa, polar, and 54 scenario chunk contracts.
- `git diff --check` passed with Windows line-ending warnings only.
- Code reviewer `Dirac` returned CLEAR with 0 findings.

### Current Integration State

- Current branch: `codex/tno-coverage-contract-followup`.
- Base: `origin/main@ffab42b8`.
- Functional commit: `6bec07d7`.
- Closeout commits: `1f0e1b2c` plus final registry state.
- Current status: integrated, pushed to `origin/main`, archived, and retained as the clean checkout for parent WIP classification. Use `git rev-parse origin/main` for the latest pushed SHA.
- Parent checkout remains dirty with unrelated WIP, including `lessons learned.md`; keep this retained worktree as the clean delivery surface until parent WIP is classified.
