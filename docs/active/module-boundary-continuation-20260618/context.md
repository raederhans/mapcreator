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
