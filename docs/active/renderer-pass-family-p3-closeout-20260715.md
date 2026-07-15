# Renderer Pass Family P3 Closeout — 2026-07-15

## Status

P3 is implementation-complete and acceptance-complete through the P3 runtime branch functional commit:

```text
a18ee17fe2aba894f3e9455513d166a2a9d7d032
```

The final open actions are the wait-contract/docs closeout commit, rebase over current `origin/main`, final clean-head gates, main integration, archive, push, and isolated worktree cleanup.

## Delivered ownership

- P3.0 froze the 13-pass family inventory and coupling matrix.
- P3.1 moved `effects`, `lineEffects`, `dayNight`, and `textureLabels` pass orchestration into `js/core/renderer/visual_effects_pass_owner.js`.
- P3.2 moved `contextBase`, `contextMarkers`, and `contextScenario` pass orchestration into `js/core/renderer/context_pass_orchestrator_owner.js`.
- P3.3a froze the political-pass preflight boundary with production runtime unchanged.
- P3.3b moved top-level political-pass orchestration into `js/core/renderer/political_pass_orchestrator_owner.js`.

The stable pass entry wrappers remain in `js/core/map_renderer.js`. Concrete drawing, worker/cache algorithms, partial repaint, progressive recovery, state writes, scheduling, public facade, pass order, `renderPassToCache()`, P2 frame owners, and `RendererRuntimeContext` remain in their existing ownership surfaces.

## Follow-up E2E wait-contract repair

Complete suite runs on current `origin/main` and the P3 branch both showed a deferred-infra wait shape: visual/political color readiness was satisfied while `pendingInfraPromotion` remained true. The E2E helpers now keep deferred infra in diagnostics while gating color coverage and render idle on visual promotion, refresh, and render-commit readiness.

Changed files:

- `tests/e2e/dev/scenario_chunk_exact_after_settle_regression.dev.spec.js`
- `tests/e2e/support/playwright-app.js`

Post-repair evidence:

- `npm run test:e2e:dev:scenario-chunk-runtime` — `8/8`
- `npm run test:e2e:dev:political-progressive-recovery` — `3/3`
- `npm run test:e2e:scenario-resilience` — `3/3`
- `npm run test:e2e:physical-layer-runtime-contract` — `1/1`
- `npm run test:e2e:water-rendering` — `12/12`
- `npm run test:e2e:city-rendering` — `8/8`
- `npm run test:e2e:tno-contracts` — `2/2`
- `npm run perf:gate` — passed against `docs/perf/baseline_2026-07-14.json`

Relevant logs live under `.runtime/logs/p3-3b-*`.

## Integration notes

Current remote main has one later performance-boundary tooling commit:

```text
d5695acc13b38c1ae4e77f887a2add69985cbf95
```

Final integration should rebase or merge the P3 runtime branch over current `origin/main`, then rerun the final deterministic, main-thread/browser, dist, and standard performance gates.

The dirty parent checkout remains preserved. Integration must continue from the isolated P3 runtime worktree.
