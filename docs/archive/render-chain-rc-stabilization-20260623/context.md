# Render Chain RC Stabilization Context

## Initial Facts

- `origin/main` after fetch: `6196e737dbbe211f5dbdb63b7a8a0f9749b30403`.
- Parent checkout: `main@75ffdaa7`, behind `origin/main` by 3, with UI/palette/startup WIP.
- Clean worktree created from `origin/main` on branch `codex/rc-render-chain-stabilization-20260623`.
- Local test dependency junction: `node_modules -> C:\Users\raede\Desktop\dev\mapcreator\node_modules`.
- Relevant lessons:
  - Chunk promotion readiness must distinguish viewport subset and full derived state.
  - Owner/base-color coverage must use the full runtime universe.
  - Post-edit colors must block progressive coarse skip when explicit overrides exist.
  - Red Sea boundary probes must check final canvas and water hit target.

## Progress Log

- 2026-06-24 00:00 UTC: Loaded `ultragoal` and `ultraqa`.
- 2026-06-24 00:00 UTC: Created clean RC stabilization worktree from `origin/main@6196e737`.
- 2026-06-24 00:00 UTC: Initialized UltraQA scenario matrix and active docs.
- 2026-06-24 00:08 UTC: Completed read-only verification and classified two stale test-contract drifts.
- 2026-06-24 00:13 UTC: Applied test-only cleanup for optional startup localization sidecars and the current scenario refresh descriptor import contract.

## Validation Log

- `npm run test:e2e:dev:scenario-chunk-runtime`
  - Log: `.runtime/tests/rc-stabilization/scenario-chunk-runtime.log`.
  - Result: pass, 8/8.
  - Phase coverage: Phase 1 viewport/full-derived-state stabilization, Phase 2A owner/base-color coverage, and Phase 2C `FR_ARR_18002` post-edit draw/cache grep all stayed green.
- `node node_modules/@playwright/test/cli.js test tests/e2e/non_1962_runtime_matrix.spec.js --workers=1 --retries=0`
  - Initial log: `.runtime/tests/rc-stabilization/non-1962-runtime-matrix.log`.
  - Initial result: 2/4 pass. `hoi4_1936` and `hoi4_1939` passed, including the Red Sea targeted runtime checks. `blank_base` and `modern_world` failed on optional scenario startup localization sidecar 404 warnings.
  - Rerun log: `.runtime/tests/rc-stabilization/non-1962-runtime-matrix-rerun.log`.
  - Rerun result after test-contract cleanup: pass, 4/4.
  - Covered scenarios: `blank_base`, `hoi4_1936`, `hoi4_1939`, `modern_world`.
- Requested Node suites:
  - Log: `.runtime/tests/rc-stabilization/node-suites.log`.
  - Result: pass.
  - Suites: `scenario-refresh-plans` 22/22, `scenario-chunk-contracts` 57/57, `scenario-chunk-promotion-helpers` 9/9, `render-transaction-diagnostics` 21/21, `scenario-lifecycle-runtime-behavior` 14/14, `palette-runtime-bridge` 20/20, `tests/scenario_pure_helpers.node.test.mjs` 3/3.
- Requested Python boundary suites:
  - Initial log: `.runtime/tests/rc-stabilization/python-boundary-initial.log`.
  - Initial result: 60/61 pass with one stale bridge-contract expectation.
  - Affected rerun log: `.runtime/tests/rc-stabilization/python-bridge-contract-rerun.log`.
  - Affected rerun result: pass, 4/4.
  - Full rerun log: `.runtime/tests/rc-stabilization/python-boundary-rerun.log`.
  - Full rerun result: pass, 61/61.
- `npm run verify:pages-dist`
  - Log: `.runtime/tests/rc-stabilization/verify-pages-dist.log`.
  - Result: pass. Pages dist build completed, startup shell unittest passed 39/39, landing showcase view behavior passed 8/8.
- `git diff --check`
  - Result before final docs: pass. Git reported expected LF-to-CRLF working-copy warnings on the edited test files only.

## Drift / Cleanup Decisions

- Non-1962 matrix drift:
  - Classification: stale test-contract drift.
  - Evidence: `loadLocalizationData()` treats scenario-specific `locales.startup.json` and `geo_aliases.startup.json` as optional sidecars and defaults when they are absent. The matrix had been treating the browser's generic 404 console resource line as fatal even when the URL-specific response was one of those optional sidecars.
  - Cleanup: allow only optional scenario startup localization sidecar 404 responses in `isActionableNetworkFailure`; keep URL-specific 404 enforcement for all other resources. The generic Chromium console 404 line is allowed because it omits the URL, while response tracking remains the actionable URL gate.
  - Production behavior: unchanged.
- Python bridge contract drift:
  - Classification: stale test-contract drift.
  - Evidence: current `scenario_refresh_runtime.js` imports and consumes `resolveScenarioChunkPromotionRendererRefreshDescriptor`; the older `getScenarioChunkPromotionTargetPasses` import expectation no longer matches the current descriptor-based design.
  - Cleanup: update the Python boundary assertion to the current descriptor import.
  - Production behavior: unchanged.

## RC Report Draft

- Base commit: `origin/main@6196e737dbbe211f5dbdb63b7a8a0f9749b30403`.
- Renderer production behavior changes: none.
- Test/docs cleanup: yes, stale contracts only.
- Phase 1 status: pass.
- Phase 2A status: pass.
- Phase 2B status: pass for 1936/1939 Red Sea checks inside the full non-1962 matrix.
- Phase 2C status: pass for the `FR_ARR_18002` post-edit targeted grep inside full chunk runtime.
- Known failures after cleanup: none.
- Baseline readiness: current main is renderer-stable after this test-contract cleanup and can be used as the renderer baseline for UI/palette/startup WIP integration.
