# Renderer Owner Postmerge Review Plan

## Intent
Review the renderer owner split that was merged to `main` at `6e818068`, fix any actionable bug found, then revalidate and push.

## Constraints
- Use clean worktree `C:\Users\raede\.codex\worktrees\mapcreator-renderer-review-fixes` because parent checkout has unrelated archive WIP.
- Keep live tests single-owned by the main lane.
- Review source, `dist/app`, tests, and Pages manifest together.
- Avoid broad refactors; fix concrete bugs only.

## Acceptance Criteria
- Code and architecture review findings are triaged.
- Any confirmed bug is fixed in source and mirrored delivery files when required.
- Targeted renderer tests pass.
- `verify:pages-dist` equivalent passes or the wrapper issue is explicitly documented.
- `git diff --check` passes.
- Changes are committed, merged to `main`, pushed, and temporary worktree cleanup is explicit.

## Task Checklist
- [x] Create clean review worktree from `origin/main`.
- [x] Read project lessons and prior renderer closeout docs.
- [x] Run code/architecture review evidence lanes.
- [x] Inspect renderer owner diffs locally.
- [x] Fix confirmed findings.
- [x] Run targeted validation.
- [ ] Commit and push to `main`.
- [x] Archive this task when complete.

## Review Result
- Code review lane found 0 actionable bugs in the merged renderer owner split.
- Architecture lane returned WATCH, with no BLOCK findings.
- Confirmed local issue: modern city lights and physical owner tests missed malformed `intensityFields` channel shapes, and the render-cache contract still inspected the old `map_renderer.js` location for modern city lights internals.
- Fix scope: tolerate missing intensity channels in the affected owners, add focused owner tests, and repoint the Python render-cache contract to `modern_city_lights_render_owner.js`.

## Validation Evidence
- PASS `npm run test:node:modern-city-lights-owner`
- PASS `npm run test:node:physical-layer-owner`
- PASS `npm run test:node:physical-layer-contracts`
- PASS `py -3 -m unittest tests.test_map_renderer_render_cache_owner_boundary_contract -q`
- PASS `py -3 tools/build_pages_dist.py`
- PASS `py -3 -m unittest tests.test_pages_dist_startup_shell -q`
- PASS `npm run test:node:landing-showcase-view`
- PASS `git diff --check`
