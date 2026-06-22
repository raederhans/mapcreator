# Layer Panel Contract Foundation Context

## Current Facts

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-layer-panel-contract-foundation`
- Branch: `codex/layer-panel-contract-foundation-20260621`
- Base: `origin/main@a023e4a3a764ef30143598ef3f761deea43f515c`
- Parent checkout: clean `main@a023e4a3a764ef30143598ef3f761deea43f515c`
- Live process owner: main Codex agent.
- Subagents: none active.

## Findings

- `appearance_controls_controller.js` owned a local `layerStatusAnchorById` map.
- `layer_status_diagnostics.js` owned local `LAYER_DEFINITIONS`.
- Transport family support already has a single source in `js/core/transport_capability_registry.js`.
- Workbench-only status text is built from unsupported transport family diagnostics.
- Bathymetry disabled text is produced by `buildBathymetryDiagnostic`.

## Implementation Notes

- Added `js/ui/toolbar/layer_panel_contracts.js`.
- The contract module exposes base layer contracts, transport contracts, status anchor lookup, disabled reason lookup, and unsupported reason lookup.
- Transport contract support is derived from `supportsTransportCapabilityOverview(...)` and `getTransportOverviewVisibilityField(...)`.
- Diagnostics now read base layer definitions and transport family contracts from the contract module.
- Appearance shell now reads status anchors from the contract module.
- Contract module has no DOM access, state writes, renderer imports, or dirty-render calls.

## Verification So Far

- `node --check js\ui\toolbar\layer_panel_contracts.js`: passed.
- `node --check js\ui\toolbar\layer_status_diagnostics.js`: passed.
- `node --check js\ui\toolbar\appearance_controls_controller.js`: passed.
- `npm run test:node:layer-panel-contracts`: 5/5 passed.
- `npm run test:node:layer-status-diagnostics`: 5/5 passed.
- `npm run verify:toolbar-split-boundary`: 53/53 passed.
- `npm run test:node:toolbar-render-scheduler`: 7/7 passed.
- `npm run test:node:appearance-texture-owner`: 12/12 passed.
- `npm run test:node:appearance-presets`: 10/10 passed.
- `npm run test:node:transport-appearance-controller`: 3/3 passed.
- `npm run test:node:appearance-city-points-owner`: 6/6 passed.
- `npm run test:node:appearance-physical-owner`: 7/7 passed.
- `npm run test:node:appearance-border-owner`: 3/3 passed.
- `npm run test:node:appearance-parent-border-owner`: 6/6 passed.
- `npm run test:node:appearance-rivers-owner`: 4/4 passed.
- `npm run test:node:appearance-reference-owner`: 5/5 passed.
- `npm run verify:test-import-graph`: passed.
- `npm run verify:architecture-boundaries`: passed.
- `npm run verify:state-write-allowlist`: passed with 112 tracked files.
- `npm run test:node:scenario-chunk-contracts`: 55/55 passed.
- `npm run verify:pages-dist`: builder passed, startup shell 38/38 passed, landing showcase 8/8 passed.
- `git diff --check`: passed.

## Remaining Work

- Commit Stage C branch.
- Integrate Stage C into `main`, push, and clean completed worktrees.
