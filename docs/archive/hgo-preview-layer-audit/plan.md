# HGO Preview Layer Audit Plan

## Goal

Audit the scheme2 HGO preview layer changes, fix issues found in the audit, verify source and Pages dist stay synchronized, and prepare a source-backed plan for scheme3 raster reprojection.

## Acceptance Criteria

- Scheme2 observable repaint contract remains intact: `layerOwner`, `reason`, and `renderCount` are stable and test-covered.
- HGO raster viewport and inspect behavior are consistent across implementation, tests, and archived docs.
- Any production source change touching `dist/app` is rebuilt and verified by `verify:pages-dist`.
- Targeted HGO runtime tests pass with fresh output.
- Official practice comparison is grounded in current docs for projection inverse mapping, raster warp/resampling, and browser worker rendering.

## Steps

- [x] Inspect scheme2 source, tests, and archived docs.
- [x] Fix confirmed issues with the smallest scoped patch.
- [x] Rebuild/sync `dist/app` if source changes require it.
- [x] Run targeted tests and repo delivery gates.
- [x] Independent review follow-up: HGO hit `countryCode` payload fixed; broader map renderer behavior harness deferred to scheme3 test debt.
- [x] Run independent review and first-principles self-audit.
- [ ] Commit, push, and clean the audit worktree after verification.

## Live Process Ownership

Main agent owns all test/build/live process execution for this task. Subagents may perform static review only.

## Verification Evidence

- `python -m unittest tests.test_runtime_hooks_boundary_contract -q`: 4 tests passed.
- `npm run test:node:hgo-runtime-preview`: 15 tests passed.
- `npm run verify:hgo-runtime-poc`: HGO runtime seed/index/raster/preview/assets contracts passed.
- `npm run verify:pages-dist`: rebuilt `dist`, then 33 startup shell tests and landing showcase behavior test passed.
- `git diff --check`: passed with Windows line-ending warnings only.
