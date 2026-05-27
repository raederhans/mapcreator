# Localization Automation Context

- 2026-05-26: Main agent owns all live test and audit commands for this run.
- Current repo dirt before work: `.omx/metrics.json`.
- Automation memory from 2026-05-25 reported a clean audit and stable override order:
  `baseGeoLocales -> patch.geo -> synchronizedNamePatch.geo -> scenarioGeoPatch`.
- Current focus files:
  - `tools/i18n_audit.py`
  - `js/core/scenario_localization_state.js`
  - `js/core/scenario/shared.js`
  - `js/ui/dev_workspace/scenario_text_editors_controller.js`
- Live audit found one current-tree regression bucket: `uncovered_visible_ui=1`.
- The concrete uncovered literal was `Manual`, traced to `index.html` line 632: `<option value="manual">Manual</option>`.
- Fix applied: add `data-i18n="Manual"` to that option and add a regression test for translated `<option>` coverage in `tests/test_i18n_audit.py`.
- Fresh verification:
  - `python tools/i18n_audit.py` -> `uncovered_visible_ui=0`
  - `python -m unittest ... -q` -> `Ran 72 tests ... OK`
