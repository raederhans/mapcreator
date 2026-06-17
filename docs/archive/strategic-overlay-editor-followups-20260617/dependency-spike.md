# Strategic Overlay Dependency Spike

Date: 2026-06-17

## Decision

Keep production dependencies unchanged in this round.

Recommended next step is to extract local geometry/index helpers first, then benchmark candidate packages against the extracted contracts. Current evidence shows useful candidates, but no package gives a clear enough win to combine with the Strategic Overlay owner split.

## Evidence

Repository surface:

- `js/core/map_renderer.js` owns `simplifyPolylineRDP`, latitude-adjusted epsilon, and `simplifyPolylineEffectiveArea`.
- `js/core/renderer/border_mesh_dynamic_runtime.js` already accepts simplification helpers by injection for coastline mesh building.
- `js/core/renderer/spatial_query_index.js` queries a grid snapshot, preserves draw order, includes `globals`, and reports candidate overflow.
- `js/core/renderer/spatial_index_runtime_builders.js` builds that grid with bounded cells and a `globals` escape path for large items.
- `tests/spatial_query_index_behavior.test.mjs` locks query semantics that any replacement must preserve.

NPM metadata checked with `npm view` on 2026-06-17:

| Package | Version | License | Dependencies | Unpacked size | Modified | Fit |
| --- | ---: | --- | --- | ---: | --- | --- |
| `simplify-js` | 1.2.4 | BSD-2-Clause | none reported | 7,105 bytes | 2022-06-26 | Good small RDP candidate |
| `rbush` | 4.0.1 | MIT | `quickselect` | 48,823 bytes | 2024-08-21 | Good dynamic R-tree candidate |
| `flatbush` | 4.6.2 | ISC | `flatqueue` | 53,919 bytes | 2026-06-09 | Good static index candidate |

## Candidate Conclusions

### `simplify-js`: defer, then test as RDP helper

Verdict: defer production import.

Reason: package size and API shape are attractive for `simplifyPolylineRDP`, but the current coastline path also uses latitude-adjusted effective-area simplification. Replacing only RDP leaves the main coastline path mostly unchanged, so the immediate simplification win is limited.

Replacement range:

- Possible: `simplifyPolylineRDP`.
- Keep local: sanitation, latitude scaling, effective-area heap logic, min-length filtering.

Required gates before import:

- Add direct behavior tests for duplicate point sanitation, epsilon zero, high-latitude epsilon scaling, and minimum two-point output.
- Compare output point counts for representative coastline meshes.
- Run `verify:pages-dist`.

### `rbush` / `flatbush`: defer pending benchmark

Verdict: defer production import.

Reason: current spatial query logic is small and carries product-specific behavior: draw-order sorting, `globals` for large items, overflow reporting, and stats for visible queries. `rbush` and `flatbush` may improve query performance, but either replacement needs a benchmark and adapter layer to preserve these semantics.

Replacement range:

- Possible: backing index for projected rectangle candidate lookup.
- Keep local: feature item normalization, `globals` policy, draw-order sorting, overflow reporting, visible-query stats.

Required gates before import:

- Add benchmark cases against `tests/spatial_query_index_behavior.test.mjs` fixtures plus a large scenario snapshot.
- Compare build time, query time, memory, candidate count, draw-order output, and `globals` behavior.
- Run `npm run test:node:spatial-query-index`, `npm run test:node:renderer-splits`, and `verify:pages-dist`.

### `@turf/turf`: keep paused

Verdict: keep paused.

Reason: current target is narrow helper replacement. The broad Turf bundle does not match this delivery model.

## Actionable Path

1. Extract local polyline simplification helpers from `map_renderer.js` into a focused renderer helper module with tests.
2. Extract spatial query adapter contracts around the existing grid snapshot.
3. Benchmark `simplify-js`, `rbush`, and `flatbush` against those contracts.
4. Import only when the benchmark shows a clear reduction in local code or query cost with unchanged behavior.
