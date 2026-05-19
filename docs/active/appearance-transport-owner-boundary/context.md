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

## 2026-05-19 transport workbench state owner slice

- Ultragoal status: `G001-mapcreator-appearance-transport-o` remains `in_progress`.
- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-state-owner-2026-05-19`.
- Live process ownership: main thread only.
- Static evidence lanes split on ordering: preview runtime listener movement is smaller, while state-owner movement has stronger architecture value. This slice chose state owner because direct `transportWorkbenchUi` writes and config mutation branching were still concentrated in the controller after config/apply/preview extraction.
- Chosen boundary: extract `js/ui/toolbar/transport_workbench_state_owner.js`.
- Kept in `transport_workbench_controller.js`: DOM events, shell rendering, pack select UI, preview lifecycle owner wiring, apply bridge owner wiring, render context, and repaint sequencing after state changes.
- Moved to state owner: UI state normalization, active pack/family/tab mutations, compare-held mutation, family/display config writes, section open state, layer order movement, and open/close restore flags.
- The new Node behavior test exposed that repeated ensure calls could erase a dragged layer order. The state owner now preserves the previous layer order before applying the shared state normalizer.
- Final static review found no blocker. Its coverage recommendation was fixed by adding behavior assertions for open/close restore flags and family-local active pack restoration.
- Tests updated:
  - `tests/test_toolbar_split_boundary_contract.py` now requires the state owner, keeps controller facade wiring, and checks state mutation helpers moved out of the controller.
  - `tests/test_state_write_guardrail_contract.py` now expects the state owner, not the controller, in the direct state writer allowlist.
  - `tests/transport_workbench_state_owner_behavior.test.mjs` covers object identity, active pack writes, family-local active pack restoration, open/close restore flags, compare-mode read-only config behavior, density display writes, and layer-order preservation.
  - `package.json` exposes `test:node:transport-workbench-state-owner` so the new behavior test has a named entrypoint.
- Initial verification passed:
  - `node --check js/ui/toolbar/transport_workbench_state_owner.js`
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py tests/test_state_write_guardrail_contract.py tests/test_transport_workbench_manifest_runtime_contract.py`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_state_write_guardrail_contract -q`
  - `npm run test:node:transport-workbench-state-owner`
  - `node tools/check_state_write_allowlist.mjs`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_state_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js')"`
- Pushed implementation to `origin/main` as `b9835bd`. The local main worktree still has unrelated uncommitted archive/lessons changes, so merge/push used the clean state-owner worktree and left those local changes untouched.

## 2026-05-19 transport workbench preview runtime hooks owner slice

- Ultragoal status: `G001-mapcreator-appearance-transport-o` remains `in_progress`.
- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-preview-runtime-owner-2026-05-19`.
- Live process ownership: main thread only.
- Static evidence lanes split on whether runtime listener registration should remain in the controller. Current code showed a narrow owner-owned lifecycle move was still useful: preview warmup, carrier view listener registration, and family preview selection listeners all target preview lifecycle behavior, while the controller only needs a toolbar-visible initialization entrypoint.
- Chosen boundary: extend `js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js` with `initializeRuntimeHooks()`.
- Moved to preview lifecycle owner: warmup scheduling, idle warmup execution, warmup failure reporting, carrier view listener registration, runtime family selection listener registration, and selection-triggered lens/inspector refresh.
- Kept in `transport_workbench_controller.js`: DOM buttons, shell rendering, current render context construction, panel open/close, and the exported `initializeTransportWorkbenchRuntime()` facade.
- The move exposed a real lifecycle risk: `destroyTransportWorkbenchCarrier()` clears the carrier view listener during close, while runtime initialization happens once from `toolbar.js`. The preview lifecycle owner now reattaches runtime listeners after `dispose()` so close/open does not leave preview view sync detached.
- Tests updated:
  - `tests/test_toolbar_split_boundary_contract.py` now checks that warmup/listener wiring moved to preview lifecycle owner and stays out of the controller.
  - `tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs` covers warmup scheduling idempotency, warmup failure reporting, selection listener refresh behavior, and listener reattachment after dispose.
  - `package.json` exposes `test:node:transport-workbench-preview-lifecycle-owner`.
- Initial verification passed:
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js`
  - `node --check tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py tests/test_transport_workbench_manifest_runtime_contract.py`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract -q`
  - `npm run test:node:transport-workbench-preview-lifecycle-owner`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js'); console.log('imports-ok')"`
