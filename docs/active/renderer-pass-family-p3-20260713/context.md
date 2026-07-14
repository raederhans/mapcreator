# P3.0 Render-Pass Family Context

## Frozen workspace truth

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-renderer-pass-family-p3-20260713`
- Branch: `codex/renderer-pass-family-p3-20260713`
- Exact base: `origin/main@63dd0bb5e23afd340afe2dc0dcc74095cc4cb2cd`
- Parent checkout: 57 pre-existing WIP entries preserved untouched.
- Live-process boundary: the App leader is the sole owner of dist, full-core, browser, Playwright, performance, push, and integration. The isolated `origin/main@63dd0bb5` perf control completed and released `perf-dev-server`, `playwright-browser`, and `.runtime-output`; no P3 live process is active. Its logs and manifest remain under `.runtime/reports/generated/renderer-pass-family-p3-0/main-control-63dd0bb5/`.
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
12. The inventory field is `entryHostPath`: all 13 pass entries live in `js/core/map_renderer.js`. Existing delegated owners for `physicalBase` and `hgoPreview` are recorded in `existingDependencyOwners`, keeping entry location and delegation meaning separate.
13. The central contract is source-grounded by the two production catalogs, the entry host, HGO preview owner, transport normalization owner, and UI-state normalization source. Its reviewed dependency snapshot verifies path existence plus direct import edges, with one explicit HGO preview-owner to frame-commit edge; the former mirrored `EXPECTED_INVENTORY` oracle was removed.
14. The verification route includes the `js/` and `dist/` scopes scanned by the central contract, covering dependency-owner deletion and forbidden production imports. Route assertions bind this command locally and no longer freeze unrelated repository-wide metadata totals.

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
- Adaptive selection over all 14 delivery files reports `unmatchedChangedFiles: []` and `routeGaps: []`; the refreshed closeout dry-run supervisor exits 0 and records `gitSha` equal to the published docs HEAD. Evidence lives under `.runtime/reports/generated/renderer-pass-family-p3-0/blocked-final/`.
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
- The exact runtime validation candidate is `89c7278a3d4e730d3ed1c19945375ec539c42082`; it contains the final `contextMarkers` runtime-state correction and every prior inventory/test correction. Exact run `final3-89c7278a` binds the baseline to that candidate. The later docs-only closeout records the final evidence while preserving the validated runtime/tool/test candidate bytes. Williams stays excluded.
- The 2026-07-14 audit reproduced and repaired three verification defects: a self-mirrored inventory oracle, omitted SF-ATS source routing for files the contract reads, and an unbounded test-only action-clock wait. Red/green evidence is recorded by the named inventory, metadata, and E2E structural contracts.
- Clean audit commit `d8991c8b58bbb6ce1984959727663ce9c9ff1f40` passes `verify:core` 70/70, including Pages/dist and dist-drift, with clean tracked status before and after. The exact changed TNO Water spec passes 2/2 in 3.6 minutes with one worker; its runtime summary and screenshot remain under `.runtime/tests/playwright/tno_open_ocean_rendering/`.
- Fresh SF-ATS selection covers 15 branch files with zero unmatched files and zero route gaps. Generated evidence: `.runtime/reports/generated/audit-20260714-p3-fixed-selection.{json,md}` and `.runtime/reports/generated/audit-20260714-p3-fixed-supervisor-{plan,dossier}.json`.

## Final clean candidate baseline and blocking evidence

- The exact runtime candidate was `89c7278a3d4e730d3ed1c19945375ec539c42082`, with tracked status `[]`, production-path diff `[]`, package-lock Git blob `df70020f2f930d5692a1ff9febebf86dbb0e0db1`, Node `v22.23.0`, npm `11.18.0`, Python `3.12.10`, Playwright `1.58.2`, and Chromium `145.0.7632.6`.
- Exact ten-command run `final3-89c7278a` executed the complete prescribed order. Its fail-fast wrapper stopped after command 8, then the continuation record appended commands 9 and 10 under the same candidate, environment, lock set, and order. The unified manifest records all ten results and preserves the pre-continuation manifest. Commands 1-7 and 9 passed: Pages/dist, dist drift, core 70, main-thread 74, physical 1/1, resilience 3/3, city 8/8, and TNO 2/2.
- Command 8 Water finished 11/12. The sole failure occurred before its lake/intermittent business assertions: `waitForChunkIdle` held `pendingInfraPromotion=true` for 120 seconds. Fresh-worker run `single-lake-intermittent-89c7278a` passed 1/1, and ordered run `pair-major-lake-89c7278a` passed 2/2 after the same preceding major/mid-tier case. Earlier complete run `final2-bea4aa28` also passed Water 12/12. The evidence classifies this result as a timing-sensitive chunk-infrastructure stall while retaining the original command-8 failure as a full-baseline red item.
- Command 10 `perf:gate` exited 1. TNO startup measured `8493.1 ms` against the April `5805.3 ms` oracle and `6676.1 ms` limit. HOI4 startup measured `8193.0 ms` against `5205.7 ms` and `5986.6 ms`. HOI4 legacy render median measured `746.5 ms` against `560.9 ms` and `701.1 ms`. The gate report records zero contract mismatches and zero render-role mismatches.
- Historical run `final2-bea4aa28` and clean focused rerun `focused-perf1-bea4aa28` reproduce the same three-metric failure shape. The focused values were TNO startup `8695.2 ms`, HOI4 startup `8181.8 ms`, and HOI4 legacy render median `718.6 ms`.
- A preserved local failure snapshot with seven SHA-256-recorded gate/raw files lives under `.runtime/reports/generated/renderer-pass-family-p3-0/final3-89c7278a/perf-gate-failure-snapshot/`. The unified baseline manifest, continuation manifest, Water failure trace, and focused Water manifests remain ignored local evidence. Every run ended at unchanged runtime candidate, clean tracked status, production diff `[]`, empty owned port/process sets, and every acquired lock released.
- The clean `origin/main@63dd0bb5` control completed under the same dependency and workload identity. It reproduced TNO startup `6850.3 ms > 6676.1 ms` and HOI4 startup `5993.0 ms > 5986.6 ms`; report contract mismatches and render-role mismatches both stayed empty. The April schema-1 oracle therefore fails against unchanged current-main bytes. Candidate-only HOI4 legacy render red remains a run-order or machine-load inference and is not used as proof of a code regression.
- Base-to-runtime-candidate byte identity excludes a P3-attributable production/runtime regression: `origin/main...89c7278a` changes zero production, perf runner, perf oracle, or dependency-lock files. P3.0 tooling/test integration can proceed after fresh deterministic and Water verification. P3.1 remains blocked pending an explicit performance-governance decision for a dated schema-2 oracle with measured runs, exact workload/browser identity, and canonical render-role governance.
- The fresh audit validation satisfies the P3.0 integration branch: clean core 70/70, exact changed Water 2/2, selector zero-gap, and three independent static rereviews. The inherited performance red remains outside the P3.0 code-attribution boundary and continues to block P3.1 admission.

## 2026-07-14 runtime continuation

- P3.0 and the audited schema-2 performance governance are integrated and pushed to `origin/main@6fe219182f66c6c22159f8825de2a0cc40f8d873`.
- Runtime work continues in `C:\Users\raede\.codex\worktrees\mapcreator-p3-runtime-20260714` on `codex/renderer-pass-family-p3-runtime-20260714`; this docs-only handoff is committed before rebasing the branch onto the integrated main.
- The schema-2 oracle is now the standard P3 performance contract. Fresh evidence at the integrated head records Water 12/12, `verify:core` 70/70, and `perf:gate` exit 0. Specialized Williams measurement remains a separate research lane.
- Source review corrected the phase design: style-config and deferred-snapshot resolution can record or normalize runtime state, so composition-root resolvers own those effects while the new pass owners remain state-free.
- Inventory entries keep `entryHostPath: js/core/map_renderer.js` because the stable pass entry wrappers remain there. P3 owners are recorded in `existingDependencyOwners` and `implementationStatus` becomes `owned-p3`.
- P3.1 extracts the four visual-effects pass wrappers. P3.2 extracts the three context pass orchestrations and atomically retargets five existing source-scan contracts. P3.3a freezes the political pass boundary before P3.3b extracts only top-level orchestration.
- The root App integration owner exclusively owns all runtime dist, browser, Playwright, and performance processes. Static subagents may inspect code and completed artifacts only.
