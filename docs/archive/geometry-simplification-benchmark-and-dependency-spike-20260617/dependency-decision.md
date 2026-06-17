# Geometry Simplification Dependency Decision

## Decision

Keep production dependencies unchanged for this round.

`simplify-js@1.2.4` remains a plausible future RDP-only candidate. It should not be promoted into production until a production call path needs RDP replacement and the effective-area coastline path has its own contract/performance case.

## Evidence

- `npm view simplify-js` returned version `1.2.4`, license `BSD-2-Clause`, unpacked size `7105`, modified `2022-06-26T20:07:55.654Z`, and no dependency field.
- `npm pack simplify-js` was extracted only under `.runtime/tmp/simplify-js-spike`.
- Benchmark report without candidate: `.runtime/reports/generated/geometry-simplification-benchmark.json`.
- Candidate comparison report: `.runtime/reports/generated/geometry-simplification-simplify-js-comparison-200.json`.
- 200-iteration comparison:
  - Local RDP total: `8.514ms`.
  - Local effective-area total: `26.985ms`.
  - Candidate RDP total: `5.305ms`.
  - Candidate output point counts matched local RDP for the three fixtures.
  - Candidate endpoint stability was true for all fixtures.

## First-Principles Check

The current coastline simplification behavior is a composed contract:

- `sanitizePolyline` filters invalid points, converts numeric strings, and removes only consecutive duplicates.
- `getLatitudeAdjustedSimplifyEpsilon` applies the current latitude clamp before simplification.
- `simplifyPolylineRDP` is one simplification algorithm.
- `simplifyPolylineEffectiveArea` is a separate area-threshold algorithm and keeps at least two points.

`simplify-js` can only replace the RDP part after an adapter converts `[x, y]` points to `{ x, y }` points. It does not replace sanitization, latitude scaling, or effective-area logic. Replacing only RDP today would add a production dependency while leaving the main coastline effective-area path local.

## Next Gate For Production Adoption

- Keep the local benchmark script and fixtures as the comparison harness.
- Add a production replacement only when the renderer has a measured RDP hotspot or a simplification API boundary that uses RDP directly.
- Require unchanged helper behavior tests, unchanged package boundary tests until adoption is explicit, and `verify:pages-dist` if app source or dist delivery files are touched.