- Node emitted the existing typeless package ESM warning during module import and Node tests; the commands passed.
- Final static review requested that the new Node behavior test be included in the commit and that the dispose listener reattach test prove ordering, not only setter count.
- Review fixes:
  - `transport_workbench_preview_lifecycle_owner.js` now injects `destroyCarrier` and `destroyFamilyPreviews` for behavior tests while defaulting to the original runtime functions.
  - The Node behavior test now simulates carrier destroy clearing the listener, then asserts `dispose()` leaves a live carrier view listener after reattachment.
  - The Python split contract now locks `destroyFamilyPreviews(); destroyCarrier(); attachRuntimeListeners();` ordering.
- Added a short `lessons learned.md` note for the carrier listener lifecycle issue.
- Final verification after review fixes passed:
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js`
  - `node --check tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py tests/test_transport_workbench_manifest_runtime_contract.py tests/test_state_write_guardrail_contract.py`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_state_write_guardrail_contract -q`
  - `npm run test:node:transport-workbench-preview-lifecycle-owner`
  - `node tools/check_state_write_allowlist.mjs`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js'); console.log('imports-ok')"`
  - `git diff --check`
- Pushed implementation to `origin/main` as `8f2df85`. The local main worktree still has unrelated uncommitted archive/lessons changes, so merge/push used the clean preview-runtime-owner worktree and left those local changes untouched.

## 2026-05-19 transport workbench inspector owner slice

- Ultragoal status: `G001-mapcreator-appearance-transport-o` remains `in_progress`.
- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-inspector-owner-2026-05-19`.
- Live process ownership: main thread only.
- Static evidence lanes identified the inspector model as the next bounded workbench split: the controller was still carrying formatter logic, manifest-only rows, diagnostics rows, lens summary rows, and the large selected-family inspector model.
- Chosen boundary: extract `js/ui/toolbar/transport_workbench_inspector_owner.js`.
- Moved to inspector owner: option/timestamp/road-hidden-reason formatters, manifest-only runtime rows, per-family diagnostic rows, lens summary rows, selected-family inspector row model, state-card models, and small row/card DOM factories.
- Kept in `transport_workbench_controller.js`: tab switching, shell rendering, inspector empty-state toggling, row insertion/class decoration, current render context, preview lifecycle owner wiring, and apply bridge wiring.
- The split preserved the existing translated `Right deck` lens summary by passing the localized label from the controller into the owner model.
- Tests updated:
  - `tests/test_toolbar_split_boundary_contract.py` now requires the inspector owner and checks controller delegation.
  - `tests/test_transport_workbench_manifest_runtime_contract.py` now checks manifest variant helpers through the inspector owner because those rows moved out of the controller.
  - `tests/transport_workbench_inspector_owner_behavior.test.mjs` covers manifest-only rows, diagnostics rows, road non-ready rows, rail selected line/station rows, airport/port selected feature rows, logistics empty-filter state cards, layer status rows, and translated lens summary labels.
  - `package.json` exposes `test:node:transport-workbench-inspector-owner`.
- Static review found a behavior blocker: road non-ready, rail, airport, and port ready inspector branches were not fully moved on the first pass. The owner now carries those original branches, and the Node behavior test covers the previously missed live-preview families.
- Review also flagged the owner-level English `Right deck` fallback. The owner now expects the controller to pass the localized label and stores an empty value if a future caller misses that contract.
- Final static review found no blockers after those fixes.
- Current verification after review fixes passed:
  - `node --check js/ui/toolbar/transport_workbench_inspector_owner.js`
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check tests/transport_workbench_inspector_owner_behavior.test.mjs`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py tests/test_transport_workbench_manifest_runtime_contract.py tests/test_state_write_guardrail_contract.py`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_state_write_guardrail_contract -q`
  - `npm run test:node:transport-workbench-inspector-owner`
  - `npm run test:node:transport-workbench-preview-lifecycle-owner`
  - `npm run test:node:transport-workbench-state-owner`
  - `node tools/check_state_write_allowlist.mjs`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_inspector_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js'); console.log('imports-ok')"`
  - `git diff --check`
