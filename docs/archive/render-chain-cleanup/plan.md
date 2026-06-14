# Render Chain Cleanup Plan

## Goal

Reduce map render-chain complexity without changing behavior. Execute the approved first three phases:

1. Phase 1A/1B: transport preview and overview cleanup.
2. Phase 2: renderer refresh transaction split.
3. Phase 3A/3B: worker client platformization and spatial index evidence spike.

## Phase 1A Scope

- Share road/rail preview path and length helpers.
- Share label density/grid occupancy selection where road and rail preview logic matches.
- Replace manual dataset parent walking with `Element.closest()` and root containment checks.
- Add or reuse minimal DOM test helpers only where tests repeat setup.

## Phase 1B Scope

- Extract transport overview family config/shared line-layer helpers after Phase 1A is stable.
- Use existing vendored D3 only in a narrow DOM enter/update/exit cleanup if the behavior is already locked.

## Phase 2 Scope

- Strengthen contracts around `setMapData`, scenario apply refresh, and chunk promotion ordering.
- Extract internal reset/cache/invalidate/derived-state helpers.
- Split chunk promotion internals into `visualRefresh` and `infraRefresh` helpers while keeping the public refresh surface stable.

## Phase 3 Scope

- Add `createWorkerTaskClient` and migrate worker client internals with hooks for task-model differences.
- Run a `.runtime` spatial index spike comparing current grid with `flatbush`/`rbush` candidates.
- Keep production spatial owner on the current grid in this plan.

## Verification

- Phase 1: `npm run test:node:transport-facility-render-owner`
- Phase 1: `npm run test:node:transport-workbench-preview-lifecycle-owner`
- Phase 1: `npm run test:node:transport-overview-line-contract`
- Phase 1: `python -m unittest tests.test_transport_workbench_manifest_runtime_contract -q`
- Phase 2: renderer boundary and scenario chunk contracts listed in the approved plan.
- Phase 3: worker helper behavior tests and spatial spike evidence.
- Run `npm run verify:pages-dist` whenever Pages delivery files are touched.
