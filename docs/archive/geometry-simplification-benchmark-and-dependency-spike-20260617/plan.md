# Geometry Simplification Benchmark and Dependency Spike Plan

## Objective

Build local benchmark fixtures and contracts for the extracted polyline simplification helpers, then run a dev-only `simplify-js` comparison from `.runtime` without changing production dependencies.

## Constraints

- Do not add `simplify-js`, `rbush`, `flatbush`, `@turf/turf`, or any new production dependency.
- Keep candidate package artifacts under `.runtime/`.
- Keep source helper behavior unchanged.
- Main Codex agent owns live validation commands.
- Subagents are limited to static review and coverage advice.

## Acceptance Criteria

- Focused benchmark fixtures exist and are reusable by tests and tooling.
- A local benchmark script writes a bounded JSON report under `.runtime/`.
- Tests cover benchmark report shape, local helper invariants, and dependency boundary rules.
- Dev-only `simplify-js` comparison can run without touching `package.json` dependencies or `package-lock.json`.
- The final decision is documented with benchmark evidence.

## Steps

- [x] Create task docs and update worktree registry.
- [x] Add red-first benchmark contract tests.
- [x] Implement deterministic fixtures and local benchmark runner.
- [x] Run targeted tests and syntax checks.
- [x] Run local benchmark report for current helpers.
- [x] Install/extract `simplify-js` only under `.runtime` and run candidate comparison.
- [x] Record decision, review findings, and validation evidence.
- [x] Archive task docs, merge to `main`, push, and clean the feature branch.
