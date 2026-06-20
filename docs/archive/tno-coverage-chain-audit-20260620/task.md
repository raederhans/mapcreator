# TNO Coverage Chain Audit Task

## Checklist

- [x] Create isolated worktree from `origin/main`.
- [x] Create active task docs.
- [x] Update `docs/active/_worktree_registry.md`.
- [x] Re-run strict scenario contract and classify snapshot drift.
- [x] Add generated coverage ledgers.
- [x] Add RU Arctic protected-prefix validator.
- [x] Add Atlantropa/Ionian donor coverage validator.
- [x] Add AQ polar spherical validator.
- [x] Wire strict report fields.
- [x] Add npm scripts.
- [x] Add focused unit tests.
- [x] Run targeted validation.
- [x] Run final review/self-audit.
- [x] Commit and prepare integration package.

## 2026-06-20 Post-review Correction

- The original audit branch was integrated and pushed to `origin/main`.
- A follow-up branch, `codex/tno-coverage-contract-followup`, now owns the post-review contract hardening for geometry-backed basin probes, strict `polar_spherical_failures`, full runtime metadata path assertions, and stale registry state.
- The parent checkout later contained unrelated local WIP, so local fast-forward cleanup moved to a separate WIP-classification step. The retained TNO worktree is the clean delivery surface for the follow-up.

## Delivery Package

### Changed What

1. Added checked-in TNO coverage ledgers for Atlantropa donor/runtime/chunk coverage and protected-prefix drop auditing.
2. Extended strict scenario contracts with machine-readable coverage fields: `coverage_ledger_ok`, `protected_prefix_drop_count`, `basin_probe_failures`, and `polar_spherical_failures`.
3. Added basin probes for Ionian, Libya/Suez, Malta, and Cretan Atlantropa coverage, plus RU Arctic protected-prefix stage checks.
4. Added AQ polar spherical diagnostics to the water geometry validator report.
5. Added npm verification entrypoints for ledger, Atlantropa, polar, and combined TNO coverage-chain gates.

### Files

Core files:

- `tools/check_scenario_contracts.py`
- `tools/validate_tno_water_geometries.py`
- `tools/build_pages_dist.py`
- `package.json`
- `tools/test_route_registry.mjs`

Generated data:

- `data/scenarios/tno_1962/derived/atlantropa_donor_ledger.json`
- `data/scenarios/tno_1962/derived/geometry_drop_audit.json`
- `data/scenarios/tno_1962/audit.json`
- `data/scenarios/tno_1962/build_snapshot.json`
- `data/scenarios/tno_1962/geo_locale_patch.en.json`
- `data/scenarios/tno_1962/locales.startup.json`
- `data/scenarios/tno_1962/manifest.json`
- `data/scenarios/tno_1962/runtime_meta.json`
- `dist/pages-dist-manifest.json`

Tests and docs:

- `tests/test_scenario_contracts.py`
- `tests/test_tno_water_geometries.py`
- `tests/test_pages_dist_startup_shell.py`
- `tests/test_e2e_structural_tooling.py`
- `docs/active/_worktree_registry.md`
- `docs/active/tno-coverage-chain-audit/{plan.md,context.md,task.md}`

### Diff Summary

- `tools/check_scenario_contracts.py` now generates and validates the TNO coverage ledgers, records protected prefix drop counts, basin probe failures, and ledger hashes.
- `tools/validate_tno_water_geometries.py` now emits AQ polar spherical diagnostics in schema version 3 reports.
- `tools/build_pages_dist.py` publishes only the two checked coverage ledgers from `derived/` and raises the Pages size gate to 1102 MiB for the audited payload.
- `package.json` exposes four TNO coverage verification scripts.
- Scenario artifacts were regenerated through the existing strict safe-repair and Pages dist builders.
- Original audit delivery was integrated. The follow-up branch records the remaining review hardening and current delivery state.

### Verification

- `npm run python -- -m py_compile tools/check_scenario_contracts.py tools/validate_tno_water_geometries.py` passed.
- `npm run python -- tools/check_scenario_contracts.py --strict --write-safe --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962.coverage_chain_write_safe_report.json` passed.
- `npm run verify:tno-coverage-chain` passed, including 54 scenario chunk contract tests.
- `npm run verify:scenario-contracts:hgo` passed.
- `npm run test:py:tno-water-repair-contracts` passed 7 tests.
- `npm run python -- tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_water_geometry_plan_audit.json` passed.
- `npm run verify:pages-dist` passed after the post-rebase rebuild: 38 Pages startup shell tests and 8 landing showcase tests; Pages dist is 1100.69 MiB under the 1102 MiB gate.
- `npm run python -- -m unittest tests.test_scenario_contracts -q` passed 40 tests.
- `npm run python -- -m unittest tests.test_e2e_structural_tooling.E2eStructuralToolingContractTest.test_route_registry_includes_every_package_test_node_script -q` passed.
- `npm run python -- -m unittest tests.test_tno_water_geometries.TnoWaterRecentRefinementContractTest.test_water_validator_report_schema_locks_ocean_refinement_signals tests.test_tno_water_geometries.TnoWaterRecentRefinementContractTest.test_water_validator_reports_aq_polar_spherical_diagnostics -q` passed.
- `git diff --check` passed.
- Code review finding fixed: Pages dist now includes `app/data/scenarios/tno_1962/derived/atlantropa_donor_ledger.json` and `app/data/scenarios/tno_1962/derived/geometry_drop_audit.json`.
- Code review finding fixed: `runtime_meta.json` coverage report paths are fixed npm-script paths and no longer depend on the `--report-path` argument.
- Post-rebase dist ledger proof passed: both coverage ledgers are in `dist/pages-dist-manifest.json`, both dist files exist, and `runtime_meta.json` plus `build_snapshot.json` hashes match source ledgers.

Known validation note:

- A broader `tests.test_e2e_structural_tooling` run hits an existing environment gap for missing `@playwright/test`; the targeted route registry test used by this change passes.

### Integration Recommendation

Original audit integration is complete. Current follow-up work should be integrated from `codex/tno-coverage-contract-followup` after its review and final verification. Preserve the dirty parent checkout until its unrelated WIP is classified.
