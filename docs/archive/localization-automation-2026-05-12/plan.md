# Localization Automation 2026-05-12

## Goal
- Run the localization verification path for unlocalized content.
- Focus on visible UI coverage plus local-state localization safety.
- Confirm scenario localization override precedence still matches the intended contract.
- Apply the smallest safe fix only if the live repo exposes a real issue.

## Plan
- [x] Read automation memory, project guidance, memory notes, and `lessons learned.md`.
- [x] Establish this run's docs and live-process ownership.
- [x] Run `python tools/i18n_audit.py` and capture a fresh audit result.
- [x] Audit UI source-of-truth files plus `scenario_localization_state` merge order.
- [x] Patch any real missing locale key or incorrect override with the smallest safe diff.
- [x] Re-run targeted verification and perform a final bug-review pass.

## Live Process Ownership
- Main thread owns all live commands for this run: `python tools/i18n_audit.py` and any unittest verification.
- Static sub-agents may inspect code and saved files only. They do not run or monitor live processes.

## Verification Target
- `python tools/i18n_audit.py`
- `python -m unittest tests.test_i18n_audit tests.test_translate_manager -q`
- `python -m unittest tests.test_startup_hydration_boundary_contract tests.test_scenario_chunk_refresh_contracts tests.test_main_startup_data_pipeline_boundary_contract tests.test_dev_workspace_scenario_text_editors_boundary_contract -q`
