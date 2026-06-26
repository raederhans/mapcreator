# P12 Context

## Baseline

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-render-cache-p12-20260625`
- Branch: `codex/render-cache-invalidation-owner-p12-20260625`
- Base: `origin/main@456b05130b37c2a7f8364c2a5a6a8430957388e8`
- Parent checkout: `C:\Users\raede\Desktop\dev\mapcreator` on local `main@383a626a`, with existing `docs/archive/**` deletions and `lessons learned.md` WIP preserved.

## Findings

- `map_renderer.js` currently owns `invalidateRenderPasses`, `invalidateAllRenderPasses`, `clearRenderPassReferenceTransforms`, `invalidateInteractionComposite`, and `clearLastGoodFrame`.
- `render_cache_owner.js` currently owns canvas/cache shape and interaction composite reuse decisions.
- `canDrawInteractionComposite()` in the owner still calls an injected `invalidateInteractionComposite` helper.
- `renderPassToCache()` legitimately writes `cache.dirty[passName] = false`; architecture rules must only forbid host dirty writes for invalidation.

## Live Process Ownership

- Main agent owns all verification commands and browser/dev-server/E2E processes.
- Any child review lanes are static read-only unless explicitly given a non-live file inspection task.

## Progress

- 2026-06-25: Read P12 request, loaded worktree/subagent/verification/review skills, sampled parent state, fetched origin, created isolated worktree from `origin/main@456b0513`, and recorded the active plan.
- 2026-06-25/26: Moved render-pass dirty/reason invalidation, reference-transform clearing, last-good-frame clear/stale mutation, and interaction-composite invalidation into `js/core/renderer/render_cache_owner.js`.
- 2026-06-25/26: Kept `map_renderer.js` wrapper names stable and left host-owned diagnostics, continuity metrics, political path cache invalidation, interaction border snapshot invalidation, render orchestration, `renderPassToCache()`, and `drawCanvas()` in place.
- 2026-06-25/26: Added a versioned owner summary envelope with `requestedPassNames`, `normalizedPassNames`, `droppedPassNames`, `changed`, and `effects.hostFollowUps` so host wrappers consume owner mutation results instead of recomputing mutation decisions.
- 2026-06-25/26: Added `tests/render_cache_owner_invalidation_behavior.test.mjs` plus `npm run test:node:render-cache-owner`; updated Python boundary, architecture boundary, and scenario chunk contracts to track the new owner/host split.
- 2026-06-25/26: Static review lanes completed. Architect status was WATCH until the versioned summary envelope was added. Code-reviewer found one pre-commit issue: new test/docs were untracked; the closeout uses `git add -A` before committing to make that explicit.
- 2026-06-25/26: Final self-review found no simpler safe implementation after the summary envelope cleanup. `lessons learned.md` already covers the two relevant lessons: update old owner boundary contracts and check untracked files before review/commit.
- 2026-06-26: Functional commit `ebfb86f3c5487a2ec7e09a5e62fd581d33b9b171` was pushed to `origin/codex/render-cache-invalidation-owner-p12-20260625` and fast-forwarded into `origin/main`.
- 2026-06-26: Task docs were archived under `docs/archive/render-cache-invalidation-p12-20260625/`; registry closeout records P12 as integrated and ready for local worktree cleanup after push.

## Validation Evidence

- Syntax: `node --check js/core/renderer/render_cache_owner.js`, `node --check js/core/map_renderer.js`, `node --check tests/render_cache_owner_invalidation_behavior.test.mjs`, `node --check tools/check_architecture_boundaries.mjs`.
- Focused owner/boundary gates: `npm run test:node:render-cache-owner` 6/6, `npm run python -- -m unittest tests.test_map_renderer_render_cache_owner_boundary_contract -q` 4/4, `npm run verify:architecture-boundaries`.
- Renderer and refresh gates: `npm run test:node:render-pass-catalog` 6/6, `npm run test:node:render-invalidation-catalog` 6/6, `npm run test:node:renderer-host-inventory` 7/7, `npm run test:node:renderer-runtime-state-behavior` 10/10, `npm run test:node:render-transaction-diagnostics` 21/21, `npm run test:node:scenario-refresh-plans` 23/23, `npm run test:node:exact-after-settle-refresh-plans` 8/8, `npm run test:node:canvas-layer-manager` 4/4, `npm run test:node:scenario-chunk-contracts` 57/57.
- Governance gates: `npm run verify:state-write-allowlist`, `npm run verify:test-import-graph`, `git diff --check`.
- Browser/dev E2E, main owner only: `npm run test:e2e:dev:tno-ready-state` 5/5 and `npm run test:e2e:smoke` 4/4. Smoke output still records expected local auth `401` for `/api/backend/auth/me` and known D3-unsafe water geometry warnings.
- Disposable E2E setup: created a temporary `node_modules` junction to the parent checkout dependency tree and removed it after each E2E pass.

## Scope Guard Results

- No diff in `dist/app/**`.
- No diff in `tools/eslint-rules/state-writer-allowlist.json`.
- No diff in `js/core/map_renderer/public.js`.
- `renderPassToCache()` and `drawCanvas()` were not changed.
- Parent checkout WIP under `docs/archive/**` and `lessons learned.md` was preserved.
