# Geometry Simplification Benchmark and Dependency Spike Context

## Current State

- Branch: `codex/geometry-simplification-benchmark-spike`
- Base commit: `main@b984a59e`
- Live process owner: main Codex agent only.
- Static review lane: subagent may read files and recommend checks, but must not run live tests or edit files.

## Evidence

- `js/core/renderer/polyline_simplification_helpers.js` exports the extracted helper contracts.
- `tests/polyline_simplification_helpers_behavior.test.mjs` already locks shallow-copy, invalid-point, endpoint, latitude clamp, and effective-area representative behavior.
- `tools/perf/special_zone_members_benchmark.mjs` is the closest local benchmark style: deterministic setup, `performance.now`, JSON output under `.runtime/output/perf`.
- `docs/archive/strategic-overlay-editor-followups-20260617/dependency-spike.md` recommends local helper contracts and benchmarks before production dependency changes.
- `npm view simplify-js` reports version `1.2.4`, license `BSD-2-Clause`, unpacked size `7105`, modified `2022-06-26T20:07:55.654Z`, with no dependency field returned.

## Decisions

- Use a focused tool under `tools/perf/polyline_simplification_benchmark.mjs`.
- Put deterministic benchmark fixtures under `tests/fixtures/` so behavior tests and tooling share the same data.
- Keep candidate package extraction under `.runtime/tmp/simplify-js-spike`.
- Do not touch `dist/app` unless production app source changes.

## Progress Log

- 2026-06-17: Created branch from clean `main@b984a59e`, loaded `autopilot` and `ultrawork`, read `lessons learned.md`, ran two-step repo search, and confirmed dependency-spike constraints.
- 2026-06-17: Added red-first benchmark contract test. Initial run failed with `ERR_MODULE_NOT_FOUND` for `tools/perf/polyline_simplification_benchmark.mjs`, proving the new contract needed implementation.
- 2026-06-17: Added deterministic benchmark fixtures and a local benchmark runner with optional candidate module support.
- 2026-06-17: Ran helper + benchmark tests, syntax checks, current-helper benchmark, and dev-only `simplify-js` comparison under `.runtime`.
- 2026-06-17: Recorded dependency decision: keep production dependencies unchanged; retain `simplify-js@1.2.4` as an RDP-only future candidate.
- 2026-06-17: First-principles review found that comparing candidate total to local total could mislead because local total includes effective-area. Benchmark report now exposes local RDP and effective-area totals separately.
