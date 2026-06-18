# Module Boundary Continuation Context

## 2026-06-18

- Parent checkout: `C:\Users\raede\Desktop\dev\mapcreator`.
- Phase A worktree: `C:\Users\raede\.codex\worktrees\mapcreator-module-boundary-phase-a-renderer-shell`.
- Branch: `codex/module-boundary-phase-a-renderer-shell`.
- Base: `main@4ea5252ed68f80773c0ca5f390ac218656edceb2`, matching `origin/main` after fetch.
- Main validation/live process owner: main Codex agent.
- Read-only sidecar: Harvey is checking renderer scheduling and transaction boundary risks.

## Phase A Findings

- Prior archived module-boundary work already moved pure i18n/toast, scenario refresh plans, and interaction hit candidates.
- `map_renderer.js` still owns exact-after-settle execution, deferred exact context refresh handles, scenario chunk promotion infra, paint/edit transactions, and render requests.
- The safest next extraction is the exact-after-settle refresh plan policy: timing shape, DPR restore pass list, exact/deferred target pass selection, and deferred context target selection.
- Canvas operations, invalidation calls, metrics, runtimeState writes, frame tasks, and deferred handles remain in `map_renderer.js`.
- Read-only sidecar Harvey recommended the same exact-after-settle direction and suggested a larger execution owner as a possible next step. Phase A deliberately chose the smaller pure-plan extraction to avoid a large callback-injection object in this worktree.

## Phase A Implementation Notes

- New pure owner: `js/core/map_renderer/exact_after_settle_refresh_plans.js`.
- `map_renderer.js` imports pure plan helpers and keeps execution side effects.
- New behavior tests: `tests/exact_after_settle_refresh_plans_behavior.test.mjs`.
- Existing static contracts were updated to point plan ownership at the new module.

## Verification Log

- `node --check js/core/map_renderer/exact_after_settle_refresh_plans.js js/core/map_renderer.js tests/exact_after_settle_refresh_plans_behavior.test.mjs tests/scenario_chunk_contracts.test.mjs`: passed.
- `npm run test:node:exact-after-settle-refresh-plans`: passed, 5 tests.
- `npm run test:node:scenario-refresh-plans`: passed, 4 tests.
- `npm run test:node:interaction-hit-candidates`: passed, 5 tests.
- `py -3 -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q`: passed, 5 tests after updating the expected idle-pass definition call count.
- `node --test tests/physical_layer_contracts.test.mjs`: passed, 2 tests.
- `node --test tests/scenario_chunk_contracts.test.mjs`: 43/44 passed; the remaining `hoverFacilityAndCityProbeMetricsRemainNamed` failure is the existing registry-recorded failure.
- `py -3 tools/build_pages_dist.py`: passed and published `dist/app/js/core/map_renderer/exact_after_settle_refresh_plans.js`.
- Full Phase A targeted gate passed after Pages dist: syntax checks, exact-after-settle 5 tests, scenario refresh 4 tests, hit candidates 5 tests, render pipeline Python contract 5 tests, physical layer 2 tests, import graph, Pages startup shell 37 tests, landing showcase 8 tests, and `git diff --check`.
- Ai-slop diff scan: added lines and new exact-after-settle files have no production `fallback`, `recover`, `retry`, `degrade`, `try/catch`, `mock`, temporary workaround, `TODO`, or `FIXME` matches. The only new match was the plan document's live-process rule text.
- `lessons learned.md` reviewed; this phase follows the recorded renderer extraction rule to use narrow function anchors and the Pages dist rule to regenerate/verify checked-in publishing artifacts.
- Ponytail review: CLEAR. It accepted the pure plan extraction, suggested one small duplicate-normalize cleanup that was applied, and treated the remaining single-line DPR policy helper as acceptable because it owns a tested renderer policy.
- Independent behavior/architecture review: PASS, with 0 blocking behavior findings. It confirmed DPR restore, exact/deferred ordering, dirty deferred merge, and side-effect ownership remained stable.
- Post-review gate: `npm run test:node:exact-after-settle-refresh-plans` passed 5 tests; `node --test tests/physical_layer_contracts.test.mjs` passed 2 tests; `py -3 -m unittest tests.test_map_renderer_render_pipeline_passes_boundary_contract -q` passed 5 tests; `npm run verify:pages-dist` passed builder, Pages startup shell 37 tests, and landing showcase 8 tests; `git diff --check` passed.

## Known Gaps

- `node --test --test-name-pattern "exact-after-settle keeps scenario overlays" tests/scenario_chunk_contracts.test.mjs` still hits the existing `hoverFacilityAndCityProbeMetricsRemainNamed` assertion because that assertion lives in the same test block. Full `scenario_chunk_contracts` remains 43/44 with the same registry-recorded failure.

## Phase A Integration Closeout

