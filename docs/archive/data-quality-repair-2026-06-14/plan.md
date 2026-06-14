# Data Quality Repair Plan - 2026-06-14

## Goal

Repair the retained data quality and infrastructure findings from the audit in an isolated worktree, preserving the original dirty checkout.

## Execution Branch

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-data-quality-repair-2026-06-14`
- Branch: `codex/data-quality-repair-2026-06-14`
- Source checkout: `C:\Users\raede\Desktop\dev\mapcreator`

## Scope

- In scope: findings from lanes 1, 3, 4, 5, 6, 7, 9, 10.
- Out of scope: source ledger/provenance repairs and large-file/volume optimization.
- Generated checked-in outputs may be refreshed in this isolated branch when they are required to satisfy byte/hash contracts.

## Stages

1. High restore
   - Restore TNO strict scenario contracts.
   - Restore HOI4 1936/1939 strict scenario contracts.
   - Refresh `data/manifest.json` output hashes for locales and palette artifacts when drift exists in the isolated branch.
   - Add verification route coverage for locale, alias, and HGO name catalog changes.

2. Medium semantic repair
   - Fix TNO orphan tags, core tag references, and Ross Sea raw coordinate drift.
   - Align global airport/port packs with workbench filter fields.
   - Connect `locales` and `geo_aliases` to runtime asset registry loading.
   - Fill i18n missing keys/wiring and align locale baseline.

3. Low governance visibility
   - Add governance columns to `CATALOG.md`.
   - Surface allowed empty `hashRef` coverage as warning-level visibility.
   - Reduce i18n audit noise from source labels and data literals.

## Verification Gates

- `python tools/data_health.py --json`
- `python tools/check_data_catalog.py`
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/data-quality-repair/tno_1962.strict_contract_report.json`
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hgo_1936 --report-path .runtime/reports/generated/data-quality-repair/hgo_1936.strict_contract_report.json`
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hoi4_1936 --report-path .runtime/reports/generated/data-quality-repair/hoi4_1936.strict_contract_report.json`
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hoi4_1939 --report-path .runtime/reports/generated/data-quality-repair/hoi4_1939.strict_contract_report.json`
- `python -m unittest tests.test_data_catalog_contract tests.test_data_manifest_contract tests.test_scenario_contracts tests.test_transport_manifest_contracts tests.test_i18n_audit -q`
- `node tools/select_verification_targets.mjs data/locales.json --json`
- `node tools/select_verification_targets.mjs data/city_aliases.json data/geo_aliases.json data/hgo_catalogs/hgo_place_names.json data/hgo_catalogs/hgo_identity_aliases.json --json`
- `git diff --check`

