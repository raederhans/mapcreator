# Agent Scheduling Health Gates Context

## 2026-05-12

- Loaded `ultrawork` and project instructions.
- Read `lessons learned.md`; relevant constraint is single owner for live tests/builds.
- Current worktree already has unrelated changes in `.omx/metrics.json`, `lessons learned.md`, and `docs/archive/localization-automation-2026-05-12/`; this task leaves those untouched.
- Static analysis found `tests/test_tno_water_geometries.py` is pytest-style, but the heavy route generator currently emits a unittest command for every heavy Python test.
- Subagent `test-engineer` reviewed the test surface read-only and recommended extending `tests/test_e2e_structural_tooling.py`.
- Full structural tooling verification exposed a stale retired Playwright spec: `tests/e2e/strategic_overlay_frontline.spec.js` contained only `test.skip`, remained in the layer manifest, and stayed in the long-timeout allowlist. Removed that retired route so the route index reflects executable checks.
- Verification passed: route schema check, e2e layer manifest check, timeout guardrail, test import graph check, strategic overlay ready-gate unittest, structural tooling unittest, data health JSON check, transport manifest checker, and adaptive dry-runs for TNO water plus transport manifest routes.
- Final self-review found no simpler stable path than extending the existing route registry/selector/adaptive runner chain. Added one `lessons learned.md` note about E2E route retirement hygiene.

## Live Process Ownership

- Owner: main thread.
- Scope: all node/python verification commands for this task.
- Child-agent permissions: static code review, route/test-shape analysis, no live polling or test execution.
