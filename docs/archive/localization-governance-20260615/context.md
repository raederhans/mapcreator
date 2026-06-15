# Localization Governance Context

## 2026-06-15 Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-localization-governance-20260615`
- Branch: `codex/localization-governance-20260615`
- Base: `origin/main` at `7211640d56ad7533c0342a61155cf45fe3a82aec`
- Main checkout has an unrelated local edit in `lessons learned.md`; this task avoids touching that file.

## Baseline Audit

Command:

```powershell
py tools/i18n_audit.py
```

Result:

- `ui_missing=1`
- `ui_english_fallback=0`
- `scenario_geo_missing=1`
- `scenario_metadata_missing=2`
- `source_name_corrupted=0`
- `corrupted_translations=0`
- `mixed_term_lint=0`

Reports:

- `.runtime/reports/generated/translation/translation_coverage_report.md`
- `.runtime/reports/generated/translation/translation_coverage_report.json`

## Findings

- `Special zone diagnostics` is used in `project_support_diagnostics_controller.js` and is missing from UI locale sources.
- HGO scenario metadata strings are missing from geo locale ownership:
  - `HGO 1936`
  - `HGO 1936 Start`
  - `Historic Geographical Overhaul state-level vector scenario.`
- `Gifu` and `Shiga` are mistranslated in `data/locales.json` and have propagated into TNO locale patch and startup locale files.
- `dist/app` exists but does not contain `dist/app/data`; Pages data mirror work is informational in this task.

## Live Process Ownership

- No dev server, browser, Playwright, or long build is running.
- Main Codex agent owns all test and rebuild commands.
- Subagents are read-only/static analysis only.

## Implementation Notes

- Added `localization_ownership_audit` to the existing i18n audit JSON and Markdown report.
- Added ownership accounting for UI sources, geo sources, scenario localization assets, startup bundles, and dist mirror files.
- Added `Special zone diagnostics` to UI locale sources and runtime catalog.
- Added HGO scenario metadata strings to geo locale sources with real Chinese display values.
- Fixed Gifu/Shiga mistranslations in `data/locales.json`, baseline locales, manual geo overrides, TNO geo locale patch, and TNO startup locales.
- Rebuilt Pages dist after touching `dist/app/js/ui/i18n_catalog.js`.

## Verification Evidence

- `py -m py_compile tools/i18n_audit.py tools/translate_manager.py tools/audit_startup_bundle_family.py`: passed.
- `py -m unittest tests.test_i18n_audit tests.test_translate_manager tests.test_startup_bootstrap_assets -q`: 50 tests passed.
- `py tools/i18n_audit.py`: `ui_missing=0`, `uncovered_visible_ui=0`, `scenario_geo_missing=0`, `scenario_metadata_missing=0`.
- `py -m unittest tests.test_tno_geo_locale_patch tests.test_scenario_city_overrides_composer tests.test_startup_bootstrap_assets.StartupBootstrapAssetsTest.test_tno_1962_checked_in_startup_bundle_includes_arctic_shell -v`: 13 tests passed.
- `py tools/check_scenario_contracts.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/translation/tno_1962.localization_contract_report.json`: passed.
- `py tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hgo_1936 --report-path .runtime/reports/generated/translation/hgo_1936.localization_contract_report.json`: passed.
- `npm run verify:pages-dist`: passed; 36 Pages startup shell tests and 6 landing showcase node tests passed.
- `git diff --check`: passed with line-ending warnings only.

## Post-Rebase Verification

- Rebased branch onto `origin/main` `691c933f`; conflict was limited to `docs/active/_worktree_registry.md`.
- `py -m py_compile tools/i18n_audit.py tools/translate_manager.py tools/audit_startup_bundle_family.py`: passed.
- `py -m unittest tests.test_i18n_audit tests.test_translate_manager tests.test_startup_bootstrap_assets -q`: 50 tests passed.
- `py tools/i18n_audit.py`: `ui_missing=0`, `uncovered_visible_ui=0`, `scenario_geo_missing=0`, `scenario_metadata_missing=0`.
- `py -m unittest tests.test_tno_geo_locale_patch tests.test_scenario_city_overrides_composer tests.test_startup_bootstrap_assets.StartupBootstrapAssetsTest.test_tno_1962_checked_in_startup_bundle_includes_arctic_shell -v`: 13 tests passed.
- `py tools/check_scenario_contracts.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/translation/tno_1962.localization_contract_report.post_rebase.json`: passed.
- `py tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hgo_1936 --report-path .runtime/reports/generated/translation/hgo_1936.localization_contract_report.post_rebase.json`: passed.
- `npm run verify:pages-dist`: blocked by Windows `python` launcher availability in this shell.
- Equivalent Pages dist gate passed: `py tools/build_pages_dist.py`, `py -m unittest tests.test_pages_dist_startup_shell -q`, and `npm run test:node:landing-showcase-view`.
- `git diff --check`: passed.

## Final Pre-Integration Verification

- Rebased branch through current `origin/main` `41878c00`; conflicts were limited to `docs/active/_worktree_registry.md`.
- The additional main commits after `02e39fa9` changed only registry/archive docs, so product-code validation from `903ea7c7` remains applicable after the registry-only rebase.
- `py -m py_compile tools/i18n_audit.py tools/translate_manager.py tools/audit_startup_bundle_family.py`: passed.
- `py -m unittest tests.test_i18n_audit tests.test_translate_manager tests.test_startup_bootstrap_assets -q`: 50 tests passed.
- `py tools/i18n_audit.py`: `ui_missing=0`, `uncovered_visible_ui=0`, `scenario_geo_missing=0`, `scenario_metadata_missing=0`.
- `py -m unittest tests.test_tno_geo_locale_patch tests.test_scenario_city_overrides_composer tests.test_startup_bootstrap_assets.StartupBootstrapAssetsTest.test_tno_1962_checked_in_startup_bundle_includes_arctic_shell -v`: 13 tests passed.
- `py tools/check_scenario_contracts.py --scenario-dir data/scenarios/tno_1962 --report-path .runtime/reports/generated/translation/tno_1962.localization_contract_report.post_third_rebase.json`: passed.
- `py tools/check_scenario_contracts.py --strict --scenario-dir data/scenarios/hgo_1936 --report-path .runtime/reports/generated/translation/hgo_1936.localization_contract_report.post_third_rebase.json`: passed.
- `npm run verify:pages-dist`: passed; 36 Pages startup shell tests and 6 landing showcase node tests passed.
- `git diff --check`: passed.

## Main Integration Closeout

- `git merge --ff-only codex/localization-governance-20260615`: fast-forwarded main to `4711b0dd`.
- Main checkout still retains the unrelated user edit in `lessons learned.md`; it was left unstaged.
- Main validation after merge:
  - `py tools/i18n_audit.py`: target gaps stayed at zero.
  - `py -m unittest tests.test_i18n_audit -q`: 19 tests passed.
  - `git diff --check`: passed.
- Active docs were moved to `docs/archive/localization-governance-20260615/`.
