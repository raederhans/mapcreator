# P8A Release Smoke Propagation Guard Context

## 2026-07-02

- Created worktree `C:\Users\raede\Desktop\dev\mapcreator-p8a-release-smoke`.
- Branch: `codex/p8a-release-smoke-20260702`.
- Base: `origin/main` at `2354adb13940462335eafd1f383b45d80812466b`.
- Current local `main` checkout is dirty and 28 commits behind `origin/main`; P8A work is isolated to avoid mixing unrelated WIP.
- Release smoke target is `tests/e2e/release/pages_public_release_gate.spec.js`.
- Readiness failure point is `waitForShellReady(page, { timeout: 120000, requireCanvas: true })`.
- Existing final failure artifact is `pages-public-release-gate-failure-context.json`; it lacks preflight and retry metadata.

## Current decision

Use spec-level preflight plus one classified retry. Keep workflow YAML unchanged unless implementation proves the policy needs workflow-owned delay.

## Planning reviews

- Planner recommended a small release-smoke helper, spec-level retry, helper tests, and leaving workflow YAML unchanged.
- Architect approved the direction with WATCH: route/domain classification for the new helper test must be explicit and structurally tested.
- Critic returned ITERATE before implementation: update the plan to require route/domain coverage and adaptive selector dry-run expectations.
- Second critic returned ITERATE because the plan files were not present in the P8A worktree and the release spec route was still underspecified.

## Route correction

`pages_public_release_gate.spec.js` is outside the top-level E2E manifest scope. P8A will add a direct route for `test:e2e:pages-public-release-gate` with domain `release-smoke`, owner `deploy-runtime`, main-thread ownership, and browser/runtime locks. The deployed Pages smoke script remains workflow-owned; selector should recommend the local release gate for changed code.

## Adaptive dry-run correction

The changed-files list for selector and adaptive dry-run will cover the new helper, helper test, release spec, `package.json`, route registry, structural test, and P8 follow-up doc.

## Implementation closeout

- Added `tests/e2e/support/release-smoke.js` for release-smoke phases, retry budget, preflight probes, sample manifest validation, and retry decision helpers.
- Wrapped the public Pages release gate in attempt-local browser contexts so one propagation-class failure can retry once after 30 seconds.
- Kept product checks final: HGO exposure, wrong public sample ids/count, missing export context, unexpected console issues, and unexpected network failures now force the attempt into the `assertions` phase before retry decision.
- Added `tests/release_smoke_retry_behavior.node.test.mjs` and `test:node:release-smoke-helper` for retry budget and manifest policy coverage.
- Added direct SF-ATS route coverage for `test:e2e:pages-public-release-gate` with `release-smoke` domain, `deploy-runtime` owner, main-thread execution, and browser/runtime locks.

## Validation closeout

- Syntax checks passed for the release spec, helper, helper test, and route registry.
- `npm run test:node:release-smoke-helper` passed, 8 tests.
- `py -3 -m unittest tests.test_e2e_structural_tooling -q` passed, 32 tests.
- `node tools/select_verification_targets.mjs --check` passed for 240 routes.
- `node tools/select_verification_targets.mjs --changed-files-list .runtime\tmp\p8a-changed-files.txt --json` loaded the import graph and recommended both `test:node:release-smoke-helper` and `test:e2e:pages-public-release-gate`; only docs/active files and `lessons learned.md` were unmatched.
- `node tools/run_adaptive_tests.mjs --changed-files-list .runtime\tmp\p8a-changed-files.txt --dry-run` planned 157 commands.
- `npm run verify:test-import-graph` passed and wrote the import graph for 51 specs.
- `npm run verify:test:e2e-layers` passed with 47 manifest specs and 15 known direct E2E targets.
- `npm run verify:pages-dist` passed; it generated the local Pages dist, ran 41 dist shell tests, 18 landing showcase tests, and 17 sample project contract tests.
- Local `/dist/` release gate passed against `http://127.0.0.1:8892/dist/` using `tools/dev_server.py --port 8892 /dist/`; first attempt passed, retry was not needed.
- Negative release gate evidence passed by expected failure against `http://127.0.0.1:8899/dist/`; the current code wrote attempt-1 and final failure context with `retryAttempted`, `retryDelayMs`, and all three preflight probe ids. Stable excerpt: `docs/active/p8a-release-smoke-propagation-guard-20260702/failure-context-evidence.md`.
- `git diff --check` passed with Windows line-ending warnings only.

## Review and QA closeout

- Code-review gate initially requested narrower retry boundaries. Fixed malformed JSON parsing to final assertions and moved landing DOM/content checks out of the retryable landing-preflight phase. Second code-review verdict: APPROVE.
- QA gate initially requested stable failure-context evidence. Added `failure-context-evidence.md` with current attempt-1/final context excerpts from the dead-port validation. Second QA verdict: APPROVE.
