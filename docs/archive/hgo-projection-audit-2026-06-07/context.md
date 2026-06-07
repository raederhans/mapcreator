# HGO Projection Audit Context

## Progress Log
- Created isolated worktree `C:/Users/raede/Desktop/dev/mapcreator-hgo-projection-audit` on branch `codex/hgo-projection-audit` from `main` at `0f157036`.
- Main checkout has unrelated `.omx/metrics.json` changes and remains untouched.
- Live process owner: main agent. No child agent may run or monitor tests/builds for this task.

## Findings
- Confirmed issue: projected HGO render cache keyed `projectionTransform` only by `k/x/y`. A custom transform object with `invert()` but no `k/x/y` could reuse the previous projected buffer even when its inverse mapping changed.
- Fix: added WeakMap identity tracking for custom `projectionTransform.invert()` objects while preserving numeric `k/x/y` in the cache key. This keeps D3 zoom transforms covered and protects generic transform objects.
- Review status: code-review lane found the same MEDIUM issue and no additional blocker. Architect lane returned WATCH for long-term performance/contract concerns and no direct breakage to current HGO preview.
- Main drift: `0f157036` changed landing/README/Pages delivery surfaces, not HGO source. `verify:pages-dist` refreshed the HGO dist file and manifest from current main.

## Verification
- `npm run test:node:hgo-raster-renderer` passed.
- `npm run verify:hgo-runtime-poc` passed.
- `npm run verify:pages-dist` passed.
- `python -m unittest tests.test_runtime_hooks_boundary_contract -q` passed.
- `node --check js/core/hgo_raster_renderer.js` and `node --check dist/app/js/core/hgo_raster_renderer.js` passed.
- `git diff --check` passed with only pre-existing Windows line-ending warnings for source/test files.

## First-Principles Review
- Target problem: cache key must uniquely represent inputs that change projected raster output.
- Minimal fix: add transform identity for custom `invert()` transforms while keeping existing numeric zoom fields.
- Deferred scope: performance instrumentation, settled-frame throttling, and independent overlay ownership belong to the next HGO projection/performance phase.
