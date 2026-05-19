# Context

## 2026-05-19 kickoff

- Ultragoal status: one active story, `G001-mapcreator-appearance-transport-o`, still `in_progress`.
- Current Codex goal matches the aggregate ultragoal objective and remains active.
- Previous performance slice landed on `main` as `82115dd Reduce startup blocking and transport appearance jank`; it is evidence for performance work, not completion of the broader owner-boundary story.
- Main working tree has unrelated `.omx/metrics.json` local noise; this slice runs in a clean worktree.
- Live process ownership: main thread only.
- Static evidence so far: largest relevant files are `transport_workbench_controller.js` (~154KB), `appearance_controls_controller.js` (~144KB), and `transport_workbench_descriptor.js` (~61KB).
- Recent lessons learned relevant here:
  - Descriptor/summary splits need runtime helper coverage, not only syntax checks.
  - rAF batching must preserve render request ordering before summary refresh.
  - Cache keys should contain only fields that change the computed result.

## Current hypothesis

The next low-risk movement toward the ultragoal is likely inside `appearance_controls_controller.js`, because transport appearance controls are tightly clustered and already have summary/descriptor helper modules. Moving a narrow control/config boundary can reduce the controller load without changing shared `toolbar.js` or transport data semantics.

## 2026-05-19 implementation notes

- Chosen boundary: move transport appearance DOM references, overview config normalization, summary refresh batching, family toggles, and transport control event bindings into `js/ui/toolbar/transport_appearance_controller.js`.
- `appearance_controls_controller.js` now keeps the facade role: it creates the transport appearance controller, exposes `renderTransportAppearanceUi`, and calls the transport controller from its existing `bindEvents()` path.
- `index.html`, `css/style.css`, and `js/ui/toolbar.js` were left unchanged.
- Tests were updated in existing contract files so transport-specific assertions read the new owner module instead of the broader appearance controller.
- Verification passed:
  - `node --check js/ui/toolbar/appearance_controls_controller.js`
  - `node --check js/ui/toolbar/transport_appearance_controller.js`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py tests/test_ui_rework_plan03_support_transport_contract.py tests/test_global_transport_builder_contracts.py tests/test_transport_facility_interactions_contract.py`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_ui_rework_plan03_support_transport_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_global_transport_builder_contracts tests.test_transport_facility_interactions_contract -q`
  - `npm run test:node:transport-overview-line-contract`
  - `npm run test:node:physical-layer-contracts`
  - `npm run verify:state-write-allowlist`
  - `git diff --check -- ...` for changed source, tests, and active docs
- `npm run test:e2e:ui-rework-support` ran after local `npm ci`; 11/14 passed. Current failures are outside this split or outside this slice:
  - special-zone current style preview missing
  - project support hint length contract
  - transport workbench port Apply remains disabled because current `transport_pack_resolver.js` has no port main-map target pack, so the bridge stays preview-only
- Final local static review found the current-scope shape sound: the old appearance facade still exposes the registered render callback, the transport-specific DOM/config/event logic is concentrated in `transport_appearance_controller.js`, and existing contract tests now watch the new owner file.
- Static reviewer found two current-scope blockers and both were fixed: `transport_appearance_controller.js` is now in the state-writer allowlist, and rail/road UI owner assertions now lock the new owner instead of `toolbar.js` string residue.
- Running the state-writer guardrail exposed existing allowlist drift for `special_zones_workbench_controller.js` and two special-zone tests; the allowlist now matches the scanner output without changing runtime behavior.
- Re-run verification after review fixes:
  - `python -m unittest tests.test_state_write_guardrail_contract tests.test_toolbar_split_boundary_contract tests.test_ui_rework_plan03_support_transport_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_global_transport_builder_contracts tests.test_transport_facility_interactions_contract -q`
  - `npm run test:node:transport-overview-line-contract`
  - `npm run test:node:physical-layer-contracts`
  - `npm run verify:state-write-allowlist`
- No new major lessons were added to `lessons learned.md`; this slice reused the existing owner-boundary lesson that split tests should follow the new owner file.

## 2026-05-19 transport workbench config owner slice

- Ultragoal status: `G001-mapcreator-appearance-transport-o` remains `in_progress`.
- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-config-owner-2026-05-19`.
- Live process ownership: main thread only.
- Static evidence lanes recommended this sequence: config/state normalization first, apply bridge later, preview lifecycle later.
- Chosen boundary: extract the pure family/config normalization matrix into `js/ui/toolbar/transport_workbench_config_owner.js`.
- Kept in `transport_workbench_controller.js` for this slice: `ensureTransportWorkbenchUiState`, `resetTransportWorkbenchSectionState`, working/display config accessors, preview rendering, DOM renderers, and apply bridge. These still have runtime and DOM coupling, so they are better handled in later focused slices.
- Tests updated:
  - `tests/test_toolbar_split_boundary_contract.py` now requires the new config owner and checks that per-family normalizers moved out of the controller.
  - The split boundary test also keeps the config owner free of runtime, DOM, network, state-write, and storage side-effect entrypoints.
  - `tests/test_transport_workbench_manifest_runtime_contract.py` now checks the label-separation normalizer in the config owner.
- Final static review found no blocker. It recommended the side-effect boundary assertion above and strict staging of the new owner file.
- Merged into `main` as `af3faca`, pushed to `origin/main`, then removed the temporary worktree and branch.
- Verification passed:
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check js/ui/toolbar/transport_workbench_config_owner.js`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_config_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js')"`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py tests/test_transport_workbench_manifest_runtime_contract.py`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_transport_manifest_contracts tests.test_state_write_guardrail_contract -q`
  - `node tools/check_state_write_allowlist.mjs`
  - `npm run test:node:transport-overview-line-contract`
