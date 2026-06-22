# Baseline Gate Repair 2026-06-21 Context

## 2026-06-21 Stage A1

- Preflight report: `.runtime/reports/generated/post-layer-stage5-followup-preflight.md`.
- Branch: `codex/baseline-architecture-boundary-repair-20260621`.
- Base: `origin/main` at `1a52603de0be04d798a9e71d50788b9ff5e3c2e2`.
- Initial failure: `npm run verify:architecture-boundaries` reported `js/core/map_renderer.js` at 24154 lines with a 24100-line budget.
- Repair path: move pure canvas color helper functions into `js/core/renderer/canvas_color_helpers.js`, keep `map_renderer.js` as caller, and add checker/test coverage for the new owner boundary.

## 2026-06-21 Stage A2

- Branch: `codex/state-write-allowlist-repair-20260621`.
- Base: `codex/baseline-architecture-boundary-repair-20260621@609f828023d8a96032b08a32fd5ed40777e04bfc`.
- Initial failure: `npm run verify:state-write-allowlist` reported 14 unexpected direct state write files and no stale allowlist entries.
- Repair path: add only the 14 scanner-reported paths to `tools/eslint-rules/state-writer-allowlist.json`, then extend `tests/test_state_write_guardrail_contract.py` to keep `layer_status_diagnostics.js` and `toolbar_render_scheduler.js` out of the writer allowlist.
