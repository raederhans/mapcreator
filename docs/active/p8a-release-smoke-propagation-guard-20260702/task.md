# P8A Release Smoke Propagation Guard Task

## Desired outcome

The GitHub Pages deployed smoke can tolerate one short propagation/startup readiness timeout and still fails strongly on real release regressions.

## Acceptance checks

- [x] First shell readiness timeout can retry once after bounded delay.
- [x] Landing/app-shell fetch propagation failure can retry once after bounded delay.
- [x] Product assertion failures remain final.
- [x] Unexpected console/network failures remain final.
- [x] Failure context states whether retry was attempted.
- [x] Preflight probe logs include landing root, sample manifest, and app shell entry.
- [x] Helper tests cover retry classification and retry budget.
- [x] Route tests cover helper route and direct release gate route.
- [x] Adaptive selector recommends helper and local release gate for touched P8A files.
- [x] P8 follow-up doc records exact retry policy.

## Delivery package fields to fill at closeout

- Changed files:
  - Core files: `tests/e2e/release/pages_public_release_gate.spec.js`, `tests/e2e/support/release-smoke.js`, `tools/test_route_registry.mjs`, `package.json`.
  - Test files: `tests/release_smoke_retry_behavior.node.test.mjs`, `tests/test_e2e_structural_tooling.py`, `tests/e2e/test-import-graph.json`.
  - Documentation files: `docs/active/p8-public-demo-followups-20260702.md`, `docs/active/_worktree_registry.md`, `docs/active/p8a-release-smoke-propagation-guard-20260702/plan.md`, `context.md`, `task.md`, `failure-context-evidence.md`, `lessons learned.md`.
  - Temporary files: `.runtime/tmp/p8a-changed-files.txt` and Playwright/runtime outputs, ignored and left out of git.
- Diff summary: release smoke now uses preflight probes, a single classified retry for landing/shell/scenario-apply propagation failures, attempt-local browser contexts, retry-aware failure artifacts, and final assertions for product/console/network regressions. SF-ATS now has a child-safe helper route plus an explicit main-thread direct E2E route for the local Pages release gate.
- Commit status: not committed yet at document closeout time; branch is ready to commit after final review/QA gates.
- Base/main divergence: worktree base, HEAD, merge-base, and `origin/main` are all `2354adb13940462335eafd1f383b45d80812466b`. Parent checkout remains separate and dirty at `main@16abfd5f`.
- Potential conflicts: red with other SF-ATS/test-routing work touching `package.json`, `tools/test_route_registry.mjs`, `tests/test_e2e_structural_tooling.py`, or `docs/active/_worktree_registry.md`; yellow with future release smoke or P8 docs; green with runtime renderer/UI/product files.
- Validation commands:
  - `node --check tests\e2e\release\pages_public_release_gate.spec.js` passed.
  - `node --check tests\e2e\support\release-smoke.js` passed.
  - `node --check tests\release_smoke_retry_behavior.node.test.mjs` passed.
  - `node --check tools\test_route_registry.mjs` passed.
  - `npm run test:node:release-smoke-helper` passed, 8 tests.
  - `py -3 -m unittest tests.test_e2e_structural_tooling -q` passed, 32 tests.
  - `node tools\select_verification_targets.mjs --check` passed, 240 routes.
  - `node tools\select_verification_targets.mjs --changed-files-list .runtime\tmp\p8a-changed-files.txt --json` passed, import graph loaded, release helper and release gate recommended; docs/active files and `lessons learned.md` were the only unmatched changed files.
  - `node tools\run_adaptive_tests.mjs --changed-files-list .runtime\tmp\p8a-changed-files.txt --dry-run` passed, 157 commands planned.
  - `npm run verify:test-import-graph` passed, 51 specs.
  - `npm run verify:test:e2e-layers` passed, 47 manifest specs and 15 direct E2E targets.
  - `npm run verify:pages-dist` passed, including 41 dist shell tests, 18 landing showcase tests, and 17 sample project contract tests.
  - `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8892/dist/ npm run test:e2e:pages-public-release-gate` passed against `tools/dev_server.py --port 8892 /dist/`.
  - `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:8899/dist/ npm run test:e2e:pages-public-release-gate` exited 1 as expected for a dead port and wrote attempt-1/final failure context. Stable excerpt: `docs/active/p8a-release-smoke-propagation-guard-20260702/failure-context-evidence.md`.
  - Code-review gate approved after retry-boundary fixes.
  - QA gate approved after stable failure-context evidence was added.
  - `git diff --check` passed with Windows line-ending warnings only.
- Unverified risks: deployed GitHub Pages smoke after `actions/deploy-pages` has not been re-run in CI for this branch; the local `/dist/` gate proves the release path and retry policy, while the exact external propagation timing remains a deployed-site condition.
- Recommended integration action: merge this branch after a normal branch commit, before or after the separate SF-ATS WP1 lane only with explicit conflict review for `package.json`, selector registry, structural tooling, and registry docs. Do not clean the worktree until the branch is merged or explicitly abandoned.