- Pushed implementation to `origin/main` as `2be1614`. The local main worktree still has unrelated uncommitted archive/lessons changes, so merge/push used the clean inspector-owner worktree and left those local changes untouched.

## 2026-05-19 transport workbench inspector row metadata slice

- Ultragoal status: `G001-mapcreator-appearance-transport-o` remains `in_progress`.
- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-row-meta-owner-2026-05-19`.
- Live process ownership: main thread only.
- Static evidence lanes agreed the smallest remaining inspector coupling is row class semantics: `transport_workbench_controller.js` was still deciding `is-summary`, `is-selected`, and `is-governance` from family id, row index, and row label.
- Chosen boundary: keep row ordering and row data unchanged, but move row class decisions into `transport_workbench_inspector_owner.js`.
- Moved to inspector owner: `getTransportWorkbenchInspectorRowClassNames()` and `createRow(..., rowMeta)` class application.
- Kept in controller: model retrieval, state card append, row append, empty-card visibility, and inspector tab render sequencing.
- Tests updated:
  - `tests/transport_workbench_inspector_owner_behavior.test.mjs` now covers summary, selected, governance, and non-classified family row class decisions.
  - `tests/test_toolbar_split_boundary_contract.py` now checks controller delegates row class semantics to the inspector owner.
  - `package.json` now exposes `verify:toolbar-split-boundary`.
- Initial verification passed:
  - `node --check js/ui/toolbar/transport_workbench_inspector_owner.js`
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check tests/transport_workbench_inspector_owner_behavior.test.mjs`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py tests/test_transport_workbench_manifest_runtime_contract.py`
  - `npm run test:node:transport-workbench-inspector-owner`
  - `npm run verify:toolbar-split-boundary`
  - `python -m unittest tests.test_transport_workbench_manifest_runtime_contract -q`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_state_write_guardrail_contract -q`
  - `node tools/check_state_write_allowlist.mjs`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_inspector_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js'); console.log('imports-ok')"`
  - `git diff --check`
- Static review found no blocker. Its coverage recommendation was fixed by adding a lightweight fake-DOM assertion that `createRow(..., rowMeta)` applies the owner-computed classes to the returned row.
- Final verification after review fix passed:
  - `node --check js/ui/toolbar/transport_workbench_inspector_owner.js`
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check tests/transport_workbench_inspector_owner_behavior.test.mjs`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py tests/test_transport_workbench_manifest_runtime_contract.py`
  - `npm run test:node:transport-workbench-inspector-owner`
  - `npm run verify:toolbar-split-boundary`
  - `python -m unittest tests.test_transport_workbench_manifest_runtime_contract -q`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_state_write_guardrail_contract -q`
  - `node tools/check_state_write_allowlist.mjs`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_inspector_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js'); console.log('imports-ok')"`
  - `git diff --check`
- Pushed implementation to `origin/main` as `bbe20fc`. The local main worktree still has unrelated uncommitted archive/lessons changes, so merge/push used the clean row-metadata worktree and left those local changes untouched.

## 2026-05-19 transport workbench layer order owner slice

