# Scenario Forge P1.8 Pure Click-Selection Decision Owner

Date: 2026-07-09

Status: `in-progress`; implementation, root-owned deterministic verification, Pages generation, actual selector, and independent reviews complete; functional Lore commit and clean-HEAD gates pending

## Atomic owner contract

The sole production owner is `js/core/map_renderer/click_selection_transaction_owner.js` and its sole public entry is:

`resolveClickSelectionDecision(resolvedHit, readonlyModifiers) -> { decision, target }`

The owner receives the exact four-key scalar `resolvedHit` projection, never the raw hit object.

`resolvedHit` has the own keys `targetType`, `id`, `countryCode`, and `runtimeCountryCode`. The composition root materializes absent scalar identities as `null`. The owner validates exact own-key sets, enumerable data properties, scalar/null hit values, the closed target-kind enum, and four boolean modifier values.

The output keeps the closed P1.7 schema. `decision` is exactly `{ devSelectionRequested: boolean }`. Empty selection returns `{ kind: "empty" }`; admitted land, water, and special targets return `{ kind, id, countryCode, runtimeCountryCode }`. Blank identity strings normalize to `null` without mutating either input record.

## Composition-root boundary

`map_renderer.js` projects the initial resolved hit, freezes `ctrlKey`, `metaKey`, `shiftKey`, and `altKey`, delegates once, and performs admission from the returned target.

Canonical empty admission is explicit: `if (target.kind === "empty" || !id) {`; typed land/water/special targets with blank or null ids retain their typed kind and enter the same clear branch.

Water ctrl/meta toggle remains a root-owned selection behavior and reads the frozen modifier snapshot independently.

Only the land dev-selection branch consumes `decision.devSelectionRequested`.

History, dirty state, runtime selection writes, hydration, refreshed-hit resolution, sidebar refresh, rendering, DOM/UI work, and metrics remain root-owned.

The public facade, `RendererRuntimeContext`, state-write allowlist, dependencies, UI/CSS, scenario data, and effect algorithms remain unchanged in this implementation slice. Source-boundary guards cover those protected surfaces plus second or renamed owner paths. Pages mirrors and the Pages manifest remain reserved for the root-owned dist phase, where canonical generation plus `verify:pages-dist` and `verify:dist-drift` own parity.

## TDD and selector evidence

Pre-edit selector: 19 files, 186 commands, 6 main-thread commands, with only this new phase record unmatched.

The TDD RED run targeted the first behavior-test subtest before production implementation. It exited 1 for the expected missing owner module assertion only. Root-owned evidence is `.runtime/tests/renderer-runtime-context-p1-remaining-20260709/p1-8-owner-red.log`.

Implementation now covers:

- exact empty output;
- the land ctrl/meta decision formula with shift/alt inert;
- water and special targets excluded from the land dev-selection decision;
- blank identity normalization without input mutation;
- rejection of missing, extra, symbol, non-enumerable, accessor, undefined, nonscalar, nested, function, and invalid-target-type inputs;
- acceptance of a correct unfrozen modifier input record at the pure owner boundary, while the composition root supplies its frozen snapshot.

## Root-owned verification evidence

Root owned every test, checker, selector, Pages/dist builder, log, retry, and final interpretation. Focused commands passed:

```text
npm run test:node:click-selection-transaction-owner
npm run test:node:renderer-click-selection-transaction-inventory
npm run test:python:map-renderer-click-selection-transaction-boundary
npm run test:node:verification-metadata
npm run test:node:verify-core-runner
npm run verify:architecture-boundaries
npm run verify:state-write-allowlist
npm run verify:test-import-graph
npm run verify:supervisor-contracts
npm run verify:supervisor-plan
```

Shared and generated gates passed:

- `verify:architecture-boundaries`
- `verify:state-write-allowlist`
- `verify:test-import-graph`
- `verify:supervisor-contracts`
- `verify:supervisor-plan`
- `verify:core:list`
- `test:node:scenario-chunk-contracts` after updating its dev-selection static contract to the P1.8 decision branch
- canonical Pages builder
- `verify:pages-dist`
- `git diff --check`

Actual adaptive selection wrote `.runtime/reports/generated/p1-8-actual-adaptive-selection.{json,md}` and reported 19 changed files, 187 recommended commands, 6 main-thread commands, and `unmatchedChangedFiles=[]`.

Generated scope is `dist/app/js/core/map_renderer.js`, `dist/app/js/core/map_renderer/click_selection_transaction_owner.js`, and `dist/pages-dist-manifest.json`. The pre-commit `verify:dist-drift` run exited 1 because those intended generated changes were still uncommitted; the clean-HEAD drift rerun passed after the current P1.8 functional HEAD.

Independent review evidence: architecture, code/evidence, and contract adjudication lanes returned `APPROVE / CLEAR`.

## Remaining risk

The implementation remains `in-progress` until the amended atomic Lore commit, clean-HEAD `verify:core`, and committed selector pass. Browser, dev-server, Playwright, perf, scenario-data, heavy-geo, and `verify:core:main-thread` stay explicit unrun lanes because deterministic contracts leave no browser-specific residual risk.

## Focused rework checkpoint

- The Python boundary run reached 5/6. Its sole failure is a test-placement error: the file-level owner import was asserted inside the extracted `handleClick` function body. Classification: boundary-test contract placement; production behavior is outside this failure.
- The verify-core runner run reached 7/8. Its sole failure is reverse routing from the three new renderer-runtime `sourceRefs` entries back to `tests/verify_core_runner_behavior.test.mjs`. Classification: verification metadata ownership; production behavior is outside this failure.
- Rework status: corrected contracts passed on root rerun.
- Contract ruling C keeps typed blank-id targets typed and makes canonical empty admission explicit at the composition root; owner normalization, data-property validation, and enumerable-property validation remain unchanged.
- The approved test-spec gap is now covered by an executable admission harness in the existing P54 inventory test. The harness compiles the actual current `handleClick` source through `extractFunctionSource` plus `new Function`, injects only the dependencies reached before the selected early returns, and records every reached effect stub in a trace.
- One fixed raw land hit now proves returned canonical empty, typed blank-id land, special, water, and land targets control the five admission outcomes. A fixed admitted land target also proves `decision.devSelectionRequested: true` reaches the dev toggle while `false` reaches leaf-detail hydration.
- Root rerun passed for the executable harness, architecture checker, corrected focused contracts, shared deterministic gates, Pages generation, `verify:pages-dist`, actual selector, and independent reviews. The remaining checkpoint is the atomic commit plus clean-HEAD verification.
