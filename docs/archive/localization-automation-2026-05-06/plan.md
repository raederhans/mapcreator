# Localization Automation 2026-05-06

## Goal
- Run the localization verification path for unlocalized content.
- Focus on visible UI and local-state localization safety.
- Confirm override precedence stays correct.
- Apply the smallest safe fix only if the audit exposes a real issue.

## Plan
- [x] Read current localization guidance, automation memory, and lessons learned.
- [x] Run `python3 tools/i18n_audit.py` and capture the fresh report.
- [x] Audit `manual_ui.json`, `data/locales.json`, `data/i18n/locales_baseline.json`, and local-state localization merge order.
- [x] Patch any real missing key or incorrect override with the smallest safe diff.
- [x] Re-run targeted verification and self-review.

## Verification Target
- `python3 tools/i18n_audit.py`
- `python3 -m unittest tests.test_i18n_audit tests.test_translate_manager -q`
