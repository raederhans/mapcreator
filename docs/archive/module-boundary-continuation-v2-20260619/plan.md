# Module Boundary Continuation V2 Plan

## Goal

Continue the module-boundary cleanup from `main@0ca9e3df` by moving execution-heavy renderer responsibilities into focused owners while preserving existing public facade behavior.

## Acceptance

- `map_renderer.js` shrinks by moving scenario refresh runtime, exact-after-settle scheduling, and HGO preview lifecycle wiring into owner modules.
- Scenario, exact-after-settle, and HGO behavior stay covered by existing targeted tests plus focused new/updated contract tests.
- A minimal architecture boundary gate is exposed as `verify:architecture-boundaries`.
- HGO static asset spike evidence is generated under `.runtime/reports/generated/` without changing runtime default paths.
- Final gates pass: targeted tests, `verify:test-import-graph`, `verify:pages-dist`, `git diff --check`, ai-slop cleanup review, independent review, and final QA.

## Execution Order

1. Refresh active docs and worktree registry.
2. Extract `scenario_refresh_runtime.js`.
3. Extract `exact_after_settle_scheduler.js`.
4. Extract `hgo_preview_render_owner.js` and focused budgets.
5. Add the minimal architecture boundary gate.
6. Add HGO static asset spike evidence.
7. Run final validation, review, merge, push, and clean the worktree.

## Live Process Ownership

Main agent owns all live tests, builds, Pages dist, and merge operations. Child agents are read-only static reviewers unless explicitly reassigned by the main agent.
