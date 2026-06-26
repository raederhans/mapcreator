# P14 Context

## 2026-06-26 Initial Evidence

- Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` is on local `main@383a626a` and has unrelated `docs/archive/**` deletion WIP plus `lessons learned.md`.
- `origin/main` is `df3f54670ae9afb11dbc6455d6fe5e19e727b5a5`, containing P13 closeout.
- Isolated worktree: `C:\Users\raede\.codex\worktrees\mapcreator-exact-after-settle-pass-policy-p14-20260626`.
- Branch: `codex/exact-after-settle-pass-policy-p14-20260626`.
- Live test owner: main Codex agent only.

## Implementation Notes

- Current policy source is `js/core/map_renderer/exact_after_settle_refresh_plans.js`.
- Current host bridge is `js/core/map_renderer.js` importing `EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES` and injecting `constants.exactAfterSettleDeferredPassNames`.
- Current renderer owner default is `new Set()`, so P14 needs the renderer catalog default before removing host injection.
- `tests/test_map_renderer_render_pipeline_passes_boundary_contract.py` still describes the old bridge and should be updated with the new catalog boundary.

## Live Process Ownership

- No live process is active after validation.
- Main Codex agent owns all validation commands and any dev server/browser work.
- Subagents may inspect static source and tests only.

## 2026-06-26 Implementation Summary

- Added `js/core/renderer/exact_after_settle_pass_catalog.js` for deferred pass names, always-target pass names, and DPR restore pass selection.
- `exact_after_settle_refresh_plans.js` now imports the catalog and preserves compatibility exports for `EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES` and `getExactAfterSettleDprRestorePasses`.
- `render_pipeline_passes.js` now defaults `constants.exactAfterSettleDeferredPassNames` to the catalog set while preserving the override path.
- `map_renderer.js` no longer imports or bridges `EXACT_AFTER_SETTLE_DEFERRED_PASS_NAMES`.
- Boundary contracts updated in node tests, Python static contract, scenario chunk contract, package script, and architecture checker.

## 2026-06-26 Validation Summary

- Syntax: all requested `node --check` commands passed.
- Node/static tests passed: exact-after-settle pass catalog 6/6, exact-after-settle refresh plans 9/9, render pass catalog 6/6, render invalidation catalog 6/6, render pipeline catalog 3/3, render cache owner 6/6, renderer host inventory 7/7, renderer runtime state 10/10, render transaction diagnostics 21/21, scenario refresh plans 23/23, scenario chunk contracts 57/57.
- Architecture/static gates passed: `verify:architecture-boundaries`, `verify:state-write-allowlist`, `verify:test-import-graph`, Python render pipeline boundary 5/5, `git diff --check`.
- E2E passed: `test:e2e:dev:tno-ready-state` 5/5 and `test:e2e:smoke` 4/4.
- E2E smoke still reports the known local `/api/backend/auth/me` 401 and D3 unsafe water geometry warnings; tests passed with those recorded.
- Temporary `node_modules` junction was created for E2E and removed after validation.

## Static Review Notes

- Code-mapper identified the old host bridge and related contracts; P14 intentionally replaces that bridge with renderer catalog ownership.
- Test-engineer identified `scenario_chunk_contracts` as an old policy-location lock; that contract was updated.
- Architect returned WATCH for the preserved `constants` override seam; it is locked by the catalog test and architecture boundary check.
