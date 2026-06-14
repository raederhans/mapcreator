# HOI4 Country Full Names

## Goal
- Update `hoi4_1936` and `hoi4_1939` country display names from short/common names to full English names and Simplified Chinese full names.
- Keep the change rebuildable by storing the bilingual name map in data, then applying it to checked-in scenario artifacts.

## Plan
- [x] Locate the country-name source chain and runtime consumers.
- [x] Add a bilingual full-name override table for HOI4 country tags.
- [x] Teach the HOI4 builder to emit `display_name_en` and `display_name_zh`.
- [x] Apply the same map to checked-in 1936/1939 countries, startup bundles, gzip sidecars, and locale entries.
- [x] Run targeted scenario validation and a final review pass.

## Validation
- `python -m unittest tests.test_build_hoi4_scenario tests.test_check_hoi4_scenario_bundle -q`
- `python tools/check_hoi4_scenario_bundle.py --scenario-dir data/scenarios/hoi4_1936 --report-dir .runtime/reports/generated/scenarios/hoi4_1936`
- `python tools/check_hoi4_scenario_bundle.py --scenario-dir data/scenarios/hoi4_1939 --report-dir .runtime/reports/generated/scenarios/hoi4_1939`
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hoi4_1936 --report-path .runtime/reports/generated/hoi4_1936.strict_contract_report.json`
- `python tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hoi4_1939 --report-path .runtime/reports/generated/hoi4_1939.strict_contract_report.json`

All validation commands passed on 2026-06-13.
