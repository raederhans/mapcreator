# Geometry Simplification Benchmark and Dependency Spike Task

## Task Checklist

- [x] Red-first benchmark contract test added and observed failing before implementation.
- [x] Benchmark fixtures added.
- [x] Benchmark runner added.
- [x] Dependency boundary test confirms forbidden packages are absent from production dependency fields.
- [x] Current-helper benchmark report generated.
- [x] Dev-only `simplify-js` comparison report generated from `.runtime`.
- [x] First-principles review checks copy/reference behavior and candidate fit.
- [x] Delivery package completed.

## Delivery Package

### What Changed

- Added deterministic polyline simplification fixtures that cover sanitization, mid-latitude simplification, and high-latitude epsilon scaling.
- Added a benchmark runner for local RDP/effective-area helpers plus optional dev-only candidate module comparison.
- Added benchmark contract tests for report shape, endpoint/minimum-point invariants, and forbidden dependency boundaries in `package.json` plus `package-lock.json`.
- Added npm scripts for the benchmark and its focused test entry.
- Documented the dependency decision: keep production dependencies unchanged; retain `simplify-js@1.2.4` as an RDP-only future candidate.

### Files Touched

Core/tooling:

- `tools/perf/polyline_simplification_benchmark.mjs`
- `package.json`

Tests:

- `tests/fixtures/polyline_simplification_benchmark_fixtures.mjs`
- `tests/polyline_simplification_benchmark_contract.test.mjs`

Docs:

- `docs/active/_worktree_registry.md`
- `docs/active/geometry-simplification-benchmark-and-dependency-spike/plan.md`
- `docs/active/geometry-simplification-benchmark-and-dependency-spike/context.md`
- `docs/active/geometry-simplification-benchmark-and-dependency-spike/task.md`
- `docs/active/geometry-simplification-benchmark-and-dependency-spike/dependency-decision.md`

Runtime-only artifacts:

- `.runtime/tmp/simplify-js-spike/`
- `.runtime/reports/generated/geometry-simplification-benchmark.json`
- `.runtime/reports/generated/geometry-simplification-simplify-js-comparison-200.json`

### Diff Summary

- Adds one benchmark runner, one fixture module, one focused Node test, two package scripts, and task/dependency docs.
- No renderer production source changed.
- No `dist/app` files changed.
- No `package-lock.json` change.
- No production or dev dependency fields gained `simplify-js`, `rbush`, `flatbush`, or `@turf/turf`.

### Commit State

Committed as `97626a26` and fast-forward merged into `main`. Closeout registry/doc commit pending.

### Base and Main Divergence

Base: `main@b984a59e`. The feature branch was fast-forward merged into `main` at `97626a26`; no divergent merge commit was needed.

### Potential Overlap

Overlap risk is green. This branch touches benchmark tooling, tests, docs, and `package.json` scripts. It does not touch renderer runtime source, checked-in dist app files, schema files, or shared UI files.

### Validation

- Red-first: `node --test tests/polyline_simplification_benchmark_contract.test.mjs` failed before implementation with `ERR_MODULE_NOT_FOUND` for `tools/perf/polyline_simplification_benchmark.mjs`.
- `node --test tests/polyline_simplification_helpers_behavior.test.mjs tests/polyline_simplification_benchmark_contract.test.mjs` passed: 11 tests.
- `npm run test:node:polyline-simplification-benchmark` passed: 4 tests.
- `node --check tools/perf/polyline_simplification_benchmark.mjs; node --check tests/fixtures/polyline_simplification_benchmark_fixtures.mjs; node --check js/core/renderer/polyline_simplification_helpers.js` passed.
- `npm run bench:polyline-simplification` passed and wrote `.runtime/reports/generated/geometry-simplification-benchmark.json`.
- `node tools/perf/polyline_simplification_benchmark.mjs --iterations 200 --candidate-name simplify-js-1.2.4 --candidate-module .runtime/tmp/simplify-js-spike/package/simplify.js --out .runtime/reports/generated/geometry-simplification-simplify-js-comparison-200.json` passed.
- `rg -n '"simplify-js"|"rbush"|"flatbush"|"@turf/turf"' package.json package-lock.json` returned no matches.
- `git diff --check` passed.
- Independent code-reviewer lane returned `APPROVE`.
- Independent architect lane returned `CLEAR`.
- Post-merge focused validation passed on `main`: helper + benchmark tests, benchmark script, syntax checks, and forbidden dependency scan.
- `verify:pages-dist` was not run because this branch does not change app source, dist delivery files, or Pages manifests.

### Unverified Risks

- Benchmark timings are local machine measurements and should be treated as directional, not a stable performance gate.
- The candidate comparison covers RDP output shape and endpoint stability on representative fixtures; it is not evidence for replacing effective-area simplification.
- Candidate metrics are advisory in this spike. A future production adoption gate should make candidate point-count and endpoint invariants fail the command explicitly.

### Recommended Next Step

Push `main`, then delete the merged local feature branch after the push succeeds.
