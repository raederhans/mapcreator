# P3.0 Render-Pass Family Context

## Frozen workspace truth

- Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-renderer-pass-family-p3-20260713`
- Branch: `codex/renderer-pass-family-p3-20260713`
- Exact base: `origin/main@63dd0bb5e23afd340afe2dc0dcc74095cc4cb2cd`
- Parent checkout: 57 pre-existing WIP entries preserved untouched.
- Worker live-process boundary: worker-1 runs child-safe deterministic commands only. The App leader owns browser, Playwright, dist, full-core, performance, push, and integration.
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

## 13-pass source review

Both production catalogs contain the same 13-pass set. The inventory follows `IDLE_RENDER_PASS_DEFINITIONS` order. The secondary map-renderer catalog keeps its existing local order difference for `contextMarkers`; production catalogs remain read-only.

- `background`: inline foundational full-canvas work with ocean/intensity owners; high coupling and performance sensitivity.
- `physicalBase`: existing physical owner delegation; scenario-aware signature and shared runtime/diagnostic writes.
- `political`: high-coupling inline orchestration; P3.3a preflight only.
- `hgoPreview`: existing HGO preview owner delegation; dedicated browser lane gap stays explicit.
- `contextBase`, `contextScenario`, `contextMarkers`: high-coupling P3.2 orchestration across physical, river, water, relief, transport, strategic, and city owners.
- `effects`, `lineEffects`, `dayNight`, `textureLabels`: P3.1 visual-effects family with the shared texture normalization corrections above.
- `borders`: thin wrapper around the existing border owner with wrapper-owned guards.
- `labels`: thin wrapper retaining blank-label behavior and delegating city labels.

## Progress

- Inventory, contract test, package script, metadata route, metadata/runner assertions, coupling matrix, and worktree records are implemented.
- The child-safe sequence passes: inventory 6/6, metadata 18/18, runner 8/8, architecture boundaries, 116-file state-write allowlist, 51-spec import graph, supervisor contracts/plan, selector schema, 70-command core list, and diff checks.
- Adaptive selection over all 11 delivery files reports `unmatchedChangedFiles: []`; the dry-run supervisor exits 0. Evidence lives under `.runtime/reports/generated/renderer-pass-family-p3-0/`.
- The initial verify-core runner check exposed base-stale fixture coverage for two already registered city owner scripts and two already registered optional main-thread lanes. The focused fixture update aligns the test with live metadata; the final rerun passes 8/8.
- Browser, Playwright, dist, full-core, performance, push, and integration remain assigned to the App leader on the final committed clean HEAD.