- Phase A commit: `9139c0737461650e79177ded24fdecf2867c4028`.
- Fast-forward merge into `main` completed and `origin/main` was pushed.
- Feature branch `codex/module-boundary-phase-a-renderer-shell` was pushed for recovery.
- Phase A worktree and detached post-merge verification worktree were clean and removed after push.
- Clean post-merge verification ran from detached worktree `C:\Users\raede\.codex\worktrees\mapcreator-phase-a-postmerge-verify`: exact-after-settle 5 tests, scenario refresh 4 tests, interaction hit candidates 5 tests, physical layer 2 tests, renderer boundary 5 tests, import graph, `verify:pages-dist`, and diff check all passed.
- Main checkout received concurrent HGO runtime preview WIP while Phase A was integrating. It was preserved through named stashes and patch backups under `.runtime/cleanup-backups/phase-a-main-dirty-preserve-*`. Active source of that work is `C:\Users\raede\.codex\worktrees\mapcreator-hgo-runtime-preview-fix`.

## Phase C Setup

- Phase B was deferred because active HGO runtime preview work edits `js/ui/scenario_controls.js`, `tests/test_toolbar_split_boundary_contract.py`, renderer files, and checked-in Pages dist mirrors.
- Phase C worktree: `C:\Users\raede\.codex\worktrees\mapcreator-module-boundary-phase-c-backend-shell`.
- Branch: `codex/module-boundary-phase-c-backend-shell`.
- Base: `main@5fc3dc3d0897ee402b086058fb81fd51bd06c743`, matching `origin/main`.
- Main validation/live process owner: main Codex agent.
- Read-only sidecar: Kierkegaard reviewed backend split candidates and recommended pure helper extraction while keeping DOM/state/API orchestration in `backend/app.js`.

## Phase C Findings

- `backend/app.js` was still carrying static backend console messages, locale translation, sample project payload creation, date formatting, and HTML attribute/text escaping.
- These helpers are pure and can be tested without DOM or API clients.
- Rendering, event binding, `state`, backend API calls, dialog operations, downloads, and refresh orchestration stay in `backend/app.js`.
- Existing `verify:backend-preview` used `python`, which is unavailable in this Windows shell; Phase C adds `tools/run_python.mjs` so npm scripts can find Python on Windows and common POSIX shells.

## Phase C Implementation Notes

- New pure owner: `backend/backend_console_helpers.js`.
- `backend/app.js` imports helper functions and keeps a local `t(key, vars)` wrapper that reads `state.locale`.
- New behavior tests: `tests/backend_console_helpers.test.mjs`.
- `package.json` now includes a cross-platform `python` wrapper script, `test:node:backend-console-helpers`, helper tests in `test:node:backend-cloud-support`, and extended `verify:backend-preview` syntax checks for the new helper module and wrapper.

## Phase C Verification Log

- `node --check tools/run_python.mjs`, `backend/app.js`, `backend/backend_console_helpers.js`, and `tests/backend_console_helpers.test.mjs`: passed.
- `npm run python -- --version`: passed, Python 3.12.10.
- `npm run test:node:backend-console-helpers`: passed, 6 tests.
- `npm run verify:backend-preview`: passed; Python backend service/routes 25 tests, Node backend client/helper 13 tests, and syntax checks passed.
- `npm run test:node:backend-cloud-support`: passed, 36 tests.
- `git diff --check`: passed.
- Ai-slop diff scan: no added production/test lines matched `fallback`, `recover`, `retry`, `degrade`, `try/catch`, `mock`, temporary workaround, `TODO`, or `FIXME`.

## Phase C Known Notes

- Node still prints the existing `MODULE_TYPELESS_PACKAGE_JSON` warning for browser ESM `.js` modules during tests. Existing backend and state tests already show the same warning pattern, so Phase C did not broaden package module semantics.
- The parent main checkout currently has duplicate HGO runtime preview WIP. Before Phase C merge, preserve or clear that duplicate set so backend-only integration stays isolated.

## Phase C Integration Closeout

- Phase C commit: `8964266868f1f675d0076d93f55172a4ec9910fa`.
- Feature branch `codex/module-boundary-phase-c-backend-shell` was pushed for recovery before integration.
- Parent main duplicate HGO WIP was preserved before merge:
  - Stash: `preserve-main-hgo-runtime-preview-duplicate-wip-before-phase-c-integration-20260618T182321`.
  - Patch backup: `.runtime/cleanup-backups/phase-c-main-hgo-duplicate-preserve-20260618T182321/`.
- Fast-forward merge into `main` completed at `8964266868f1f675d0076d93f55172a4ec9910fa`.
- Post-merge verification on clean main:
  - `npm run verify:backend-preview`: passed; Python backend service/routes 25 tests, Node backend client/helper 13 tests, and syntax checks passed.
  - `npm run test:node:backend-cloud-support`: passed, 36 tests.
  - `git diff --check`: passed.
- Phase C worktree `C:\Users\raede\.codex\worktrees\mapcreator-module-boundary-phase-c-backend-shell` was clean and removed after post-merge verification.