- Ultragoal status: `G001-mapcreator-appearance-transport-o` remains `in_progress`.
- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-layer-order-owner-2026-05-19`.
- Live process ownership: main thread only.
- Static evidence lanes recommended extracting the full layer-order panel owner, not only the status text model, because DOM rendering, drag state, drop side effects, and live/metadata/reserved copy were all one surface.
- Chosen boundary: extract `js/ui/toolbar/transport_workbench_layer_order_owner.js`.
- Moved to layer-order owner: layer-order row model, translated status/caption copy, drag start/end/over/drop event wiring, private dragged-family state, dirty marking callback, panel rerender, and inspector refresh callback.
- Kept in `transport_workbench_controller.js`: state owner wiring, render context construction, preview lifecycle callback entrypoint, and layer-panel visibility toggling.
- Tests updated:
  - `tests/test_toolbar_split_boundary_contract.py` now checks the layer-order owner boundary and confirms drag/status copy left the controller.
  - `tests/transport_workbench_layer_order_owner_behavior.test.mjs` covers row models, live status class, successful drop side-effect order, and failed drop no-op behavior.
  - `package.json` exposes `test:node:transport-workbench-layer-order-owner`.
- Initial verification passed:
  - `node --check js/ui/toolbar/transport_workbench_layer_order_owner.js`
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check tests/transport_workbench_layer_order_owner_behavior.test.mjs`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_state_write_guardrail_contract -q`
  - `npm run test:node:transport-workbench-layer-order-owner`
  - `npm run test:node:transport-workbench-preview-lifecycle-owner`
  - `npm run test:node:transport-workbench-state-owner`
  - `npm run test:node:transport-workbench-inspector-owner`
  - `npm run verify:toolbar-split-boundary`
  - `node tools/check_state_write_allowlist.mjs`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_layer_order_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js'); console.log('imports-ok')"`
  - `git diff --check`
- Static review requested two narrow fixes:
  - restore unconditional inspector refresh after a successful layer-order drop, matching the old `move -> dirty -> context -> rerender -> inspector` contract.
  - lock controller-to-owner wiring for UI namespace translation, render context, and inspector refresh callbacks in the Python boundary contract.
- Review fixes applied:
  - `transport_workbench_layer_order_owner.js` now calls `renderInspector(context.family, context.config, context.compareHeld)` unconditionally after rerender.
  - `tests/transport_workbench_layer_order_owner_behavior.test.mjs` now covers the unconditional inspector refresh contract.
  - `tests/test_toolbar_split_boundary_contract.py` now asserts `translate`, `moveLayerOrder`, `getRenderContext`, and `renderInspector` wiring.
- Verification after review fixes passed:
  - `node --check js/ui/toolbar/transport_workbench_layer_order_owner.js`
  - `node --check tests/transport_workbench_layer_order_owner_behavior.test.mjs`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py`
  - `npm run test:node:transport-workbench-layer-order-owner`
  - `npm run verify:toolbar-split-boundary`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_state_write_guardrail_contract -q`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_layer_order_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js'); console.log('imports-ok')"`
  - `git diff --check`
- Final static re-review approved the layer-order owner boundary after the fixes. Remaining risk is limited to live browser behavior, which is intentionally not part of this current verification lane.
- Pushed implementation to `origin/main` as `0784ff4`. The local main worktree still has unrelated uncommitted archive/lessons changes, so merge/push used the clean layer-order worktree and left those local changes untouched.

## 2026-05-19 transport workbench right deck owner slice

