# Renderer Fit Projection Owner P32 Task

## Checklist

- [x] Create owner source.
- [x] Wire owner into `map_renderer.js`.
- [x] Add and expose owner behavior test.
- [x] Convert lifecycle inventory from P31 preflight to P32 implementation guard.
- [x] Extend architecture boundary checks.
- [x] Check production mirror/dist requirements.
- [x] Run required validations and record exact pass/fail evidence.
- [x] Run static review and fix actionable findings.
- [x] Update registry delivery package.
- [x] Rebase over current `origin/main`, rerun affected validation, then commit/push with Lore trailers.

## Current risks

- `origin/main` advanced from `7fb3ade5` to `d86462aa`; P32 rebased cleanly after resolving generated manifest and registry conflicts.
- `dist/pages-dist-manifest.json` conflict was resolved by regenerating from the Phase 2A slimmed baseline.
- `npm run verify:pages-dist` passes after rebase with builder total size `927.48 MiB`, startup shell 42/42, and landing showcase 9/9.
- Browser smoke is unavailable in this clean worktree because the local Playwright CLI is absent.

## Delivery package draft

1. Changed `fitProjection` orchestration by introducing fail-fast `createRendererFitProjectionOwner(...)` and routing `map_renderer.js` through it while preserving wrapper shape.
2. Added behavior tests and lifecycle inventory checks that lock early returns, padding math, fit target selection, effect order, `skipSpatialIndex`, owner boundaries, and package scripts.
3. Updated architecture boundary tooling so the new owner exists, avoids forbidden renderer semantics, and remains wired from `map_renderer.js`.
4. Synced `dist/app/**` mirrors for the new owner and `map_renderer.js`; Pages manifest now records the new generated file and the existing size-gate overage.
5. Static review findings were fixed by requiring injected getters/effects/constants and narrowing the P28 lifecycle anchor slice.
6. Current recommendation: push the registry closeout commit, verify remote `origin/main`, then clean the temporary P32 worktree after recovery commit `59924ec7` is recorded.
