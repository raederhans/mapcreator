# Render Transaction Diagnostics Plan

Date: 2026-06-21
Owner: main Codex agent
Task grade: complex plus integration
Branch: `codex/render-transaction-diagnostics-20260621`
Base: `main@967d9f58ce019a03b7db67fc22257f06cf678466`, aligned with `origin/main`

## Goal

Build first-stage visible-correctness diagnostics for Scenario Forge render transactions. The result must expose which scenario apply, chunk selection, chunk promotion, color rebuild, render pass invalidation, and visible frame event produced the current screen.

## Boundaries

- Add lightweight diagnostics, snapshot helpers, warning recording, and tests.
- Keep scenario switching behavior, chunk selection policy, color fallback priority, Atlantropa data policy, render budgets, LOD thresholds, and performance thresholds unchanged.
- Use existing runtime metrics and state objects where practical: `renderPerfMetrics`, `scenarioPerfMetrics`, `visibleFrameTransaction`, `runtimeChunkLoadState`, `activeScenarioChunks`, and `renderDiagnostics`.
- Main Codex agent owns live commands. Subagents may do static mapping or review.

## Work Plan

- [x] Map existing state fields and insertion points in scenario apply, post apply, chunk runtime, scenario resources, map renderer, and color resolver.
- [x] Add a small diagnostics module with bounded snapshots, identity builder, warning recording, optional global exposure, and cheap count helpers.
- [x] Insert snapshots at the required transaction phases without changing behavior.
- [x] Add invariant warnings for stale scenario/epoch/chunk/color/layer/frame signals.
- [x] Extend focused Node tests for diagnostics contracts.
- [x] Run targeted syntax, Node tests, diff check, and Pages dist verification where relevant.
- [x] Run independent code-reviewer and architect review lanes, fix merge-blocking issues, then merge to main and push.

## Acceptance Checks

- Snapshot identity includes scenario apply epoch, render transaction epoch, scene generation, scenario data generation, topology revision, color revision, and selection version.
- `globalThis.__scenarioForgeRenderTransactions` exposes latest and ring buffer data when diagnostics mode is enabled.
- Ring buffer stays bounded.
- Required warning codes are implemented and test-covered.
- TNO and non-TNO optional layer coverage can be diagnosed, including `scenario_atlantropa`.
- Color diagnostics can expose empty resolved color state and unproven pending edit clear events.
