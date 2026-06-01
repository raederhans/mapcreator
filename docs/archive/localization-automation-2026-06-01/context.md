# Localization Automation Context

- 2026-06-01: Main agent owns all live audit and test commands for this run.
- Current repo dirt before work: `.omx/metrics.json`, `js/api/backend_client.js`, `js/ui/sidebar/project_support_diagnostics_controller.js`, `js/ui/transport_workbench_line_runtime_shared.js`, `js/ui/transport_workbench_manifest_preview.js`, `tests/test_project_support_diagnostics_sidebar_boundary_contract.py`.
- Automation memory from 2026-05-31 reported a clean audit and stable override order:
  `baseGeoLocales -> patch.geo -> synchronizedNamePatch.geo -> scenarioGeoPatch`.
- Current focus files:
  - `tools/i18n_audit.py`
  - `data/locales.json`
  - `js/core/scenario_localization_state.js`
  - `js/core/scenario/shared.js`
  - `js/ui/dev_workspace/scenario_text_editors_controller.js`
- Current task emphasis:
  - Check unlocalized UI content.
  - Recheck local states / scenario patch override safety.
  - Patch only if the current tree shows real drift.
- Current run findings:
  - Audit exposed 26 real missing UI keys, all from Cloud Saves / community / auth / report copy plus `fragments`.
  - Audit also exposed 8 source-provider names as uncovered literals; these are now treated as explicit non-translatable tokens.
  - Override-safety chain remained unchanged and clean in the current tree.
