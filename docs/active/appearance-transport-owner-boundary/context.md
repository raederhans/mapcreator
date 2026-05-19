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
