# Physical intensity interaction closure plan

## Goal
- Make Physical intensity fields editable from the map, with undo/redo, save/load, and Atlas/Contour channel support.
- Collapse the temporary `physicalIntensityField` mirror into canonical `intensityFields.channels.<id>`.
- Finish the remaining appearance constants cleanup and validate Day/Night cycle behavior.

## Acceptance
- Local work happens in `C:\Users\raede\Desktop\dev\mapcreator-physical-intensity-closure` on `codex/physical-intensity-interaction-closure`.
- No product commit includes parent checkout `.omx/metrics.json` runtime noise.
- `physicalIntensityField` is removed from source state, history, save payload, and UI logic.
- Old projects containing `physicalIntensityField.points` import into `intensityFields.channels.physicalAtlas.points` when the Atlas channel has no points.
- Physical Atlas and Physical Contour can be painted/erased from the map and managed through points mode.
- Radius is stored as `radiusDeg`; km is display text only.
- Targeted node/Python/e2e tests pass, plus final review and `git diff --check`.

## Phases
- [x] Phase 0: constants cleanup and Day/Night validation.
- [x] Phase 1: remove duplicate Physical intensity state and add import migration.
- [x] Phase 2: windowed brush stamp and incremental composite bake.
- [x] Phase 3: renderer tool state, pointer interaction, history, and SVG editor layer.
- [x] Phase 4: Physical panel UI for channel/tool/points/clear.
- [x] Phase 5: verification, review, fixes, commit, push, and worktree cleanup.

## Closeout Evidence
- Node behavior: `node --test tests/intensity_field.node.test.mjs tests/appearance_physical_owner_behavior.test.mjs tests/file_manager_project_roundtrip_behavior.test.mjs tests/physical_layer_contracts.test.mjs`.
- Runtime/static contracts: `python -m unittest tests.test_runtime_hooks_boundary_contract tests.test_history_manager_strategic_overlay_contract tests.test_toolbar_split_boundary_contract -q`.
- Parent border constants: `npm run test:node:appearance-parent-border-owner`.
- State write boundary: `npm run verify:state-write-allowlist`.
- Pages delivery mirror: `npm run verify:pages-dist`.
- E2E: `physical_layer_runtime_contract.spec.js`, `physical_layer_regression.spec.js`, `city_lights_layer_regression.spec.js`.
- Whitespace: `git diff --check`.

## Live Process Ownership
- Main agent owns all live tests, browser/dev server, git writes, and shared-file integration.
- Subagents may read files and perform static review only unless explicitly assigned a disjoint write scope later.
- Shared files `index.html`, `css/style.css`, and `js/ui/toolbar.js` are integrated serially by the main agent.
