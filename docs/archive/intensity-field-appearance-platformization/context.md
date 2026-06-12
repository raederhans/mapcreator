# Context

## 2026-06-12 Start

- Active branch: `codex/intensity-appearance-platform`.
- Base commit: `60d76b91 Keep progressive recovery colors visible across full render paths`.
- Parent `main` has unrelated local WIP in i18n, appearance owners, dist app, `.omx/metrics.json`, and `lessons learned.md`.
- OMX ultragoal artifacts created in `.omx/ultragoal` with five goals: Phase 0, Phase 1, Phase 2, Phase 3, and Verification/Landing.
- `docs/shared/agent-tiers.md` was read. This task is THOROUGH because it crosses UI, state, renderer, backend, shared contracts, and dist delivery.

## Live Process Ownership

- Main thread owns all live tests/builds until this document states otherwise.
- Subagents may do static code search, static review, and test-plan critique from completed outputs.

## 2026-06-12 Phase 0 Complete

- Added SVG brush-radius preview for the active intensity-field tool in `js/core/map_renderer.js`.
- Added `intensityFields` to backend shared-project community-download allowlist.
- Added a scenario runtime contract asserting activation commits preserve global `intensityFields`.
- Verification passed:
  - `node --test tests/scenario_runtime_state_behavior.test.mjs tests/intensity_field.node.test.mjs`
  - `python -m unittest tests.test_backend_service.BackendServiceTest.test_community_download_omits_local_only_project_fields -q`
  - `node --check js/core/map_renderer.js`

## 2026-06-12 Phase 1 Complete

- Added `urbanGlow` to the intensity-field registry with `contextBase` and `dayNight` target passes.
- Replaced Physical's embedded field editor with shared `intensity_field_editor_section.js`, then reused the same editor for Urban Glow controls.
- Wired `urbanGlow` into Urban fill/stroke, modern city lights, historical night lights, context/dayNight signatures, and city-light static cache keys.
- Added targeted tests for registry target passes, shared editor behavior, project import/export, state writer allowlist, and renderer urban/city glow contracts.
- Verification passed:
  - `node --check js/core/intensity_field.js; node --check js/core/map_renderer.js; node --check js/ui/toolbar/intensity_field_editor_section.js; node --check js/ui/toolbar/appearance_physical_owner.js; node --check js/ui/toolbar/appearance_controls_controller.js`
  - `npm run test:node:intensity-field`
  - `npm run test:node:appearance-physical-owner`
  - `node --test tests/file_manager_project_roundtrip_behavior.test.mjs --test-name-pattern "intensity fields"`
  - `npm run verify:state-write-allowlist`
  - `npm run verify:toolbar-split-boundary`
  - `python -m unittest tests.test_state_write_guardrail_contract -q`
  - `npm run test:node:scenario-runtime-state-behavior`
  - `python -m unittest tests.test_map_renderer_urban_city_policy_boundary_contract -q`

## 2026-06-12 Phase 2 Complete

- Added `oceanDepth` to the intensity-field registry as a `passMask` channel targeting the `background` pass.
- Added `js/core/renderer/intensity_field_mask_owner.js` to bake intensity-grid values into cached grayscale mask canvases with channel invalidation.
- Wired `drawOceanDepthMaskLayer()` into `drawBackgroundPass()` after `drawOceanStyle()`, with `applyOceanClipMask(...)`, `soft-light`, identity pixel drawing, and background signature revision token.
- Reused `intensity_field_editor_section.js` in Ocean controls through `oceanDepthField*` DOM nodes.
- Added targeted mask-owner and Ocean depth layer contract tests, plus project roundtrip coverage for `oceanDepth`.
- Verification passed:
  - `node --check js/core/renderer/intensity_field_mask_owner.js`
  - `node --check js/core/map_renderer.js`
  - `node --check js/ui/toolbar/ocean_lake_controls_controller.js`
  - `npm run test:node:intensity-field`
  - `npm run test:node:intensity-field-mask`
  - `npm run test:node:ocean-depth-layer-contracts`
  - `node --test tests/file_manager_project_roundtrip_behavior.test.mjs --test-name-pattern "intensity fields"`
  - `npm run verify:state-write-allowlist`
  - `npm run verify:toolbar-split-boundary`

## 2026-06-12 Phase 3 Complete

- Added `js/core/state/appearance_preset_state.js` as the canonical top-level `appearancePresets` model.
- Presets capture normalized `styleConfig`, layer visibility, and `intensityFields`, while excluding private `referenceImageState` payloads.
- Wired `appearancePresets` into default runtime state, project export/import normalization, interaction funnel restoration, backend shared-project allowlist, and history snapshots.
- Added `js/ui/toolbar/appearance_presets_owner.js` plus a Presets tab in the Appearance panel for save, apply, import, export, selection, and deletion.
- Added targeted state, owner, history, file roundtrip, and backend tests.
- Verification passed:
  - `npm run test:node:appearance-presets`
  - `node --test tests/file_manager_project_roundtrip_behavior.test.mjs --test-name-pattern "appearance presets|intensity fields"`
  - `python -m unittest tests.test_backend_service -q`
  - `npm run verify:state-write-allowlist`
  - `npm run verify:toolbar-split-boundary`
  - `npm run test:node:intensity-field`
  - `npm run test:node:appearance-physical-owner`
  - `npm run test:node:appearance-texture-owner`
  - `npm run test:node:intensity-field-mask`
  - `npm run test:node:ocean-depth-layer-contracts`
  - `python -m unittest tests.test_state_write_guardrail_contract -q`
  - `npm run verify:pages-dist`

## Current Status

- Main thread still owns git closeout, merge/push, and worktree cleanup.
- Final read-only QA review found two preset-apply risks:
  - `dist/app` initially missed the `afterApply` hook that loads newly enabled preset layers.
  - city-points preset apply loaded scenario optional cities without first loading base city data.
- Fixes applied:
  - Rebuilt `dist/app` with `npm run verify:pages-dist`, syncing `afterApply` into the delivery tree.
  - Updated `ensureAppearancePresetLayerData()` to call `runtimeState.ensureBaseCityDataFn({ reason: "appearance-preset-apply", renderNow: true })` before `ensureActiveScenarioOptionalLayerLoaded("cities", ...)`.
  - Added boundary coverage in `tests/test_toolbar_split_boundary_contract.py` and owner coverage for the `afterApply` callback.
- Final verification passed:
  - `node --check js/ui/toolbar/appearance_controls_controller.js`
  - `npm run verify:toolbar-split-boundary` (49 tests)
  - `npm run test:node:appearance-presets` (7 tests)
  - `npm run verify:pages-dist` (34 Pages startup-shell tests and 6 landing showcase tests)
  - `git diff --check`