- Ultragoal status: `G001-mapcreator-appearance-transport-o` remains `in_progress`.
- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-next-owner-2026-05-19`.
- Live process ownership: main thread only.
- Static evidence lanes converged on the right-deck control panel as the next performance/architecture slice: config changes were rebuilding all five right-deck tab mounts and duplicating tab rendering before inspector refresh.
- External performance reference: web.dev INP guidance frames interaction responsiveness around the time from input handling to the next paint, with long JavaScript and large DOM/layout work as common causes. This supports reducing per-control DOM rebuilds and keeping event handlers narrow.
- Chosen boundary: extract `js/ui/toolbar/transport_workbench_right_deck_owner.js`.
- Moved to right-deck owner: generic control DOM factory, right-deck section node creation, density family shell cards, advanced aggregation/label range controls, active-tab panel rendering, compare-held read-only guard, section-open read, and control event wiring.
- Kept in `transport_workbench_controller.js`: overlay lifecycle, render context construction, state-owner writes, pack gate/apply owner wiring, preview lifecycle calls, lens/inspector orchestration, and owner dependency injection.
- Performance-oriented behavior change: right-deck rendering now renders only the active control tab mount, and config/display updates no longer call `renderTransportWorkbenchInspectorTabs()` before `renderTransportWorkbenchInspector()` because inspector refresh already delegates to the right-deck owner.
- Tests updated:
  - `tests/test_toolbar_split_boundary_contract.py` now checks the right-deck owner boundary and confirms control schema/tab map/control DOM factories left the controller.
  - `tests/transport_workbench_right_deck_owner_behavior.test.mjs` covers toggle/select/range/multi commits, compare-held read-only controls, active-tab-only rendering, section-open/toggle behavior, and advanced range display-config writes.
  - `package.json` exposes `test:node:transport-workbench-right-deck-owner`.
- Initial verification passed:
  - `node --check js/ui/toolbar/transport_workbench_right_deck_owner.js`
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check tests/transport_workbench_right_deck_owner_behavior.test.mjs`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py`
  - `npm run test:node:transport-workbench-right-deck-owner`
  - `npm run verify:toolbar-split-boundary`
  - `npm run test:node:transport-workbench-state-owner`
  - `npm run test:node:transport-workbench-preview-lifecycle-owner`
  - `npm run test:node:transport-workbench-inspector-owner`
  - `npm run test:node:transport-workbench-layer-order-owner`
- Final static re-review approved the right-deck owner boundary after the compare-held fixes. Remaining risk is limited to live browser feel and a later pass to see whether full `renderTransportWorkbenchUi()` still does redundant right-deck work.
- Pushed implementation to `origin/main` as `af3351f`. The local main worktree still has unrelated uncommitted archive/lessons changes, so merge/push used the clean right-deck worktree and left those local changes untouched.
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_state_write_guardrail_contract -q`
  - `node tools/check_state_write_allowlist.mjs`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_right_deck_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js'); console.log('imports-ok')"`
  - `git diff --check`
- Static review requested a compare-held fix: density shell card controls and advanced ranges were still writable while baseline compare was held.
- Review fixes applied:
  - `transport_workbench_right_deck_owner.js` now passes `compareHeld` through shell/advanced control factories, disables those inputs, and short-circuits their handlers.
  - `transport_workbench_controller.js` now also returns early from display-config writes while compare is held.
  - `tests/transport_workbench_right_deck_owner_behavior.test.mjs` now covers shell/advanced compare-held read-only behavior, diagnostics body render, and active mount replacement on tab/family change.
- Verification after review fixes passed:
  - `node --check js/ui/toolbar/transport_workbench_right_deck_owner.js`
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check tests/transport_workbench_right_deck_owner_behavior.test.mjs`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py`
  - `npm run test:node:transport-workbench-right-deck-owner`
  - `npm run verify:toolbar-split-boundary`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_state_write_guardrail_contract -q`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_right_deck_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js'); console.log('imports-ok')"`
  - `git diff --check`
  - `npm run test:node:transport-workbench-state-owner`
  - `npm run test:node:transport-workbench-preview-lifecycle-owner`
  - `npm run test:node:transport-workbench-inspector-owner`
  - `npm run test:node:transport-workbench-layer-order-owner`

## 2026-05-19 transport workbench right deck render dedupe slice

