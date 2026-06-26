# P21 Context

## 2026-06-26 Start

- Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` has unrelated docs/archive deletion WIP and `lessons learned.md` WIP.
- Created isolated worktree `C:\Users\raede\.codex\worktrees\mapcreator-p21-zoom-interaction-lifecycle-owner` on branch `codex/p21-zoom-interaction-lifecycle-owner`.
- Base and `origin/main` are both `efd0f840cd1b302dce4b628f4f94be415e1516be`.
- Required P18/P19/P20 artifacts exist on `origin/main`: `scenario_water_cache_policy_owner.js`, `viewport_command_owner.js`, and `viewport_resize_lifecycle_owner.js`.
- Recent commits show P19/P20 owner extraction pattern: `837b48c9` viewport commands and `ac5a9ee0` viewport resize lifecycle, with P20 closeout at `efd0f840`.
- Live process owner: main Codex thread only. Subagents Linnaeus, Harvey, and Sagan are read-only/static reviewers.

## Implementation Notes

- `initZoom()` currently builds `globalThis.d3.zoom()`, sets scale/extent/filter, registers start/zoom/end handlers, binds the interaction rect, disables `dblclick.zoom`, then calls `resetZoomToFit()` and `enforceZoomConstraints()`.
- New owner should receive `state` directly and use effects for host behaviors that touch renderer orchestration or runtime callbacks.
- Test review recommended focused owner harness coverage for init binding, start/end lifecycle, pending zoom RAF coalescing, and no-op behavior.
- Architecture review marked a P20 resize boundary token coverage improvement as `WATCH`. This is recorded for follow-up and kept out of the P21 diff to preserve the zoom-only scope.

## Validation Notes

- First pass found `verify:state-write-allowlist` failures for the new owner and test. Fixed by avoiding direct `state.* =` roots in new files and preserving host-owned state write authority without changing the allowlist.
- Final review found two blocking risks: a state alias could bypass the allowlist scanner, and missing zoom dependencies were silently no-op. Fixed by moving all zoom lifecycle state writes into host-injected effects and by making `initZoom()` throw explicit setup errors for missing `d3`, interaction rect node, `d3.zoom`, or `d3.select`.
- Interaction funnel E2E had a stale trigger: `setScenarioViewModeCommand("frontline")` no longer changes view mode because scenario view mode normalizes to ownership. The test now uses `clearActiveScenarioCommand` to verify dispatcher render boundary routing without relying on a stale view-mode branch.
- Interaction funnel export helper now opens Project Management through the visible `#lblProjectLegend` summary and verifies `#projectLegendSection.open`, matching the current sidebar behavior.

## Delivery Package

### What Changed

- Added `createZoomInteractionLifecycleOwner(...)` for D3 zoom setup, start/zoom/end lifecycle handling, RAF coalescing, zoom-end chunk refresh scheduling, and binding to the interaction rect.
- Converted `map_renderer.js` `initZoom()` into a thin wrapper; host-owned `updateMap`, viewport commands, resize lifecycle, canvas/SVG/projection/path ownership, and render pipeline functions remain in `map_renderer.js`.
- Added focused owner behavior tests and the `test:node:zoom-interaction-lifecycle-owner` script.
- Updated architecture boundary checks to track the new owner and block renderer lifecycle ownership drift.
- Updated existing contract/E2E tests whose static or UI assumptions pointed at the old `initZoom()` location or stale dispatcher trigger.

### Files

- Core: `js/core/renderer/zoom_interaction_lifecycle_owner.js`, `js/core/map_renderer.js`.
- Tests: `tests/zoom_interaction_lifecycle_owner_behavior.test.mjs`, `tests/scenario_chunk_contracts.test.mjs`, `tests/e2e/interaction_funnel_contract.spec.js`.
- Tooling: `tools/check_architecture_boundaries.mjs`, `package.json`.
- Docs: `docs/active/zoom-interaction-lifecycle-owner-p21-20260626/*`, `docs/active/_worktree_registry.md`.
- Temporary local dependency folder: ignored `node_modules/` created by `npm ci` for Playwright availability in the isolated worktree.

### Diff Summary

- `map_renderer.js`: old inline `initZoom()` body replaced by `getZoomInteractionLifecycleOwner().initZoom()` and host getter/effect wiring.
- New owner: 161 lines, no `runtimeState`, no `map_renderer.js` import, no direct root state writes.
- New owner test: 309 lines, six focused `node:test` cases covering init, start, zoom RAF coalescing, recursive pending flush, end, and setup error paths.
- Architecture boundary: new file entry, line budget, owner tokens, renderer wrapper tokens, and forbidden ownership tokens.

### Commit / Base

- Current functional commit: pending at this delivery-package update.
- Base: `origin/main@efd0f840cd1b302dce4b628f4f94be415e1516be`.
- Parent checkout remains dirty with unrelated docs/archive cleanup WIP and is untouched.
- Current `origin/main` was unchanged when validation started after `git fetch origin main`; final push will re-check fast-forward safety.

### Overlap / Integration

- Direct overlap risk: yellow with future renderer owner extraction touching `js/core/map_renderer.js`, `tools/check_architecture_boundaries.mjs`, `package.json`, or interaction funnel tests.
- Parent WIP overlap: green for product code; parent changes are docs/archive cleanup plus `lessons learned.md`.
- Recommended next step: commit this branch, fast-forward push to `origin/main` if remote main remains at or behind the branch base, then archive this task folder and clean the worktree after push verification.

### Validation

- Syntax: `node --check` on new owner, `map_renderer.js`, owner test, `interaction_funnel_contract.spec.js`, `scenario_chunk_contracts.test.mjs`, and architecture boundary tool.
- Node tests: zoom owner 6/6, viewport command 8/8, viewport resize lifecycle 12/12, viewport read model 12/12, scenario water cache policy 7/7, projected geometry bounds 12/12, render transform reuse policy 7/7, render cache owner 6/6, renderer host inventory 7/7, renderer runtime state 10/10, render transaction diagnostics 21/21, scenario refresh plans 24/24, scenario chunk contracts 57/57.
- Gates: `verify:architecture-boundaries`, `verify:state-write-allowlist`, `verify:test-import-graph`, `git diff --check`.
- E2E: `test:e2e:dev:tno-ready-state` 5/5, `test:e2e:smoke` 4/4, `test:e2e:interaction-funnel` 3/3.
- Review: final code-reviewer reported no blocking findings after fixes; one low coverage suggestion was resolved by adding missing `d3.zoom` and `d3.select` setup-error assertions.

### Remaining Risks

- E2E smoke continues to record known local `/api/backend/auth/me` 401 diagnostics and D3 unsafe water geometry warnings; tests pass with these diagnostics.
- No `dist/app/**`, `tools/eslint-rules/state-writer-allowlist.json`, or `js/core/map_renderer/public.js` changes.
