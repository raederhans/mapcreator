# Review Fix 6d2040c Context

## Start

- Worktree: `C:\Users\raede\Desktop\dev\mapcreator-review-fix-6d2040c`
- Branch: `codex/review-fix-6d2040c-20260527`
- Base: `6d2040c Reduce maintenance drift in agent-facing contracts`
- Original `main` checkout has unrelated dirty files; this task stays isolated.
- `node_modules` is missing in the fresh worktree.

## Findings

- `tools/test_route_registry.mjs` expanded only the simplest `npm run test:node:*` form. Agent-facing route discovery would miss aggregate scripts written with common npm flags such as `npm run -s ...` or `npm run-script --if-present ...`.
- `tests/test_strategic_overlay_sidebar_boundary_contract.py` used a whole-file ban on `innerHTML = \``. That locked the intended strategic sidebar fix, but it also created an unrelated future-edit tripwire for the entire sidebar file.
- Fresh worktree initially lacked `node_modules`; the first Python structural test run failed on `@playwright/test` import. `npm ci` fixed the environment and the same tests passed.

## Verification

- Passed before fixes: `git diff --check HEAD~1..HEAD`, touched JS `node --check`, touched Python `py_compile`.
- Passed after fixes: `node --check tools/test_route_registry.mjs`; `python -m py_compile tests/test_e2e_structural_tooling.py tests/test_strategic_overlay_sidebar_boundary_contract.py`.
- Passed after `npm ci`: `python -m unittest tests.test_e2e_structural_tooling tests.test_strategic_overlay_sidebar_boundary_contract -q`.
- Passed: `node tools/select_verification_targets.mjs --check`.
- Passed: `node --test tests/appearance_parent_border_owner_behavior.test.mjs`.
- Passed: `npm audit --audit-level=moderate`.
- Passed: `npm run verify:test:e2e-layers -- --check`.
- Passed: `npm run verify:test-timeout-guardrails -- --check`.
- Passed: targeted 111-test Python suite covering toolbar split, strategic sidebar, dev workspace normalizers, perf gate, E2E structural tooling, and dev-server metadata.
- Passed: `git diff --check`.
- Passed: Git Bash syntax check for `ops/browser-mcp/run-smoke-browser-inspection.sh`.
