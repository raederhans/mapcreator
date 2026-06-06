# Appearance + Transport Platformization Follow-up Context

## 2026-06-06 Start
- User approved continuing `$autopilot`.
- Running outside tmux Codex App; OMX question/team runtime surfaces are unavailable here, so native tools and native subagents are used.
- Parent checkout had only `.omx/metrics.json` dirty at start.
- Created isolated worktree: `C:\Users\raede\Desktop\dev\mapcreator-appearance-transport-followup`.
- Branch: `codex/appearance-transport-platformization-followup`.

## Evidence Read
- Loaded `$autopilot` and `$ultrawork` skills.
- Read `docs/shared/agent-tiers.md`.
- Read `lessons learned.md`.
- Read prior `.omx/plans/prd-appearance-transport-platformization-20260501.md`.
- Read prior `.omx/plans/test-spec-appearance-transport-platformization-20260501.md`.
- Read archived `docs/archive/appearance-transport-platformization/context.md`.

## Current Finding
- `js/core/transport_capability_registry.js` already exposes overview data-layer metadata through `getTransportOverviewDataLayerKeys`.
- `js/ui/toolbar/transport_appearance_controller.js` still requested airport/port/rail/road layers through repeated hardcoded strings.
- This creates a drift point: adding or changing a supported overview family could update registry while leaving appearance toggles stale.

## Current Fix
- Imported `getTransportOverviewDataLayerKeys` into `transport_appearance_controller.js`.
- Added a private request helper that converts registry metadata into the existing `ensureContextLayerDataFn` request shape.
- Replaced master-toggle and family-toggle hardcoded preload requests with the helper.
- Added `tests/transport_appearance_controller_behavior.test.mjs` to lock the current four family requests and ordering.
- Updated `interaction_funnel.js` project import hydration to restore transport overview data layers from registry family metadata.
- Added stale preview generation coverage in `tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs`.

## Verification
- `npm run test:node:transport-appearance-controller`: 2 tests passed.
- `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_workbench_manifest_runtime_contract -q`: 77 tests passed.
- `node --test tests/transport_appearance_controller_behavior.test.mjs tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs`: 33 tests passed.
- `node --test tests/file_manager_project_roundtrip_behavior.test.mjs`: 27 tests passed after adding real project-import transport overview restore coverage.
- `node --test tests/file_manager_project_roundtrip_behavior.test.mjs tests/transport_appearance_controller_behavior.test.mjs tests/transport_workbench_preview_lifecycle_owner_behavior.test.mjs tests/transport_overview_line_strategy_scope_contract.node.test.mjs`: 60 tests passed.
- `node --check js/ui/toolbar/transport_appearance_controller.js js/core/interaction_funnel.js js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js`: passed.
- `node --check tests/file_manager_project_roundtrip_behavior.test.mjs tests/transport_appearance_controller_behavior.test.mjs js/core/interaction_funnel.js js/ui/toolbar/transport_appearance_controller.js js/ui/toolbar/transport_workbench_preview_lifecycle_owner.js`: passed.
- `python -m py_compile tests/test_global_transport_builder_contracts.py`: passed.
- `npm run verify:pages-dist`: dist build plus 24 startup-shell tests passed.
- `git diff --check`: passed with Windows line-ending warnings only.

## Review Fixes
- Static review requested behavior-level project-import coverage for transport overview layer restores.
- Added funnel-level behavior tests in `tests/file_manager_project_roundtrip_behavior.test.mjs`.
- The new tests capture `ensureContextLayerDataFn` through the central runtime hook registry and verify visible road, rail, and airport requests plus the master transport-off skip path.
- Second static review requested a named script for the new appearance controller test.
- Added `test:node:transport-appearance-controller` to `package.json` and verified it passes.
- Final static review requested restoring global state touched by the funnel-level import test.
- `importProjectThroughFunnelPayload()` now restores the previous `ensureContextLayerDataFn` runtime hook plus transport visibility state in `finally`.

## Live Process Ownership
- Main thread owns all tests, browser checks, dev server, and Pages verification for this lane.
- Subagent lane is read-only static analysis only.
