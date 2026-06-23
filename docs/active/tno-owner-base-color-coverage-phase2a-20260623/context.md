# Context

## Starting State

- Parent checkout: `C:/Users/raede/Desktop/dev/mapcreator`, `main@123e36ec`, with unrelated local `data/i18n/manual_ui.json` modification.
- Task worktree: `C:/Users/raede/.codex/worktrees/mapcreator-tno-owner-color-coverage-20260623`.
- Branch: `codex/tno-owner-color-coverage-20260623`, tracking `origin/main`.
- Base commit: `123e36ec713259f9e2337f8e04939267ed65e794`.
- Live process owner: main Codex agent only. Subagents may perform static analysis and review; they must not run or monitor browser/dev-server/live test processes.
- `node_modules` in the task worktree is a local junction to the parent checkout dependency directory and is not part of the commit.

## Phase Boundaries

- Phase 1 fixed viewport-derived-state coverage: the visible political subset cannot become stable `landData`/spatial/colors state.
- Phase 2A repairs owner/base-color coverage universe for TNO missing owner codes.
- Phase 2B remains 1936/1939 Red Sea, likely water/base-geography/shell fallback pollution. This task only records Red Sea diagnostics if they appear.

## Findings Log

- Phase 1.5 smoke on base `123e36ec` showed the chunk-derived-state repair is stable for the target signal: `tno zoom-end keeps Great Lakes Congo political detail fill stable` passed, and ordinary-country missing feature coverage for POL/FRA/common countries did not reappear in stable/deferred diagnostics.
- The same full smoke exposed Phase 2A color coverage gaps: `tno runtime color coverage includes rendered spatial items` reported `missingFeatureIds: []` but `missingResolvedColorCount=9` and `missingOwnerColorCount=9` for `CF`, `CG`, `CM`, `CY`, `EH`, `GA`, `MT`, `TW`, and `VA`.
- Those nine entries are present as rendered land/spatial items. The failing source was owner/base-color coverage: `getDisplayOwnerCode` resolved owner codes from feature properties such as `cntr_code`, while `scenarioColorMap` and base color mirrors were built from the smaller scenario country map.
- `data/scenarios/tno_1962/runtime_topology.topo.json` and the TNO chunk manifest do not contain all nine target codes. `data/europe_topology.json` primary political topology does contain them, so Phase 2A collects the owner universe from base topology plus scenario topology and owner/controller maps.
- `countryNames` currently covers only `CY`, `MT`, and `TW` among the nine. The other six reach runtime through topology/feature owner properties, which is why country-map-only color construction missed them.

## Missing-Code Provenance

| Code | Observed Source | In scenario country map | In app country names | Color path after fix |
| --- | --- | --- | --- | --- |
| `CF` | base topology `cntr_code` / `ISO_A2` owner code | no | no | ISO2 bridge to `CAF`, then palette color |
| `CG` | base topology political owner code | no | no | deterministic generated owner color |
| `CM` | base topology `cntr_code` / `ISO_A2` owner code | no | no | ISO2 bridge to `CMR`, then palette color |
| `CY` | base topology political owner code plus country name key | no | yes | deterministic generated owner color when palette bridge lacks a match |
| `EH` | base topology `ISO_A2_EH` owner code | no | no | deterministic generated owner color |
| `GA` | base topology political owner code | no | no | deterministic generated owner color |
| `MT` | base topology `cntr_code` / `ISO_A2` owner code plus country name key | no | yes | ISO2 bridge to `MLT`, then palette color |
| `TW` | base topology `cntr_code` / `ISO_A2` owner code plus country name key | no | yes | ISO2 bridge to `TWN`, then palette color |
| `VA` | base topology political owner code or shell owner hint | no | no | deterministic generated owner color |

## Implementation Notes

- `buildScenarioOwnerColorUniverse` now collects tags from `countries.json`, runtime/base country names, base topology, scenario runtime topology, owner/controller/resolved-owner maps, shell owner hints, startup seed maps, and directly available releasable parent/child tags.
- `buildScenarioOwnerColorMapDetails` accepts owner tags outside the country map and creates a minimal two-letter ISO2 entry for them, allowing the existing palette map bridge to resolve `CF`, `CM`, `MT`, and `TW`.
- Priority remains explicit seed/country color, palette tag, ISO2 bridge, then deterministic generated color. Country-map entries enter first, so owner-universe fallback does not overwrite explicit country colors.
- `scenarioGeneratedColorTags`, `scenarioOwnerColorTags`, and render transaction counts record generated fallback coverage for future diagnosis.

## Validation Notes

- Passed: `npm run test:node:palette-runtime-bridge`.
- Passed: `npm run test:node:scenario-lifecycle-runtime-behavior`.
- Passed: `npm run test:node:scenario-runtime-state-behavior`.
- Passed: `npm run test:node:scenario-refresh-plans`.
- Passed: `npm run test:node:scenario-chunk-promotion-helpers`.
- Passed: `npm run test:node:scenario-chunk-contracts`.
- Passed: `npm run test:node:render-transaction-diagnostics`.
- Passed: `npm run python -- -m unittest tests.test_scenario_chunk_refresh_contracts tests.test_map_renderer_political_collection_boundary_contract tests.test_map_renderer_color_resolution_strategy_boundary_contract tests.test_map_renderer_public_contract -q`.
- Passed: `npm run verify:pages-dist`.
- Browser smoke after the fix: `npm run test:e2e:dev:scenario-chunk-runtime` passed 7 of 8 tests. The Phase 2A runtime color coverage test now passes, and the Phase 1.5 Great Lakes Congo stability test still passes.
- Remaining browser smoke failure: `tno post-edit keeps political detail fill before progressive recovery skip` still samples blue pixels for `FR_ARR_18002` even though runtime reports `resolvedColor: "#ff00aa"` and `displayOwnerCode: "FRA"`. This is the same residual failure observed before the owner-universe fix and belongs to a later post-edit draw/probe lane.
