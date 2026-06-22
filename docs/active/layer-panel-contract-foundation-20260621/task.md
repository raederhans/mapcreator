# Layer Panel Contract Foundation Task

## Delivery Package

### Changed Summary

1. Added a layer panel contract module for status anchors, base layer diagnostics, transport support, and reason providers.
2. Routed layer diagnostics through contract-owned definitions.
3. Routed Appearance status strip anchors through contract-owned lookup.
4. Added focused behavior tests for contract coverage, transport registry derivation, read-only boundaries, and diagnostic summary stability.
5. Added toolbar split boundary assertions to keep anchor and diagnostic definitions out of the controller and diagnostics modules.

### Files

Core files:
- `js/ui/toolbar/layer_panel_contracts.js`
- `js/ui/toolbar/layer_status_diagnostics.js`
- `js/ui/toolbar/appearance_controls_controller.js`
- `package.json`

Test files:
- `tests/layer_panel_contracts_behavior.test.mjs`
- `tests/test_toolbar_split_boundary_contract.py`

Documentation files:
- `docs/active/layer-panel-contract-foundation-20260621/plan.md`
- `docs/active/layer-panel-contract-foundation-20260621/context.md`
- `docs/active/layer-panel-contract-foundation-20260621/task.md`
- `docs/active/_worktree_registry.md`

Generated files:
- `dist/app/js/ui/toolbar/layer_panel_contracts.js`
- `dist/app/js/ui/toolbar/layer_status_diagnostics.js`
- `dist/app/js/ui/toolbar/appearance_controls_controller.js`
- `dist/pages-dist-manifest.json`

### Diff Summary

Current source diff centralizes layer status contracts and removes local hardcoded maps from the Appearance shell and layer diagnostics module. The contract module derives transport support from the existing transport capability registry.

### Commit Status

Pending. Stage C verification and generated dist refresh passed.

### Base Divergence

Base is `origin/main@a023e4a3a764ef30143598ef3f761deea43f515c`. No newer remote commit was present at worktree creation.

### Potential Conflicts

- Direct overlap risk: future edits to `appearance_controls_controller.js`, `layer_status_diagnostics.js`, `package.json`, or `tests/test_toolbar_split_boundary_contract.py`.
- Semantic overlap risk: future transport capability registry work, layer status UI work, or Pages dist refreshes.

### Verification

Passed:
- `node --check js\ui\toolbar\layer_panel_contracts.js`
- `node --check js\ui\toolbar\layer_status_diagnostics.js`
- `node --check js\ui\toolbar\appearance_controls_controller.js`
- `npm run test:node:layer-panel-contracts`
- `npm run test:node:layer-status-diagnostics`
- `npm run verify:toolbar-split-boundary`
- `npm run test:node:toolbar-render-scheduler`
- `npm run test:node:appearance-texture-owner`
- `npm run test:node:appearance-presets`
- `npm run test:node:transport-appearance-controller`
- `npm run test:node:appearance-city-points-owner`
- `npm run test:node:appearance-physical-owner`
- `npm run test:node:appearance-border-owner`
- `npm run test:node:appearance-parent-border-owner`
- `npm run test:node:appearance-rivers-owner`
- `npm run test:node:appearance-reference-owner`
- `npm run verify:test-import-graph`
- `npm run verify:architecture-boundaries`
- `npm run verify:state-write-allowlist`
- `npm run test:node:scenario-chunk-contracts`
- `npm run verify:pages-dist`
- `git diff --check`

### Risks

- Future edits to transport capability support should continue changing `js/core/transport_capability_registry.js` first, then let contracts derive the panel support status.

### Recommended Next Step

Commit and integrate by fast-forward if `origin/main` has not advanced.
