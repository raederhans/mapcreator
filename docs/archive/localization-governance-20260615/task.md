# Localization Governance Task

## Checklist

- [x] Register the localization governance worktree.
- [x] Add ownership ledger to the existing i18n audit report.
- [x] Extend audit tests for ownership ledger and source-name exemptions.
- [x] Add missing UI and scenario metadata translations.
- [x] Repair Gifu/Shiga source translations.
- [x] Rebuild derived TNO locale assets.
- [x] Run targeted verification.
- [x] Commit branch.
- [x] Integrate into main.

## Delivery Package Draft

1. Changed scope: extended i18n audit with a localization ownership ledger; fixed UI, HGO scenario metadata, and Gifu/Shiga geo translation gaps; refreshed affected TNO locale assets and Pages dist manifest.
2. Core files: `tools/i18n_audit.py`, `data/locales.json`, `data/i18n/manual_ui.json`, `data/i18n/manual_geo_overrides.json`, `data/i18n/locales_baseline.json`, TNO locale patch/startup locale assets, source and dist runtime catalog.
3. Tests/docs: `tests/test_i18n_audit.py`, active task docs, worktree registry.
4. Commit state: committed on `codex/localization-governance-20260615` after final rebase onto `origin/main` `41878c00`.
5. Main divergence: integrated into main by fast-forward merge; local main still has unrelated `lessons learned.md` edit.
6. Conflict risk: active a11y UI worktree must rebase across the integrated localization UI catalog/locales/tests/dist changes.
7. Verification: py_compile, 50 related unittest tests, i18n audit, 13 TNO targeted tests, TNO/HGO scenario contracts, full `npm run verify:pages-dist`, and `git diff --check` passed after rebase.
8. Remaining risk: `shell_fallback_missing_like=32663` remains a known existing generated-name backlog outside this task.
9. Recommended next step: rebase the a11y worktree onto latest main before integrating its shared UI/i18n/dist changes.
