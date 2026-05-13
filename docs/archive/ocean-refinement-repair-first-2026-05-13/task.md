# Ocean Refinement repair-first task ledger

- [x] Wave 0: update docs to repair-first and record live owner barrier.
- [x] Wave 1: owners consistency red-light test.
- [x] Wave 1: checkpoint manifest hard-fail test update.
- [x] Wave 1: D3 orientation single-owner invariant test.
- [x] Wave 1: ATL prefix/classify/decorate parity coverage.
- [x] Wave 2: rename and implement `rebuild_water_domain_feature_maps_from_validated_scenario()`.
- [x] Wave 2: remove inline D3 reverse from split/clip flow.
- [x] Wave 2: expose public APIs from contract checker and water validator.
- [x] Wave 2: change safe repair second pass into idempotence check.
- [x] Wave 3: delete dead preserve-geometry helper and add decision/diagnostic comments.
- [x] Wave 4: extend validator and startup parity coverage within current scope.
- [x] Main-thread validation gates.
- [x] Review-查 bug-第一性原理自检 and final documentation update.

## Verification index

- Python/static: py_compile, boundary unittest, `test:py:tno-water-repair-contracts`.
- Node contracts: scenario lifecycle, scenario chunk contracts, startup hydration.
- Scenario contracts: strict checker and TNO water geometry validator reports under `.runtime/reports/generated/`.
- Browser/E2E: water-rendering and TNO contracts logs under `.runtime/tests/playwright/`.
- Perf: `perf-gate-final.log` under `.runtime/tests/playwright/`.

## Live process owner

Main thread only. Child agents remained read-only support lanes for static analysis and review.