- Ultragoal status: `G001-mapcreator-appearance-transport-o` remains `in_progress`.
- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-rightdeck-dedupe-2026-05-19`.
- Live process ownership: main thread only.
- Follow-up from the right-deck owner review: full `renderTransportWorkbenchUi()` still reached the right-deck active tab once through shell and once through inspector.
- Chosen boundary: keep `renderTransportWorkbenchShell()` focused on shell chrome and remove its right-deck tab render. `renderTransportWorkbenchInspector()` remains the single right-deck active-tab render path.
- Tests updated:
  - `tests/test_toolbar_split_boundary_contract.py` now checks that shell-context right-deck rendering is not reintroduced.
- Initial verification passed:
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py`
  - `npm run verify:toolbar-split-boundary`
  - `npm run test:node:transport-workbench-right-deck-owner`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_controller.js'); console.log('imports-ok')"`
  - `git diff --check`
- Static review requested stronger contract coverage. The contract now extracts `renderTransportWorkbenchShell()` and asserts it contains no right-deck/inspector render entrypoints, while also checking that full UI render still runs shell -> lens -> inspector.
- Second static review requested apply shell-only contract coverage. The contract now extracts the apply button click listener and asserts it refreshes shell only, while also checking shell still owns apply button chrome updates.
- Verification after review fix passed:
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py`
  - `npm run verify:toolbar-split-boundary`
  - `git diff --check`
- Final static re-review approved the right-deck dedupe boundary.
- Implementation commit `f2c164a` was pushed to `origin/main`; closeout docs are the only remaining work in this slice before worktree cleanup.

## 2026-05-19 transport workbench inspector detail cache slice

- Ultragoal status: `G001-mapcreator-appearance-transport-o` remains `in_progress`.
- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-inspector-owner-2026-05-19`.
- Live process ownership: main thread only.
- Static subagent recommendation: reduce repeated inspector rebuilds inside `transport_workbench_inspector_owner.js` by comparing a rendered model signature before replacing DOM.
- Chosen boundary: keep controller orchestration unchanged and move inspector detail DOM ownership into the inspector owner.
- Implemented:
  - `buildTransportWorkbenchInspectorRenderSignature()` serializes the rendered row/card model.
  - `renderInspectorDetails()` reuses the current detail DOM when family, compare state, and rendered model signature are unchanged.
  - Controller now passes `detailsNode`, `emptyCard`, family, config, preview snapshot, and data contract to the inspector owner.
- Tests updated:
  - `tests/test_toolbar_split_boundary_contract.py` locks controller delegation and prevents direct row/card DOM rebuild from returning to `renderTransportWorkbenchInspector()`.
  - `tests/transport_workbench_inspector_owner_behavior.test.mjs` covers same-model reuse and changed-model invalidation.
- Verification passed:
  - `node --check js/ui/toolbar/transport_workbench_inspector_owner.js`
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check tests/transport_workbench_inspector_owner_behavior.test.mjs`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py`
  - `npm run test:node:transport-workbench-inspector-owner`
  - `npm run verify:toolbar-split-boundary`
  - `npm run test:node:transport-workbench-right-deck-owner`
  - `npm run test:node:transport-workbench-preview-lifecycle-owner`
  - `npm run test:node:transport-workbench-state-owner`
  - `npm run test:node:transport-workbench-layer-order-owner`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_state_write_guardrail_contract -q`
  - `node tools/check_state_write_allowlist.mjs`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_inspector_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js'); console.log('imports-ok')"`
  - `git diff --check`
- Final static review requested; live process ownership remains with the main thread.
- Static review approved the implementation and requested only an optional empty-model coverage enhancement. Added a Node test that keeps the empty card visible for empty inspector detail models and verifies same-empty-model reuse.
- Verification after the empty-model coverage enhancement passed:
  - `node --check tests/transport_workbench_inspector_owner_behavior.test.mjs`
  - `npm run test:node:transport-workbench-inspector-owner`
  - `npm run verify:toolbar-split-boundary`
  - `git diff --check`
