# Render Transaction Stability Context

## 2026-06-20 Setup

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-render-transaction-stability`
- Branch: `codex/render-transaction-stability`
- Base: `origin/main@d3671ca5e8117e0bbc3f8503444072b8359ea091`
- Parent checkout status: unrelated `data/locales.json` modification remains untouched.
- Live process owner: main Codex agent owns all tests, E2E, Pages dist, merge, push, and cleanup.
- Subagents: static analysis and review only.

## Current Findings

- `js/workers/political_raster.worker.js` drops `sceneGeneration` and `scenarioDataGeneration` from normalized worker identity, while `js/core/political_raster_worker_client.js` compares those fields for currentness.
- `js/core/scenario/chunk_runtime.js` bumps `scenarioDataGeneration` for political payload changes, but optional merged-layer changes only update runtime payload/revision and flush a render boundary.
- `scenario_atlantropa` enters the refresh chain through `refreshScenarioAtlantropaChunkPayloadChange` and `resolveScenarioChunkPromotionChangeSet`, so the gap is generation transaction semantics rather than a missing refresh path.
- `drawBaseVisibleFrameFallback` can clear and paint a base frame after continuity is rejected; exact compose failure has thinner continuity handling than transformed-frame failure.

## UltraQA Scenario Matrix

| ID | User/attacker model | Scenario | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA-001 | Normal editor user | Fill edit while political worker result is pending | `npm run test:node:political-raster-worker-packet` | Worker result stays current through generation identity | Worker reply preserves `sceneGeneration`, `scenarioDataGeneration`, and `passSignature` | passed | worker packet 3/3 | none |
| QA-002 | Chunked scenario user | Atlantropa optional payload changes without political payload change | `node --test tests/scenario_chunk_contracts.test.mjs`; Python chunk contracts | `scenarioDataGeneration` increments once and invalidates right passes | Visible optional promotion increments data generation through shared visibility helper | passed | scenario chunk 51/51; Python scenario resources 53/53 | none |
| QA-003 | Fast interaction user | Fast/exact frame misses pass after first visible frame | architecture review + existing renderer boundaries | Previous pixels or marked continuity are preserved; base fallback path remains scoped | Existing continuity owners stay outside this patch; no new renderer hot-path edit needed | reviewed | architect CLEAR | none |
| QA-004 | HGO preview user | HGO preview transformed pass draw fails after preflight | architecture review + existing HGO runtime boundary | Main canvas is not cleared by a failed preview frame | Existing HGO staged frame boundary stays outside this patch | reviewed | architect CLEAR | none |
| QA-005 | Dirty worktree safety | Parent checkout has unrelated WIP | `git status --short` in parent and worktree | Parent WIP untouched; worktree changes scoped | Parent `data/locales.json` WIP preserved; all edits are in isolated worktree | passed | registry + status checks | none |

## Progress Log

- Setup complete: branch/worktree created, ultragoal/ultrawork/ultraqa state initialized.
- Implemented worker identity roundtrip in `js/workers/political_raster.worker.js`; locked by `tests/political_raster_worker_packet_behavior.test.mjs`.
- Implemented visible optional layer promotion semantics in `js/core/scenario/chunk_runtime.js`; optional-only visible changes now bump `scenarioDataGeneration` and call `refreshMapDataForScenarioChunkPromotion`.
- Deleted the old Atlantropa-only refresh helper in favor of the generic visible optional promotion helper.
- Dist mirror updated through `npm run verify:pages-dist`.
- Static subagent findings:
  - Worker identity test lane confirmed the direct `vm` worker harness covers scene/data generation identity.
  - Architecture lane confirmed visible-frame continuity, last-good, interaction composite continuity, and HGO preview boundaries are already scoped and should stay outside this patch.
  - Optional/Atlantropa lane confirmed the current two-path transaction model: political payload change or visible optional payload change.
- Verification evidence:
  - PASS `npm run test:node:political-raster-worker-packet`
  - PASS `node --test tests/scenario_chunk_contracts.test.mjs`
  - PASS `py -3 -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_render_cache_owner_boundary_contract tests.test_runtime_hooks_boundary_contract`
  - PASS `npm run test:node:scenario-refresh-plans`
  - PASS `npm run test:node:scenario-chunk-promotion-helpers`
  - PASS `npm run verify:pages-dist`
  - PASS `node --check js/core/scenario/chunk_runtime.js`
  - PASS `node --check js/workers/political_raster.worker.js`
  - PASS `git diff --check`
- Independent final review lanes started: code-reviewer, architect, code-simplifier.
- First independent review result:
  - code-reviewer: no code findings; COMMENT only because LSP diagnostics are unavailable in this session.
  - code-simplifier: PASS; suggested clearer `renderVisible` naming and reducing copied optional-layer rules.
  - architect: BLOCK on copied optional visibility allowlist in `chunk_runtime` and missing `strategicvalues` coverage.
- BLOCK fix applied:
  - Removed static optional visible allowlist from `chunk_runtime`.
  - Injected `isScenarioOptionalLayerRequestedForVisibility` from `scenario_resources`.
  - Renamed `visibleChangedLayerKeys` to `renderVisibleChangedLayerKeys`.
  - Added `strategicvalues` refresh pass mapping.
  - Added visible `strategicvalues` and hidden optional chunk promotion regressions.
- Post-BLOCK verification:
  - PASS `node --test tests/scenario_chunk_contracts.test.mjs` (51/51)
  - PASS `npm run test:node:scenario-refresh-plans` (5/5)
  - PASS `py -3 -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_scenario_resources_boundary_contract` (53/53)
  - PASS `npm run test:node:political-raster-worker-packet` (3/3)
  - PASS `node --check js/core/scenario/chunk_runtime.js js/core/scenario_resources.js js/core/map_renderer/scenario_refresh_plans.js js/workers/political_raster.worker.js`
  - PASS `npm run verify:pages-dist`
  - PASS `git diff --check`
- Architect re-review: CLEAR.
- Incremental code-reviewer re-review: no code findings; only stale delivery-package docs were flagged and refreshed.
- Final closeout plan: archive task docs after final status/diff check, then commit, push, and clean the feature worktree while preserving parent checkout WIP.
