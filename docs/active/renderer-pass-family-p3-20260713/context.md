# P3.0 Render-Pass Family Context

## Frozen workspace truth

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-renderer-pass-family-p3-20260713`
- Branch: `codex/renderer-pass-family-p3-20260713`
- Exact base: `origin/main@63dd0bb5e23afd340afe2dc0dcc74095cc4cb2cd`
- Parent checkout: 57 pre-existing WIP entries preserved untouched.
- Live-process boundary: the formal Team lane completed and released all child-safe deterministic work. The App leader is the sole owner of dist, full-core, browser, Playwright, performance, push, and integration.
- Dependency identity: `package-lock.json` Git blob `df70020f2f930d5692a1ff9febebf86dbb0e0db1`; Node `v22.23.0`; npm `11.18.0`.

## Source-grounded ontology corrections

The approved planning records remain immutable. Current source at the exact base establishes these corrections:

1. `borders.implementationStatus` is `thin-wrapper`. `drawBordersPass` owns HGO/data guards and delegates the main draw to `js/core/renderer/border_draw_owner.js`. The current thin wrappers are `borders` and `labels`.
2. `effects`, `lineEffects`, `dayNight`, and `textureLabels` use `riskTier: medium`. Idempotent style-config normalization writes shared `runtimeState`, which creates limited shared-state coupling. `effects` also crosses the asynchronous image/cache/render-request boundary; `dayNight` additionally reads the clock.
3. `effects`, `lineEffects`, `dayNight`, and `textureLabels` include `runtime-state` in `stateWriteClass`.
4. `physicalBase` includes `scenario` in `stateReadClass` because the pass signature reads `activeScenarioId` and the scenario topology token.
5. `effects.existingDependencyOwners` includes `js/core/map_renderer/render_request_boundary_owner.js`, which owns the asynchronous texture rerender request.
6. Risk semantics: idempotent style-config normalization is limited shared-state coupling and maps to `medium`. Ownership-critical cross-pass lifecycle mutation maps to `high`.
7. `background` includes `runtime-state` and `diagnostics` writes because the ocean owner updates mask mode/quality while the depth-mask path normalizes intensity fields and records performance metrics. `contextBase` includes `runtime-state` because its urban-layer multiplier normalizes shared intensity fields.
8. `political` directly uses the raster worker client, packet builder, and accepted-result render-request boundary in addition to the color, collection, spatial-index, and visible-frame owners. Its browser evidence includes the water lane because the Atlantropa donor-island contract exercises political land rendering and hit resolution.
9. `background` reads scenario identity through ocean/coastal-accent state and reaches the bathymetry asset URL policy. `borders` reaches the ocean owner through the injected coastal-accent draw. `dayNight` reads scenario identity and reaches urban/city policy through the city-lights owner.
10. `contextBase`, `contextScenario`, `contextMarkers`, and `labels` reach centralized color resolution. `contextMarkers` also invokes the strategic-resource marker builder, while `labels` reaches the dedicated city-label owner through the city-points owner.
11. `contextMarkers` includes `runtime-state` writes because every transport overview draw resolves its family/visual configuration through `ensureTransportOverviewStyleConfigState(runtimeState)`, which normalizes `styleConfig.transportOverview` in place.

## 13-pass source review

Both production catalogs contain the same 13-pass set. The inventory follows `IDLE_RENDER_PASS_DEFINITIONS` order. The secondary map-renderer catalog keeps its existing local order difference for `contextMarkers`; production catalogs remain read-only.

- `background`: inline foundational full-canvas work with scenario-aware ocean, bathymetry asset-policy, and intensity owners; high coupling and performance sensitivity.
- `physicalBase`: existing physical owner delegation; scenario-aware signature and shared runtime/diagnostic writes.
- `political`: high-coupling inline orchestration across raster worker client/packet construction, accepted-result render requests, color, collection, spatial-index, and visible-frame owners; P3.3a preflight only.
- `hgoPreview`: existing HGO preview owner delegation; dedicated browser lane gap stays explicit.
- `contextBase`, `contextScenario`, `contextMarkers`: high-coupling P3.2 orchestration across physical, river, water, relief, transport, strategic, city, and color-resolution owners.
- `effects`, `lineEffects`, `dayNight`, `textureLabels`: P3.1 visual-effects family with the shared texture normalization corrections above.
- `borders`: thin wrapper around the existing border owner with wrapper-owned guards and an injected ocean/coastal-accent draw.
- `labels`: thin wrapper retaining blank-label behavior and delegating city reveal, label draw, and color-resolution work.

## Progress

- Inventory, contract test, package script, metadata route, metadata/runner assertions, coupling matrix, and worktree records are implemented.
- The child-safe sequence passes: inventory 6/6, metadata 18/18, runner 8/8, architecture boundaries, 116-file state-write allowlist, 51-spec import graph, supervisor contracts/plan, selector schema, 70-command core list, and diff checks.
- Adaptive selection over all 14 delivery files reports `unmatchedChangedFiles: []` and `routeGaps: []`; the final dry-run supervisor exits 0. Evidence lives under `.runtime/reports/generated/renderer-pass-family-p3-0/blocked-final/`.
- The initial verify-core runner check exposed base-stale fixture coverage for two already registered city owner scripts and two already registered optional main-thread lanes. The focused fixture update aligns the test with live metadata; the final rerun passes 8/8.
- Preliminary clean-HEAD baseline `preliminary-e9ba9e0b` passed `verify:pages-dist` and `verify:dist-drift`, then `verify:core` stopped at `test:node:render-sample-role-policy`. Two governed-report tests attempted to read an expired ignored file at `.runtime/reports/generated/p2-1-performance-ab-20260711.json`; commands after core were never started. Evidence: `.runtime/reports/generated/renderer-pass-family-p3-0/preliminary-e9ba9e0b/`.
- Git history establishes the test-infrastructure root cause: commit `14878c78937f36f9ddee53a876521494a2214cbb` registered the child-safe test while its source report and 40 raw inputs remained under the already ignored `.runtime/` tree. Those artifact paths have no object in Git history, so a clean worktree cannot satisfy the unit test's implicit default-path precondition.
- The focused repair stays in `tests/perf_role_governed_report_behavior.test.mjs`. It materializes one source report and 40 raw runs under the system temporary directory, computes source and raw-manifest identities independently, injects the analyzer's existing path/hash options, preserves A/B medians and TNO first-role composition, verifies fail-closed source identity, and cleans up through the Node test lifecycle. `tools/perf/analyze_render_sample_roles.mjs` and its historical offline defaults remain unchanged.
- The repaired package command passes 36/36. The current linear branch records the hermetic repair at `ec7e5fa39a882afe5295d327864cacffbb900bbf`; historical baseline label `repair-head-19779a44` preserves the tree-identical predecessor used by that run.
- The first repair-HEAD baseline `repair-head-19779a44` passed Pages/dist, core, main-thread, physical, scenario-resilience, and city commands. Water passed 11/12 and stopped the fail-closed sequence before TNO contracts and perf gate. Evidence lives under `.runtime/reports/generated/renderer-pass-family-p3-0/repair-head-19779a44/`.
- The failed donor-island trace established test self-pollution: TNO activates sovereignty paint with `GER`, while the land hit helper used ordinary candidate clicks and could rewrite the checked `TUR` owner before a later retry. Git history traces the latent helper contract to `70ecc6a`; P3 production paths are unchanged.
- The test-only repair drives the existing Ctrl dev-selection branch, waits for its diagnostic action, and rechecks runtime ownership after the click. This preserves real hit resolution while making the no-sovereignty-write invariant deterministic.
- A clean full water lane passed 12/12 in 15.5 minutes with one worker and zero retries, including the strengthened donor-island ownership invariant and canal regression. Evidence: `.runtime/tests/playwright/p3-0-water-rendering-network-stable-rerun.log`.
- A preceding water attempt failed during startup module import. The later clean full-lane rerun passed every affected case, so the earlier attempt remains non-diagnostic and provides no basis for production changes.
- Independent root-cause, history, architecture, patch, and final-contract reviews agree on the test boundary. Their dependency audit added the worker render-request boundary, scenario reads, bathymetry asset policy, coastal-accent ocean owner, urban/city policy, strategic marker builder, city-label owner, and color-resolution paths to the frozen inventory.
- The exact baseline runner now treats `js/`, `dist/`, `css/`, `data/`, `landing/`, `public/`, `scenarios/`, and `index.html` as the fail-closed production-zero manifest.
- The runtime baseline candidate and prior inventory/test corrections are committed at `bea4aa28b967925d65e772f5f53173e0db0ca810`; the final `contextMarkers` state-write correction belongs to the fifth non-production closeout commit. Williams stays excluded.

## Final clean baseline and blocking evidence

- The exact clean candidate was `bea4aa28b967925d65e772f5f53173e0db0ca810`, with tracked status `[]`, production-path diff `[]`, package-lock Git blob `df70020f2f930d5692a1ff9febebf86dbb0e0db1`, Node `v22.23.0`, npm `11.18.0`, Python `3.12.10`, Playwright `1.58.2`, and Chromium `145.0.7632.6`.
- Complete baseline run `final2-bea4aa28` passed commands 1-9. `verify:core` completed 70 commands; `verify:core:main-thread` completed 74 commands with browser subsets smoke 4/4, concurrency 1/1, save/load 5/5, and interaction funnel 3/3. Physical layer passed 1/1, scenario resilience 3/3, city rendering 8/8, water rendering 12/12, and TNO contracts 2/2.
- Command 10 `perf:gate` exited 1. TNO startup measured `9014.8 ms` against the April `5805.3 ms` oracle and `6676.1 ms` limit. HOI4 startup measured `7669.0 ms` against `5205.7 ms` and `5986.6 ms`. HOI4 legacy render median measured `739.5 ms` against `560.9 ms` and `701.1 ms`.
- A clean focused rerun `focused-perf1-bea4aa28` used the same HEAD, empty tracked and production status, empty owned process/port sets, fresh server/browser ownership, four explicit locks, three warmups, three measured runs, and unchanged thresholds. It reproduced the same shape: TNO startup `8695.2 ms`, HOI4 startup `8181.8 ms`, and HOI4 legacy render median `718.6 ms`.
- The full failure snapshot is immutable under `.runtime/reports/generated/renderer-pass-family-p3-0/final2-bea4aa28/perf-gate-failure-snapshot/`. Focused evidence and its cleanup manifest live under `.runtime/reports/generated/renderer-pass-family-p3-0/focused-perf1-bea4aa28/`. Both runs ended with unchanged HEAD, clean tracked status, production diff `[]`, no owned ports/processes, and every acquired lock released.
- Three independent static reviews identify an attribution gap. The April oracle uses schema 1 at `eaa2a6b7`, old feature counts, one render sample, and incomplete exact browser/workload identity; the current gate uses schema 2, larger TNO/HOI4 workloads, two samples, and the canonical role policy. Historical clean-main and P2 runs already contain the same three red metrics. These facts limit direct comparison while leaving current-main regression, workload/harness drift, and machine effects for a controlled governance lane to distinguish.
- A P3-attributable production/runtime regression is excluded by byte identity: `origin/main...bea4aa28` changes no production, perf runner, perf oracle, or dependency-lock file. The task stops before P3.1 under the prescribed red-baseline rule. The required next owner is an independent performance-governance lane that runs a clean current-main control, resolves attribution, then either fixes a verified regression or records an explicit decision for a dated schema-2 oracle with five measured runs, exact workload/browser identity, and canonical render-role governance. P3.0 reruns the complete sequence only after that decision.
