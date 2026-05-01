# Localization Automation 2026-05-01

## Goal
- Run the localization verification path for unlocalized content.
- Focus on visible UI and local-state localization safety.
- Fix incorrect override wiring or missing locale coverage with the smallest safe diff.

## Plan
- [x] Read existing localization guidance, lessons learned, and prior automation notes.
- [x] Run `tools/i18n_audit.py` to find real gaps.
- [x] Check local-state override safety around `scenario_localization_state`.
- [x] Patch missing UI locale coverage and missing declarative i18n wiring.
- [x] Re-run targeted verification.

## Verification Target
- `python3 tools/i18n_audit.py`
- `python3 -m unittest tests.test_i18n_audit tests.test_translate_manager -q`
