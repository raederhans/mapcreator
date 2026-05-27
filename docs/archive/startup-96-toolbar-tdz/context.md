# Startup 96 Toolbar TDZ Context

User console shows `ReferenceError: Cannot access 'renderOceanCoastalAccentUi' before initialization` at `toolbar.js:857`.

Observed path:
- `runPostScenarioUiReplay()` emits `UPDATE_PAINT_MODE`.
- The toolbar `updatePaintModeUIFn` listener calls `refreshPaintControlsLayout()`.
- `refreshPaintControlsLayout()` calls `refreshWorkspaceStatus()`.
- `refreshWorkspaceStatus()` calls `renderOceanCoastalAccentUi()`.

Current finding:
- `updatePaintModeUIFn`, `updateWorkspaceStatusFn`, `updateScenarioContextBarFn`, and `updateActiveSovereignUIFn` are registered before `createOceanLakeControlsController()` is unpacked.
- `renderOceanCoastalAccentUi` is provided by that controller, so an early replay can hit the local TDZ.
- Targeted toolbar contract also exposed `appearance_physical_owner.js` returning `getPhysicalPresetHint` after the helper and optional node lookup were removed. That can abort appearance controller creation before the ocean/lake controller is wired.

Live process ownership:
- Main agent owned the runtime smoke on `http://127.0.0.1:8831/app/` and stopped the dev server after verification.

Verification:
- `node --check js\ui\toolbar.js js\ui\toolbar\appearance_physical_owner.js js\ui\toolbar\ocean_lake_controls_controller.js js\core\scenario_post_apply_effects.js`
- `python -m unittest tests.test_runtime_hooks_boundary_contract tests.test_toolbar_split_boundary_contract -q`
- `npm run test:node:appearance-physical-owner`
- Python Playwright startup smoke: ready in 8.784s, progress 100%, overlay hidden, no page errors, no `renderOceanCoastalAccentUi` / `getPhysicalPresetHint` / `ReferenceError` fatal console entries.

Review follow-up:
- Reviewer found `dist/app` still had the old hook order. Ran `python tools\build_pages_dist.py` and added the same hook-order contract for `dist/app/js/ui/toolbar.js`.
- The dist build synchronized all current source WIP into `dist/app`; commit/stage scope needs to stay explicit.
- Static `dist/app` smoke on `http://127.0.0.1:8832/app/`: ready in 5.248s, progress 100%, overlay hidden, no page errors, no fatal ReferenceError entries. The only 404 was `/.runtime/dev/active_server.json`, a dev metadata probe absent from the static server.
