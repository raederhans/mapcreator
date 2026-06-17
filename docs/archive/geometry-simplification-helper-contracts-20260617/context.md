# Geometry Simplification Helper Contracts Context

## 2026-06-17

- Baseline: clean `main@0660407509e25392be9605683b5e5f6f4107f93a`.
- Branch: `codex/geometry-simplification-helper-contracts`.
- Worktree list: only `C:\Users\raede\Desktop\dev\mapcreator`.
- Memory/lessons intake: `verify:pages-dist` is required when source/dist delivery surfaces move; active docs should be archived after verified closeout.
- OMX note: stale `ralph` state from a completed older HGO task blocked `autopilot` state; cleared only that local workflow state, then initialized this task.
- Subagent lane: one read-only explore lane is checking helper locations, boundary tests, and injection-chain risk. Main agent keeps live process ownership.

## Current Findings

- Helper definitions are currently direct functions in `js/core/map_renderer.js`.
- `js/core/renderer/border_mesh_owner.js` already receives helper functions by injection.
- `js/core/renderer/border_mesh_dynamic_runtime.js` treats `sanitizePolyline`, `getLatitudeAdjustedSimplifyEpsilon`, and `simplifyPolylineEffectiveArea` as injected behavior.
- Red-first checks failed for the intended reason before implementation: the new helper module did not exist.
- Implementation moved the helper functions and latitude clamp constants into `js/core/renderer/polyline_simplification_helpers.js`; `map_renderer.js` imports only the helpers it uses.
- Residual scan confirms old direct helper definitions are gone from `map_renderer.js`; source and dist both import the new helper module.

## Validation Queue

- PASS: `node --test tests/polyline_simplification_helpers_behavior.test.mjs` (7/7).
- PASS: `cmd /c "set PATH=C:\Users\raede\AppData\Local\hermes\hermes-agent\venv\Scripts;%PATH%&& python -m unittest tests.test_map_renderer_border_mesh_owner_boundary_contract -q"` (3 tests).
- PASS: `node --check js/core/map_renderer.js js/core/renderer/polyline_simplification_helpers.js js/core/renderer/border_mesh_owner.js js/core/renderer/border_mesh_dynamic_runtime.js`.
- PASS: `npm run test:node:border-mesh-owner-behavior` (4/4).
- PASS: `npm run test:node:renderer-splits` (46/46).
- PASS: `git diff --check` (Windows line-ending warnings only).
- PASS: `cmd /c "set PATH=C:\Users\raede\AppData\Local\hermes\hermes-agent\venv\Scripts;%PATH%&& npm run verify:pages-dist"` (Pages startup shell 37 tests OK, 6 skipped; landing showcase 6/6).
- PASS: `node --check dist/app/js/core/map_renderer.js dist/app/js/core/renderer/polyline_simplification_helpers.js`.

## Cleanup Review

- AI slop cleaner scope: changed helper, renderer import, tests, dist, and docs.
- Cleanup plan: keep extraction only, remove no additional behavior, scan for fallback-like additions, then rerun verification.
- Fallback findings: no new fallback/retry/degrade/workaround logic in new helper or tests. Existing `map_renderer.js` fallback hits are pre-existing and outside this task.
- Cleaner result: no code edits needed after the cleanup pass.

## Review And QA

- Architect review: CLEAR. The helper module is a minimal pure helper boundary, no new dependency or adapter layer.
- Code review: APPROVE. One low-risk test-strength suggestion was accepted.
- Follow-up patch: boundary contract now asserts the three coastline helper functions are inside the `simplifyCoastlineMeshRuntime({...})` call object.
- Incremental code review: APPROVE.
- UltraQA initial verdict: FAIL only because closeout work was not done yet; code/runtime contract checks passed.
- Closeout response: delivery package written, docs prepared for archive, registry prepared for integration, and commit/push remain the final shell steps.
