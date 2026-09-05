# Development loop simplification

## Goal and scope

The user authorized rapid implementation after the 2026-09-05 audit: shorten everyday verification, remove renderer forwarding registries and the special-zone import cycle, and consolidate border state ownership. Preserve existing product behavior and the local P4.4 candidate at `12d967fc`.

## Implementation slices

1. Restrict default core verification to local-safe work; retain explicit full/CI entrypoints and make existing local feedback usable during action edits.
2. Remove four internal renderer facade registries without changing public exports; eliminate the special-zone model/actions cycle.
3. Consolidate a bounded border dirty/timer/cache lifecycle in existing owners.

## Acceptance

- Demonstrate changed default command selection and measured targeted feedback time without running the historical full-policy chain.
- Confirm the four registries and their imports are removed, the special-zone cycle is gone, and focused behavior tests pass.
- Demonstrate fewer border-state writers with cancellation/invalidation behavior preserved.
- Integrate all owned changes in the current checkout and report measured improvements separately from unverified runtime performance.

## Boundaries

No push, deployment, full-policy/performance/nightly runs, new frameworks, unrelated cleanup, or changes to data. Do not weaken explicit release authority or claim local feedback is formal P4 admission. Use targeted checks; one integration owner handles shared files and control-plane follow-through.

## Authorized second batch (2026-09-05)

The user accepted four priorities and requested four user-visible implementation tasks:

1. Retire duplicate handwritten verification metadata and routine legacy-shadow maintenance; retain independent discovery, schema and coverage validation.
2. Simplify a bounded renderer source-shape test family where existing behavior coverage proves the retained contract.
3. Consolidate sidebar country grouping/tree-model responsibilities and reduce cross-module callbacks.
4. Separate ordinary current-change verification from historical governance proof, based on actual remaining trigger paths.

Acceptance: each task delivers actual scoped code, minimal meaningful checks, measurable maintenance/command reductions, and explicit residual gaps. P1 owns shared metadata/package entries; P4 owns execution runners; root coordinates requests between them. Preserve the entire first batch and do not claim local checks establish historical admission or release readiness.

## Authorized third batch (2026-09-05)

The user requested another analysis and explicitly authorized dispatching the determined work without another confirmation. Priorities for the next rounds: broaden useful existing local behavior coverage; consolidate complete UI/renderer responsibilities; then consider domain-based catalog and mixed-test organization. Do not start a broad scenario/state rewrite merely to shrink files.

This batch starts with local routes for existing renderer/UI owners, an independent commit-runner test file, and HOI4 catalog state/render ownership within existing sidebar helpers. Renderer scope depends on the bounded read-only candidate map. Preserve all first/second-batch uncommitted work. Root coordinates canonical/package changes and acceptance; no automatic release or full historical admission is implied.

## Authorized fourth batch (2026-09-05)

The user selected verification catalog organization and requested higher-reasoning visible tasks. Split the 19k-line authored source by domain, separate normalization from authored data, preserve one logical authority and public exports, and update actual dependency consumers and existing navigation documentation. Preserve all 476 normalized records, commands, ordering and policies; only explicitly justified sourceRefs may change to cover the new modules. Root compares the complete before/after objects and integrates bounded checks. No broad test run or budget-policy change is included.

## Authorized local integration and commits (2026-09-05)

The user requested one integration/commit round covering the earlier improvements, with review and small evidence-backed fixes for remaining redundancy. All four batches are already in the same checkout on `codex/runtime-architecture-reset-r1-integration-20260831`; integrate locally on that branch. Root owns staging and commits. Parallel owners review/fix renderer and sidebar slices; a read-only verification reviewer reports issues for root to repair. Reuse existing successful checks, rerun affected behavior only after changes, and perform the necessary cross-slice import/catalog checks. Remote publication, main-branch promotion, worktree cleanup and full historical admission are outside this local closeout.
