# Localization Governance 2026-06-15

## Goal

Centralize localization governance around one auditable source of truth, then fix the confirmed gaps found by the current audit:

- UI copy coverage and runtime catalog ownership.
- Geo translation source ownership.
- Scenario metadata translation ownership.
- Scenario startup and geo locale patch derived assets.
- Pages dist mirror visibility.

## Scope

- Extend the existing `tools/i18n_audit.py` report with a localization ownership ledger.
- Keep generated and source localization assets distinguishable in the report.
- Fix the confirmed `Special zone diagnostics` UI key gap.
- Fix confirmed HGO scenario metadata gaps.
- Fix confirmed Gifu/Shiga geo mistranslations at the source and regenerate derived TNO locale assets.
- Add targeted tests for report structure and known non-translatable source names.

## Out Of Scope

- Browser smoke or Playwright validation.
- Network or machine translation.
- Broad rewrite of translation management.
- New runtime localization architecture.

## Verification Plan

- `py -m py_compile tools/i18n_audit.py tools/translate_manager.py tools/audit_startup_bundle_family.py`
- `py -m unittest tests.test_i18n_audit tests.test_translate_manager tests.test_startup_bootstrap_assets -q`
- `py tools/i18n_audit.py`
- TNO derived asset rebuild for Gifu/Shiga plus targeted scenario contracts if derived assets change.
- `git diff --check`

## Progress

- [x] Baseline i18n audit run in isolated worktree.
- [x] Subagent static analysis for report entry point and test surface.
- [x] Subagent static analysis for Gifu/Shiga source and derived asset impact.
- [x] Implement ownership ledger in `tools/i18n_audit.py`.
- [x] Add tests and data fixes.
- [x] Rebuild derived TNO locale assets.
- [x] Run targeted verification.
- [ ] Commit, merge, push, and clean the temporary worktree.
