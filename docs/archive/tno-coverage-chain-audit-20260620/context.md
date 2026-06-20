# TNO Coverage Chain Audit Context

## 2026-06-20 Start

- Created isolated worktree `C:\Users\raede\Desktop\dev\mapcreator-tno-coverage-chain-audit`.
- Branch: `codex/tno-coverage-chain-audit`.
- Base: `origin/main@27ace5614c6b35902de04d0f7652c17c61450a8e`.
- Parent checkout has unrelated WIP in `css/style.css`, `data/locales.json`, `dist/app/css/style.css`, `dist/pages-dist-manifest.json`, `tests/test_ui_rework_plan02_mainline_contract.py`, and `docs/active/dropdown-style-alignment/`.
- Existing extra worktree `C:\Users\raede\Desktop\dev\mapcreator-audit-20260620-render-frame` is clean at `27ace561`.
- Main agent owns all live validation. Child agents Kierkegaard and Faraday are static-only review/research lanes.

## Evidence Already Gathered

- Existing `validate_tno_water_geometries.py` passes for its current scope.
- `npm run test:node:scenario-chunk-contracts` passed 54 tests in the planning pass.
- `npm run verify:scenario-contracts:hgo` passed in the planning pass.
- `npm run verify:scenario-contracts:strict` failed in the planning pass because `build_snapshot.json` fingerprint fields drifted from current artifacts.
- Memory guidance says generated HGO/Pages JSON should be regenerated in a clean worktree and verified through source-of-truth builders.

## Current Owner Rules

- Live test/build owner: main agent.
- Subagents: no live process polling, no file edits unless explicitly reassigned.
- Registry owner for this task: main agent.

## Next Step

Implement the coverage ledger and strict report fields using existing validator/helper files.

## 2026-06-20 Phase 0 Result

- `npm run verify:scenario-contracts:strict` failed on clean base with `build_snapshot.json` fingerprint/input/output SHA drift.
- `npm run python -- tools/check_scenario_contracts.py --strict --write-safe --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962.strict_contract_report.json` passed.
- Safe repair updated TNO derived scenario artifacts: `audit.json`, `build_snapshot.json`, `geo_locale_patch.en.json`, `locales.startup.json`, and `manifest.json`.
- Safe fixes reported: `geo_locale_patch_inputs`, `startup_support_assets`, `chunk_assets`, `startup_bundles`, `build_snapshot`, `audit_sync`, `manifest_source_sync`.
- New strict snapshot fingerprint: `fb424be3c31bda08c0731d383ce45aa66118cfc8641933b851e609caee872237`.

## 2026-06-20 Implementation Result

- Added `data/scenarios/tno_1962/derived/atlantropa_donor_ledger.json`.
  - Runtime feature count: 897.
  - Chunk feature count: 897.
  - Missing chunk count: 0.
  - Basin probe failure count: 0.
- Added `data/scenarios/tno_1962/derived/geometry_drop_audit.json`.
  - Protected feature count: 641.
  - Protected prefix drop count: 0.
  - Runtime-only RU Arctic shell count: 51.
  - Polar feature count: 1.
- `runtime_meta.json` now records coverage ledger hashes, stable ledger paths, and a repository-relative strict report path.
- `runtime_meta.json` now records fixed coverage report paths for the strict, ledger, Atlantropa, and polar npm gates; the paths are independent from the `--report-path` argument used during a single run.
- Strict report fields now include `coverage_ledger_ok`, `protected_prefix_drop_count`, `basin_probe_failures`, `polar_feature_count`, and `polar_gate_ref`.
- `tools/validate_tno_water_geometries.py` report schema moved to version 3 and now includes `aq_polar_spherical_diagnostics`.
- `tools/build_pages_dist.py` now publishes the two TNO coverage ledgers as explicit `derived/` exceptions and raises the Pages dist size gate to 1102 MiB.
- Added npm scripts: `verify:tno-coverage-ledger`, `verify:tno-atlantropa-coverage`, `verify:tno-polar-coverage`, and `verify:tno-coverage-chain`.

## 2026-06-20 Verification Result

- `npm run python -- -m py_compile tools/check_scenario_contracts.py tools/validate_tno_water_geometries.py` passed.
- `npm run python -- tools/check_scenario_contracts.py --strict --write-safe --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_1962.coverage_chain_write_safe_report.json` passed.
- `npm run verify:tno-coverage-chain` passed, including 54 scenario chunk contract tests.
- `npm run verify:scenario-contracts:hgo` passed.
- `npm run test:py:tno-water-repair-contracts` passed 7 tests.
- `npm run python -- tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_water_geometry_plan_audit.json` passed.
- `npm run verify:pages-dist` passed, including 38 Pages startup shell tests and 8 landing showcase tests.
- `npm run python -- -m unittest tests.test_scenario_contracts -q` passed 40 tests.
- `npm run python -- -m unittest tests.test_e2e_structural_tooling.E2eStructuralToolingContractTest.test_route_registry_includes_every_package_test_node_script -q` passed.
- `npm run python -- -m unittest tests.test_tno_water_geometries.TnoWaterRecentRefinementContractTest.test_water_validator_report_schema_locks_ocean_refinement_signals tests.test_tno_water_geometries.TnoWaterRecentRefinementContractTest.test_water_validator_reports_aq_polar_spherical_diagnostics -q` passed.
- `git diff --check` passed.
- Review fix evidence: `dist/pages-dist-manifest.json` includes both coverage ledgers; dist files exist; dist `runtime_meta.json` and `build_snapshot.json` hashes match source ledger hashes.

## 2026-06-20 Post-Rebase Verification

- Rebasing onto `origin/main@c96af211` completed and produced feature commit `6d0a583e`.
- Post-rebase safe repair updated TNO generated fingerprints after the rebase.
- `npm run verify:pages-dist` passed after rebuilding Pages dist: total size `1100.69 MiB`, 38 Pages startup shell tests passed, and 8 landing showcase tests passed.
- `npm run verify:tno-coverage-chain` passed after the Pages rebuild, including strict, coverage ledger, Atlantropa, polar, and 54 scenario chunk contract tests.
- `npm run verify:scenario-contracts:hgo` passed.
- `npm run test:py:tno-water-repair-contracts` passed 7 tests.
- `npm run python -- tools/validate_tno_water_geometries.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/tno_water_geometry_plan_audit.json` passed.
- `npm run python -- -m unittest tests.test_scenario_contracts -q` passed 40 tests; the `risky_scenario` failure text is the expected negative fixture.
- Route registry and targeted TNO water geometry unittests passed.
- Python compile for `tools/check_scenario_contracts.py`, `tools/validate_tno_water_geometries.py`, and `tools/build_pages_dist.py` passed.
- Dist ledger proof passed: both ledgers are present in `dist/pages-dist-manifest.json`, both dist files exist, and runtime/build snapshot hashes match source ledgers.

## 2026-06-20 Current Next Step

Amend the feature commit with post-rebase generated data and docs, run final diff check, fast-forward main, archive docs, push, and remove the temporary worktree.
