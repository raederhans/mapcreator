# Dropdown Style Alignment Context

## 2026-06-20

- User reported many dropdowns looked strange after earlier changes and asked to align them with the Scenario dropdown.
- Current app URL was `http://127.0.0.1:8000/app/?scope=current-object&section=exportProjectSection`.
- Existing dirty file before this task: `data/locales.json`; this task must not touch it.
- Read `lessons learned.md`, `ultrawork`, `ui-ux-pro-max`, and `docs/shared/agent-tiers.md`.
- Read-only subagent confirmed two dropdown systems:
  - Scenario custom button/listbox: `#scenarioSelectButton`, `#scenarioSelectMenu`, `.scenario-select-option`.
  - Native select chrome: `.select-input`, `select.select-input`, `.transport-workbench-select`, `.legend-generator-select`, `.hgo-identity-variant-select`, `.inspector-color-suggestion-select`, special-zone selects.
- Implementation direction: keep native select behavior and align the shared native select visual tokens with the Scenario button style.

## Live Process Ownership

- Existing dev server was already running on `http://127.0.0.1:8000/app/`.
- Main agent owns any browser smoke or server checks in this task.
- Subagents are read-only and must not monitor the live server.

## Validation

- `npm run python -- -m unittest tests.test_ui_rework_plan02_mainline_contract.UiReworkPlan02MainlineContractTest.test_native_selects_share_app_dropdown_chrome -q` passed.
- `npm run python -- tools/build_pages_dist.py` passed and synced `dist/app/css/style.css`.
- `npm run python -- -m unittest tests.test_pages_dist_startup_shell -q` passed.
- `node --check js/ui/scenario_controls.js` passed.
- `rg` found no old two-triangle select arrow CSS in `css/style.css` or `dist/app/css/style.css`.
- MCP browser computed styles on `http://127.0.0.1:8000/app/?scope=current-object&section=exportProjectSection` confirmed Scenario button and export selects use 12px radius; export selects use the single SVG chevron and shared gradient.
- Full `tests.test_ui_rework_plan02_mainline_contract` still has an unrelated pre-existing failure for the `toolbar.js` left-sidebar collapse token.
- Browser console showed existing/local-environment errors: `favicon.ico` 404 and `/api/backend/auth/me` 401; no dropdown CSS error was observed.
- Review subagent found the special-zone select block still overrode `border-radius` to 10px after the shared 12px rule. Fixed source and dist CSS to keep the final special-zone radius at 12px.
- Added a contract assertion that reads the special-zone select CSS block and checks `border-radius: 12px;`.
- MCP browser sample of the first 20 mounted selects confirmed `borderRadius: 12px` and SVG chevrons on native selects.
