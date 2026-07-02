# SF-ATS WP2 Supervisor Plan

## First-Principles Goal

Turn the existing adaptive selector output into a deterministic supervisor layer that a coding agent can inspect before running tests. The supervisor must reuse the selector's route matching and the adaptive runner's changed-file discovery/command resolution so that one changed file maps to one source of routing truth.

## Scope

- Add change dossier, lane classification, supervisor plan, Markdown rendering, and optional child-safe execution.
- Add Node tests for dossier behavior and plan behavior.
- Add package scripts for plan verification and execution.
- Update SF-ATS documentation and worktree registry.
- Avoid production runtime, Playwright fixture behavior, CI workflow, external LLM calls, dependencies, E2E tests, and broad route rewrites.

## Touched SF-ATS Domains

- `test-routing`
- `architecture-boundaries` as a final static boundary check

## Execution Steps

1. Confirm WP1.5 route coverage for SF-ATS files.
2. Inspect selector/runner exports and schema shape.
3. Implement `command_lanes.mjs`.
4. Implement `build_change_dossier.mjs`.
5. Implement `render_supervisor_markdown.mjs`.
6. Implement `supervise_adaptive_verification.mjs`.
7. Add focused Node behavior tests.
8. Update package scripts and docs.
9. Run SF-ATS dry-run/targeted tests and fix failures.
10. Write delivery package and archive this task folder after verification.

## UltraQA Scenario Matrix

| Scenario | Expected Result | Evidence |
| --- | --- | --- |
| Explicit SF-ATS file | No unmatched route gaps, child-safe supervisor contract command | `buildChangeDossier` test |
| Unknown production file | Critical route gap with suggested route | `buildChangeDossier` test |
| Main-thread command in selector report | Command blocked by default, runnable only with include flag | `buildSupervisorPlan` test |
| CI-only command in selector report | CI lane separated from child-safe/main-thread | `buildSupervisorPlan` test |
| Child-safe execution with fake runner | Stable execution result with timing and exit code | `executeSupervisorPlan` test |
| Strict blocked mode | Dry-run exits blocked when main-thread commands remain | CLI/plan behavior test |
| Markdown render | Changed files, risk, gaps, lanes, artifacts visible | render test |

## Validation Plan

- `node --check` for each new/updated `.mjs` tool.
- `npm run verify:supervisor-contracts`
- `npm run test:node:supervisor-plan`
- `npm run verify:supervisor-plan`
- Explicit supervisor CLI probes for `tools/ai_test_supervisor/build_change_dossier.mjs` and `AGENTS.md`.
- `npm run test:adaptive`
- `npm run verify:architecture-boundaries`

## Live Process Ownership

The main agent owns all deterministic Node/static commands in this worktree. Browser, Playwright, perf, dist, heavy-geo, scenario-data, and checkpoint-builder lanes remain unclaimed and will be reported as skipped/blocked when selected.