- Implementation commit `112a6cd` was pushed to `origin/main`; closeout docs are the only remaining work in this slice before worktree cleanup.

## 2026-05-19 transport workbench shell pack select cache slice

- Ultragoal status: `G001-mapcreator-appearance-transport-o` remains `in_progress`.
- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-shell-pack-cache-2026-05-19`.
- Live process ownership: main thread only.
- Remaining shell hot path: every shell refresh rebuilt `transportWorkbenchPackSelect` options even when the family pack list did not change.
- Chosen boundary: add a narrow helper inside `transport_workbench_controller.js` that compares the pack id/label signature and only calls `replaceChildren()` when the option list changes.
- Behavior kept: shell refresh still recomputes the available packs, disabled state, and selected active pack value every time.
- Tests updated:
  - `tests/test_toolbar_split_boundary_contract.py` now checks that `renderTransportWorkbenchShell()` delegates pack-select rendering and no longer calls `transportWorkbenchPackSelect.replaceChildren()` directly.
  - `tests/transport_workbench_controller_behavior.test.mjs` covers same-signature option reuse, selected value refresh, disabled-state refresh, and rebuild on list change.
  - `package.json` exposes `test:node:transport-workbench-controller`.
- Verification passed:
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check tests/transport_workbench_controller_behavior.test.mjs`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py`
  - `npm run test:node:transport-workbench-controller`
  - `npm run verify:toolbar-split-boundary`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_controller.js'); console.log('imports-ok')"`
  - `npm run test:node:transport-workbench-inspector-owner`
  - `npm run test:node:transport-workbench-right-deck-owner`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_state_write_guardrail_contract -q`
  - `npm run test:node:transport-workbench-state-owner`
  - `node tools/check_state_write_allowlist.mjs`
  - `git diff --check`
- Static review approved the approach and requested behavior coverage for option reuse with value/disabled refresh. The new `test:node:transport-workbench-controller` entry now covers that case.
- Final narrow static review agents timed out after repeated waits; main-thread review found no stale option/value/disabled path because the helper recomputes pack options every shell render, caches only the option DOM signature, and still writes `disabled` plus `value` outside the rebuild branch.
- Implementation commit `a676562` was pushed to `origin/main`; closeout docs are the only remaining work in this slice before worktree cleanup.

## 2026-05-19 transport workbench lens owner slice

- Ultragoal status: `G001-mapcreator-appearance-transport-o` remains `in_progress`.
- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-lens-owner-2026-05-19`.
- Live process ownership: main thread only.
- Remaining lens hot path: `renderTransportWorkbenchLensSections()` was still clearing and rebuilding the left lens column during full UI refreshes, config updates, display updates, and preview lifecycle refreshes.
- Chosen boundary: create `js/ui/toolbar/transport_workbench_lens_owner.js`.
- Implemented:
  - Lens owner builds the layers empty card and regular review-focus/current-context cards.
  - Lens owner signs the final card/row model and skips mount `replaceChildren()` when the rendered output is unchanged.
  - Controller now passes family, preview snapshot, data contract, compare state, and translated right-deck label into the lens owner.
- Tests updated:
  - `tests/test_toolbar_split_boundary_contract.py` locks the lens owner boundary and prevents direct lens DOM/card construction from returning to the controller.
  - `tests/transport_workbench_lens_owner_behavior.test.mjs` covers same-model reuse, compare/status invalidation, family invalidation, and layers empty-card rendering.
  - `package.json` exposes `test:node:transport-workbench-lens-owner`.