- E2E was not rerun in this slice. Residual known risks remain the same as prior slice: `ui_rework_support_transport_hardening.spec.js` has existing special-zone, support-hint, and port Apply blockers outside this config-owner extraction.

## 2026-05-19 transport workbench apply bridge owner slice

- Ultragoal status: `G001-mapcreator-appearance-transport-o` remains `in_progress`.
- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-apply-owner-2026-05-19`.
- Live process ownership: main thread only.
- Static evidence lanes agreed that apply bridge is the next narrow transport workbench boundary: controller should keep DOM/event/render orchestration, while a new owner should own active pack resolution, instance-scoped pack gate cache, button state, apply patch execution, overlay state loading, dirty marking, and render trigger.
- Chosen boundary: extract `js/ui/toolbar/transport_workbench_apply_bridge_owner.js`.
- Kept in `transport_workbench_controller.js`: button click binding, shell render refresh, family/tab switching, pack select UI, preview lifecycle, and current render context.
- Tests updated:
  - `tests/test_toolbar_split_boundary_contract.py` now requires the apply bridge owner, keeps click binding in the controller, and checks apply side effects in the owner.
  - `tests/test_transport_workbench_manifest_runtime_contract.py` now checks apply order and confirms port remains preview-only until a real main-map target pack exists.
  - `tests/transport_overview_line_strategy_scope_contract.node.test.mjs` now checks that workbench apply patches expose only main-map bridge fields and keep preview-only state out.
  - `tests/test_state_write_guardrail_contract.py` now explicitly keeps the workbench controller in the state-writer allowlist.
- Final static review found no blocker. Its non-blocker on cache lifetime was fixed by moving the pack gate cache into the `createTransportWorkbenchApplyBridgeOwner` instance closure.
- Verification passed:
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check js/ui/toolbar/transport_workbench_apply_bridge_owner.js`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py tests/test_transport_workbench_manifest_runtime_contract.py tests/test_state_write_guardrail_contract.py`
  - `python -m unittest tests.test_transport_workbench_manifest_runtime_contract tests.test_toolbar_split_boundary_contract tests.test_state_write_guardrail_contract -q`
  - `node --test tests/transport_overview_line_strategy_scope_contract.node.test.mjs`
  - `npm run verify:state-write-allowlist`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_apply_bridge_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js')"`
  - `git diff --cached --check`
- Pushed implementation to `origin/main` as `080ad8b`. The local main worktree had unrelated uncommitted archive/lessons changes, so merge/push used the clean apply-owner worktree and left those local changes untouched.

## 2026-05-19 transport workbench preview lifecycle owner slice

- Ultragoal status: `G001-mapcreator-appearance-transport-o` remains `in_progress`.
- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-preview-owner-2026-05-19`.
- Live process ownership: main thread only.
- Static evidence lanes pointed at preview lifecycle as the next bounded transport workbench split. The chosen slice extracts render generation, live-preview clear/dispose, carrier preparation, view-sync RAF, and post-preview inspector refresh into `js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js`.
- Kept in `transport_workbench_controller.js`: DOM buttons, shell rendering, runtime init, warmup scheduling, selection listener wiring, render context, config updates, and apply bridge wrappers.
- Tests updated:
  - `tests/test_toolbar_split_boundary_contract.py` now requires the preview lifecycle owner and checks generation guard, view-key dedupe, RAF cancellation, dispose cleanup, and controller listener wiring.
  - `tests/test_transport_workbench_manifest_runtime_contract.py` now strengthens family preview dispatch boundaries so family preview modules stay dispatch-only and do not take carrier/runtime ownership.
- Final static review found no blocker. Its non-blocker on overly specific contract strings was fixed by keeping lifecycle boundary assertions while loosening the log message and view-key format checks.
- Verification passed:
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py tests/test_transport_workbench_manifest_runtime_contract.py`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract -q`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js')"`
  - `git diff --check -- ...` for changed source, tests, and active docs
- Pushed implementation to `origin/main` as `eb3eeeb`. The local main worktree still has unrelated uncommitted archive/lessons changes, so merge/push used the clean preview-owner worktree and left those local changes untouched.
