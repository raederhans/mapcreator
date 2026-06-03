# Localization Automation 2026-06-02

- Goal: rerun localization audit for current tree, focusing on UI copy and local state override safety.
- Scope:
  - `tools/i18n_audit.py`
  - `data/locales.json`
  - `dist/app/data/locales.json`
  - `js/core/scenario/shared.js`
  - `js/core/scenario_localization_state.js`
  - `js/ui/dev_workspace/scenario_text_editors_controller.js`
- Deliverable: verified current localization status, minimal patch only if real drift or incorrect override exists.