- Verification passed:
  - `node --check js/ui/toolbar/transport_workbench_lens_owner.js`
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check tests/transport_workbench_lens_owner_behavior.test.mjs`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py`
  - `npm run test:node:transport-workbench-lens-owner`
  - `npm run verify:toolbar-split-boundary`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_lens_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js'); console.log('imports-ok')"`
  - `npm run test:node:transport-workbench-controller`
  - `npm run test:node:transport-workbench-inspector-owner`
  - `npm run test:node:transport-workbench-right-deck-owner`
  - `npm run test:node:transport-workbench-preview-lifecycle-owner`
  - `npm run test:node:transport-workbench-state-owner`
  - `npm run test:node:transport-workbench-layer-order-owner`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_state_write_guardrail_contract -q`
  - `node tools/check_state_write_allowlist.mjs`
  - `git diff --check`
- Final static review: the first two reviewer lanes timed out, so a narrowed fast static lane reviewed the lens signature/cache boundary and returned `APPROVE`.
- Implementation commit `07dd0e5` was pushed to `origin/main`; closeout docs are the only remaining work in this slice before worktree cleanup.

## 2026-05-19 transport workbench popover owner slice

- Ultragoal status: `G001-mapcreator-appearance-transport-o` remains `in_progress`.
- Worktree: `C:/Users/raede/Desktop/dev/mapcreator-transport-workbench-popover-owner-2026-05-19`.
- Live process ownership: main thread only.
- External performance standards captured for this goal:
  - INP good target is p75 interaction latency at or below 200ms.
  - Single main-thread long task threshold is 50ms.
  - Lighthouse DOM-size pressure starts around 800 body nodes and becomes severe around 1400.
  - Mapbox/MapLibre style performance depends heavily on source count, layer count, vertex count, and update scope.
- Static popover boundary review recommended moving info/help popover rendering, focus, aria state, positioning, Escape handling, and section-help button creation into a narrow owner.
- Chosen boundary: controller keeps workbench lifecycle/render orchestration; `transport_workbench_popover_owner.js` owns popover DOM and interaction details.
- Implemented:
  - New `createTransportWorkbenchPopoverOwner()` owner with info/help close/toggle/render APIs, section-help button factory, and Escape handler.
  - Controller now wires popover owner into lens/right-deck dependencies and returns existing close facades for workspace support coordination.
  - New `tests/transport_workbench_popover_owner_behavior.test.mjs` covers info/help mutual exclusion, aria state, section help positioning, same-trigger collapse, focus restore, Escape close, and unsupported help section null behavior.
  - `tests/test_toolbar_split_boundary_contract.py` now locks popover owner import/delegation and prevents popover render/helper implementations from returning to the controller.
- Implementation commit `55e2ff7` is local; push is pending this closeout doc commit.
- Verification passed:
  - `node --check js/ui/toolbar/transport_workbench_popover_owner.js`
  - `node --check js/ui/toolbar/transport_workbench_controller.js`
  - `node --check tests/transport_workbench_popover_owner_behavior.test.mjs`
  - `python -m py_compile tests/test_toolbar_split_boundary_contract.py`
  - `npm run test:node:transport-workbench-popover-owner`
  - `npm run verify:toolbar-split-boundary`
  - `npm run test:node:transport-workbench-controller`
  - `npm run test:node:transport-workbench-lens-owner`
  - `npm run test:node:transport-workbench-right-deck-owner`
  - `npm run test:node:transport-workbench-inspector-owner`
  - `npm run test:node:transport-workbench-preview-lifecycle-owner`
  - `npm run test:node:transport-workbench-state-owner`
  - `npm run test:node:transport-workbench-layer-order-owner`
  - `python -m unittest tests.test_toolbar_split_boundary_contract tests.test_transport_workbench_manifest_runtime_contract tests.test_state_write_guardrail_contract -q`
  - `node tools/check_state_write_allowlist.mjs`
  - `node --input-type=module -e "await import('./js/ui/toolbar/transport_workbench_popover_owner.js'); await import('./js/ui/toolbar/transport_workbench_controller.js'); console.log('imports-ok')"`
  - `git diff --check`
- Final static review approved the popover owner boundary. It found no blocking issues and confirmed aria/focus/mutual-exclusion/Escape behavior plus controller delegation.
- Known noise: Node still reports the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for ES module tests; this slice did not widen the package-level module setting.
