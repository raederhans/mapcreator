# Layer Panel Contract Foundation Plan

Started: 2026-06-21 21:14 -04:00
Branch: `codex/layer-panel-contract-foundation-20260621`
Base: `origin/main@a023e4a3a764ef30143598ef3f761deea43f515c`

## Goal

Create a lightweight layer and panel contract foundation for Appearance, Map Content, Transport, and Workbench-only transport families.

## Scope

1. Add a read-only contract module under `js/ui/toolbar/`.
2. Move status anchor ownership out of `appearance_controls_controller.js`.
3. Move base layer diagnostic definitions out of `layer_status_diagnostics.js`.
4. Derive transport overview and workbench-only support from `transport_capability_registry.js`.
5. Keep current UI copy, default visual parameters, renderer behavior, and scenario save format unchanged.

## Non-goals

1. Visual tuning.
2. Large UI layout changes.
3. New appearance controls.
4. Class-based road or rail styling.
5. Full panel registry migration.
6. Renderer rewrite.

## Verification Plan

1. `node --check` on changed JS modules.
2. `npm run test:node:layer-panel-contracts`.
3. `npm run test:node:layer-status-diagnostics`.
4. `npm run test:node:toolbar-render-scheduler`.
5. `npm run test:node:appearance-texture-owner`.
6. `npm run test:node:appearance-presets`.
7. `npm run test:node:transport-appearance-controller`.
8. `npm run verify:toolbar-split-boundary`.
9. `npm run verify:test-import-graph`.
10. `npm run verify:architecture-boundaries`.
11. `npm run verify:state-write-allowlist`.
12. `npm run test:node:scenario-chunk-contracts`.
13. `npm run verify:pages-dist`.
14. `git diff --check`.

## Progress

- [x] Create Stage C worktree from current `origin/main`.
- [x] Add `layer_panel_contracts.js`.
- [x] Route diagnostics through layer panel contracts.
- [x] Route status anchors through layer panel contracts.
- [x] Add contract behavior tests and toolbar split boundary coverage.
- [ ] Run full Stage C verification set.
- [ ] Refresh Pages dist.
- [ ] Commit and integrate.
