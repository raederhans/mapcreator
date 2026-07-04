# P8A Release Smoke Propagation Guard Plan

Status: ready-for-integration.

## Scope

Implement a release-smoke-only guard for short GitHub Pages propagation windows after deployment. The change may touch release smoke logic, small test helpers, helper tests, route/selector test infrastructure, and P8 docs. It must not change app runtime behavior, public sample policy, HGO exposure, or Pages payload contents.

## Steps

- [x] Create an isolated worktree from latest `origin/main`.
- [x] Inspect release smoke, workflow, and Playwright readiness helpers.
- [x] Run planner and architect planning review.
- [x] Run critic planning review; result was iterate for route/domain coverage.
- [x] Update plan to cover release spec direct route and adaptive dry-run file list.
- [x] Add propagation-aware preflight and classified retry.
- [x] Add helper tests for retry boundaries and release-smoke route/domain coverage.
- [x] Update P8 docs and worktree registry.
- [x] Run targeted validation and release gate smoke.
- [x] Run independent review and QA gates.

## Live Process Ownership

Main thread owns all Playwright, dev-server, `.runtime`, and release-gate processes for this task. Subagents may do static planning or review only.

## Route Plan

The release spec is under `tests/e2e/release/`, while `tests/e2e/test-layer-manifest.json` covers only top-level `tests/e2e/*.spec.js`. P8A will add a direct release-smoke route for `test:e2e:pages-public-release-gate` so selector output can recommend the local release gate whenever the release spec or its helper changes.

Planned route:

- id: `direct-e2e:test:e2e:pages-public-release-gate`
- command: `test:e2e:pages-public-release-gate`
- source: `tests/e2e/release/pages_public_release_gate.spec.js`
- domain: `release-smoke`
- owner: `deploy-runtime`
- execution: main-thread
- locks: `browser-dev-server`, `playwright-browser`, `.runtime-output`

## Adaptive Dry-Run File List

The dry-run file `.runtime/tmp/p8a-changed-files.txt` must include:

- `tests/e2e/support/release-smoke.js`
- `tests/release_smoke_retry_behavior.node.test.mjs`
- `tests/e2e/release/pages_public_release_gate.spec.js`
- `package.json`
- `tools/test_route_registry.mjs`
- `tests/test_e2e_structural_tooling.py`
- `docs/active/p8-public-demo-followups-20260702.md`
