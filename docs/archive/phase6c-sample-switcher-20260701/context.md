# Phase 6C Sample Switcher Context

## 2026-07-01 Intake

- Created isolated worktree `C:\Users\raede\.codex\worktrees\mapcreator-phase6c-sample-switcher` from `origin/main@16abfd5f`.
- Parent checkout is dirty with unrelated docs/landing/lessons WIP and remains untouched.
- `git worktree list` now shows parent main plus this Phase 6C worktree.
- Existing Phase 6B card already exposes sample status in Guide and Project banner.
- Existing startup import logic is still local to `startup_sample_project_deeplink.js`; Phase 6C should extract it instead of duplicating it.
- `sample_project_registry.js` already enforces id shape, public scenarios, developer preview exclusions, and safe checked-in project file paths.
- URL helper `createUiSurfaceUrlState()` already preserves hash and updates same-page query params through `history.replaceState`.
- External research checked MDN `URLSearchParams` and History `replaceState`; existing URL helper matches same-document query mutation and same-origin constraints.

## Live Process Ownership

- Main thread owns all test/build/browser/dev-server processes.
- Subagents may perform static analysis, planning, architecture review, and final review.

## Current Risks

- Shared hot files: `index.html`, `css/style.css`, `js/ui/toolbar.js`, `js/ui/toolbar/sample_project_banner_controller.js`, `tests/e2e/sample_guide_deeplink.spec.js`, `tests/e2e/release/pages_public_release_gate.spec.js`, and generated `dist/app/**`.
- Current priority note says appearance + transport platformization owns live browser/tests and shared `index.html/css/style.css/js/ui/toolbar.js` must be serially integrated. This Phase 6C branch will stay isolated until integration planning.

## Planner Review

- First planner lane timed out and was closed without output.
- Second planner lane returned a useful blocker: define shared helper API, list resolver filtering/order, Guide switcher state machine, dirty confirmation timing, and URL merge rules before architecture review.
- Plan revised accordingly in `plan.md`.

## Architect Review

- Architect status: WATCH, approved for critic review.
- Main guardrails:
  - `loadPublicSampleProjectIntoRuntime(...)` should be the single confirmed import transaction entry.
  - `sampleProjectDeeplink` should not be optimistically changed on click.
  - `hgo_1936` and other developer-preview entries should be filtered from public list output before fatal public-list validation.
  - Guide card controller should stay mostly UI/render/event oriented; orchestration belongs in toolbar or a narrow orchestration helper.
  - URL update belongs in `ui_surface_url_state` and runs only after successful import.

## Critic Review

- First critic verdict: BLOCK.
- Required plan repairs:
  - Separate checked-in manifest validation from public list display filtering.
  - Add state transition table covering cancel, failure, success, URL, dirty, and selected UI.
  - Explicitly limit Guide card controller to read/render/event emission.
  - Add tests for selected/loading/error/dirty cancel/import failure/URL success-only/HGO exclusion/manifest corruption.
- Plan revised accordingly.
- Second critic verdict: APPROVE.
- Accepted residual risk:
  - Dirty cancel can be locked by helper/orchestrator tests if full E2E is too costly.
  - URL history/back behavior is outside Phase 6C as long as success-only URL update is tested.
  - Hidden developer-preview corruption hard error is intentional fail-fast behavior for checked-in manifest integrity.
- OMX state compatibility note: `omx state write` rejected the formal `ralplan -> ultragoal` transition because this Codex App run did not populate `.omx/state/subagent-tracking.json`. The real native App subagent evidence is recorded in this context and the plan; continue execution with explicit file/subagent evidence, matching the documented precedent in `docs/archive/render-chain-improvement/context.md`.

## Implementation Notes

- Shared startup/switch import now lives in `js/core/sample_project_import_workflow.js`; `startup_sample_project_deeplink.js` schedules only the startup task and calls the shared helper.
- Public sample list resolution validates checked-in manifest entries first, then filters developer-preview scenarios from display. Unsafe checked-in project URLs remain hard errors even when the entry would be hidden.
- The Guide switcher is rendered by `createSampleProjectGuideCardController(...)`; it emits sample-choice events and stays out of manifest fetch/import/URL mutation decisions.
- Code-review found a pending-state race: startup sample import writes `pending` before the post-ready task runs, while the public list can already render. `pending` is now treated as an in-flight Guide switcher status so sample buttons stay disabled during the queued startup import.
- Dirty confirmation lives in `toolbar.js`, before any replacement import begins. Cancel keeps the old workspace, URL, dirty state, and selected sample intact.
- URL sync uses `syncSampleProjectUrlState(sampleId)` only after successful import; it sets `sample`, deletes legacy `sample_project`, sets `view=guide`, and preserves other params/hash.
- Browser E2E exposed a real stacking bug: the generic app dialog used `z-index: 140`, while the Guide popover used `149`, so dirty confirmation appeared behind the Guide. `css/style.css` now raises `.app-dialog-overlay` to `160`.

## Validation Log

- `node --check` passed for changed source and E2E files.
- `node -e "JSON.parse(...data/locales.json...)"` passed.
- `npm run test:node:sample-project-contracts` passed `15/15`.
- `py -3 tools/i18n_audit.py` passed with `ui_missing=0`, `ui_english_fallback=0`.
- `npm run test:e2e:sample-guide` passed `2/2` after test order was aligned with Guide/export visibility and the dialog stacking fix landed.
- `npm run verify:pages-dist` passed: Pages startup shell `41/41`, landing showcase `18/18`, sample contracts `15/15`, dist size `927.07 MiB`.
- Local generated Pages release gate passed with `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8810/dist/ npm run test:e2e:pages-public-release-gate`, `1/1`. The temporary dev server on port `8810` was stopped afterward.
- `npm run verify:architecture-boundaries` passed.
- `node tools/build_test_import_graph.mjs && npm run verify:test-import-graph` passed for 51 specs.
- Code-review P2 fixed by adding `pending` to `SAMPLE_PROJECT_IN_FLIGHT_STATUSES` and extending `tests/sample_project_contracts.test.mjs`; post-fix `npm run test:node:sample-project-contracts` passed `15/15`.
- Post-fix `npm run verify:pages-dist` passed again with startup shell `41/41`, landing showcase `18/18`, sample contracts `15/15`, and dist size `927.07 MiB`.
- Post-fix generated Pages release gate passed with `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8811/dist/ npm run test:e2e:pages-public-release-gate`, `1/1`. The temporary dev server on port `8811` was stopped afterward.
- Post-style `node --check tests/e2e/sample_guide_deeplink.spec.js` passed.
- Staged `npm run verify:dist-drift` passed after `git add -A`; builder reported dist size `927.07 MiB` and no generated drift remained.
- Final `git diff --check` and `git diff --cached --check` passed.
