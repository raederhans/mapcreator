# Render Chain RC Stabilization Checklist

- [x] Load ultragoal and ultraqa skill instructions.
- [x] Record latest `origin/main`.
- [x] Create clean worktree from `origin/main`.
- [x] Preserve parent checkout WIP.
- [x] Create active docs and scenario matrix.
- [x] Run full `npm run test:e2e:dev:scenario-chunk-runtime`.
- [x] Run full `tests/e2e/non_1962_runtime_matrix.spec.js`.
- [x] Run requested Phase 1/2A/2B/2C Node suites.
- [x] Run requested Python boundary suites.
- [x] Run `npm run verify:pages-dist`.
- [x] Run `git diff --check`.
- [x] Classify and clean stale contract drift if reproduced.
- [x] Produce RC stabilization report.
- [ ] Commit and push only intentional cleanup/docs changes.
- [ ] Clean worktree and UltraQA state.
