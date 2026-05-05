# Localization Automation 2026-05-03

## Goal
- Run the localization verification path for unlocalized content.
- Focus on visible UI and local-state localization safety.
- Fix incorrect override wiring or missing locale coverage with the smallest safe diff.

## Plan
- [x] Read existing localization guidance, lessons learned, and prior automation notes.
- [x] Run `python3 tools/i18n_audit.py`.
- [x] Check local-state override safety around `js/core/scenario_localization_state.js`.
- [x] Patch any real missing UI locale coverage found by the audit.
- [x] Re-run targeted verification and archive this run after self-review.

## Verification Target
- `python3 tools/i18n_audit.py`
- `python3 -m unittest tests.test_i18n_audit tests.test_translate_manager -q`
