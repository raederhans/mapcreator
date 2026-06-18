# Module Boundary Slimming Plan

## Current Phase: Phase 1

Status: implemented and verified with targeted gates.

## Checklist

- [x] Create isolated worktree from `origin/main@5494431c`.
- [x] Establish active task docs under `docs/active/module-boundary-slimming/`.
- [x] Move i18n catalog and pure translation/tooltip logic to `js/core`.
- [x] Keep UI translation DOM refresh and language toggle behavior in `js/ui/i18n.js`.
- [x] Keep UI compatibility exports for old imports.
- [x] Replace core imports of `../ui/i18n.js` with `./i18n.js`.
- [x] Replace core imports of `../ui/toast.js` with `showToastFn` runtime hook calls.
- [x] Register `showToastFn` in `js/main.js`.
- [x] Update tools and tests to treat `js/core/i18n_catalog.js` as the runtime catalog owner.
- [x] Rebuild checked-in test import graph.
- [x] Rebuild Pages dist with `py -3 tools/build_pages_dist.py`.
- [x] Update worktree registry delivery package.
- [x] Run independent static review and fix the startup audit side-effect boundary it found.
- [x] Run final ai-slop-cleaner scan and two-lane code/architecture review.
- [x] Record Ultragoal G002 for final architecture WATCH items.
- [x] Add toast hook ordering assertion and obtain architect CLEAR for G002.
- [x] Complete final Ultragoal checkpoint for G002 and Codex aggregate goal.
- [x] Commit branch after final review and checkpoint.
- [ ] Phase 2 refresh/chunk boundary pass.

## Verification

- `node --check` on 15 changed JS files: passed.
- `node --check` on the startup audit follow-up files: passed.
- Targeted Python contract suite after review fix: 104 tests passed.
- Source/dist i18n release surface tests: passed.
- `npm run verify:test-import-graph`: passed after regenerating `tests/e2e/test-import-graph.json`.
- `py -3 tools/build_pages_dist.py`: passed.
- `py -3 -m unittest tests.test_pages_dist_startup_shell -q`: 37 tests passed.
- `npm run test:node:landing-showcase-view`: 8 tests passed.
- `git diff --check`: passed.
- ai-slop-cleaner changed-file scan: no masking fallback, temporary workaround, broad try/catch, or extra abstraction found.
- Final code-reviewer lane: APPROVE, no issues.
- Final architect lane after ordering assertion: CLEAR; G002 resolved from boundary-design view.
- Final Ultragoal checkpoint: G002 complete, Codex aggregate goal complete, `artifactComplete=true`. `aggregateComplete=false` remains a CLI bookkeeping detail because G001 stays `review_blocked` as the audit-visible pre-fix review result.

## Known Gaps

- `npm run verify:state-write-allowlist` currently fails on existing direct state writer files outside this phase scope; no new i18n or toast files appeared in its failure list.
- `npm run verify:pages-dist` and `npm run verify:dist-drift` fail at the npm wrapper level because `python` is not available on PATH in this shell; equivalent `py -3` commands were run.
- Full toolbar/transport module test run has existing renderer/transport assertion failures unrelated to the i18n/toast boundary change. Phase 1 used specific affected methods plus broad i18n/runtime/startup/sidebar/water tests.
