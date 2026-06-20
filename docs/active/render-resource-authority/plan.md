# Render Resource Authority Refactor Plan

Last updated: 2026-06-20

## Goal

Reduce renderer refresh-chain load and instability by making resource authority the primary contract, narrowing runtime responsibilities, and retiring overlapping legacy contracts after targeted protection tests pass.

## Acceptance Criteria

1. FrameGraph refresh descriptors treat `targetResources` as the source of truth. `targetPasses` remains only as a compatibility bridge for old invalidation executors and tests.
2. Chunk promotion produces a pure value contract, with no DOM/canvas/context/timer/function/global queue references in the data object passed through the refresh chain.
3. `scenario_refresh_runtime` becomes a leaf runtime executor around existing plans. It keeps `primaryDerivedStateReady`, deferred infra timing, old public entry names, and architecture-boundary budgets.
4. First-frame render work is allowlisted to the minimum visible baseline: `background`, `physicalBase`, `political`, and `borders`, plus `hgoPreview` only when the active HGO pass is dirty.
5. HGO, TNO, and transport scenario refresh contracts stay protected by existing focused gates.
6. The final branch can be integrated into `main` with a clean worktree, registry delivery package, targeted tests, boundary checks, and push evidence.

## Phase Plan

### Phase 0: Setup And Evidence

- Use isolated worktree `C:\Users\raede\.codex\worktrees\mapcreator-render-resource-authority`.
- Maintain `docs/active/_worktree_registry.md`.
- Main Codex agent owns live tests, builds, and any dev server.
- Subagents may perform static mapping, review, and test-shape analysis only.

### Phase 1: Resource-First FrameGraph

- Add resource-to-pass bridge helpers near the existing pass-to-resource mapping.
- Update refresh-plan creation so resources are computed first.
- Keep legacy pass output derived from resources for compatibility.
- Update runtime invalidation to consume resources and bridge to passes at the edge.
- Add or extend Node tests for resource-first descriptors and legacy pass compatibility.

### Phase 2: Pure Promotion Delta

- Introduce a typed/predictable promotion delta builder around current chunk promotion planning.
- Encode identity, resources, domain layers, payload references, enum-only side-effect tasks, and simple metrics.
- Add purity tests that reject functions, DOM/canvas/context objects, timer handles, queue references, and long-term subscription objects.
- Keep executor coordination local to the current stack.

### Phase 3: Runtime Leaf Boundary

- Move remaining plan-like or descriptor-normalization logic out of `scenario_refresh_runtime` when it belongs in plan helpers.
- Preserve old public function names.
- Keep deferred infra and `primaryDerivedStateReady` behavior unchanged.
- Run architecture-boundary and import-graph gates after this phase.

### Phase 4: First-Frame Allowlist

- Add explicit first-frame resource/pass allowlist after resource-first behavior is stable.
- Keep labels, effects, day/night, texture labels, and context layers in deferred/idle lanes unless descriptor reasons say otherwise.
- Cover allowlist behavior with focused tests before any broad smoke gate.

### Phase 5: Domain Retirement And Integration

- Retire redundant old contracts once tests prove bridges cover remaining callers.
- Protect `scenario_renderer_bridge.js`, `startup_hydration.js`, `exact_after_settle_refresh_plans.js`, and `scenario_post_apply_effects.js`.
- Run final UltraQA matrix and independent review before merge.

## Verification Plan

- `npm run test:node:scenario-refresh-plans`
- `npm run test:node:scenario-chunk-promotion-helpers`
- `npm run test:node:exact-after-settle-refresh-plans`
- `npm run test:node:renderer-runtime-state-behavior`
- `npm run test:node:startup-hydration-behavior`
- `npm run test:node:canvas-layer-manager`
- `npm run test:node:scenario-chunk-contracts`
- `npm run verify:architecture-boundaries`
- `npm run verify:test-import-graph`
- `npm run verify:pages-dist` if source/dist artifacts change

## UltraQA Matrix

1. Resource-first descriptor still invalidates all expected legacy passes.
2. Pass-only old callers still derive equivalent resources.
3. Promotion delta stays serializable and pure.
4. Deferred infra still waits for the same readiness conditions.
5. HGO preview only enters early render when active and dirty.
6. TNO and transport scenario refresh contracts keep their targeted behavior.

