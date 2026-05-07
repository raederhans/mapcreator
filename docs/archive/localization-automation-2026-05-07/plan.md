# Localization Automation 2026-05-07

## Goal
- Run the localization verification path for unlocalized content.
- Focus on visible UI and local-state localization safety.
- Confirm override precedence stays correct.
- Apply the smallest safe fix only if the audit exposes a real issue.

## Plan
- [x] Read current localization guidance, automation memory, and lessons learned.
- [x] Run `python tools/i18n_audit.py` and capture the fresh report.
- [x] Audit `manual_ui.json`, `data/locales.json`, `data/i18n/locales_baseline.json`, and local-state localization merge order.
- [x] Patch any real missing key or incorrect override with the smallest safe diff.
- [x] Re-run targeted verification and self-review.

## Verification Target
- `python tools/i18n_audit.py`
- `python -m unittest tests.test_i18n_audit tests.test_translate_manager -q`
- `python -m unittest tests.test_startup_hydration_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_main_startup_data_pipeline_boundary_contract tests.test_dev_workspace_scenario_text_editors_boundary_contract -q`
