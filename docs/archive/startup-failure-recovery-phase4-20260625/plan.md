# Startup Failure Recovery Phase 4 Plan

## Objective

Extract the startup `catch (error)` failure recovery path from `js/main.js` into `js/bootstrap/startup_failure_recovery.js`, keeping `main.js` as the orchestration caller and preserving startup fallback behavior.

## Scope

- Add `handleStartupFailure(options = {})`.
- Inject all recovery helpers explicitly through `helpers`.
- Keep the new owner free of direct imports from runtime state, scenario manager, map renderer, render boundary, and scenario post-apply effects.
- Allow the owner to write only `targetState.scenarioApplyInFlight = false`.
- Add behavior tests and static boundary tests.
- Rebuild Pages dist if drift is detected.
- Run focused browser startup smoke after node/architecture/dist checks.

## Steps

- [x] Create clean worktree from `origin/main@c8fbe1241eca7bba7900464da67698868dd98f73`.
- [x] Record phase4 in active docs and registry.
- [x] Extract startup failure recovery owner.
- [x] Add node behavior and boundary tests plus package script.
- [x] Run requested node and architecture checks.
- [x] Run Pages dist verification and include generated dist updates when required.
- [x] Run focused browser startup smoke and full smoke if available.
- [x] Review, commit with Lore protocol, push branch/main, archive the delivery package, and clean the worktree after integration.

## Closeout

- Functional delivery commit: `898b2e1e418c437a049389de9865ca751cd33ea9`.
- Archive/registry closeout is recorded with this archived delivery package.
- Recovery lives in `docs/archive/startup-failure-recovery-phase4-20260625/` plus main history after push.

## Risk Notes

- Startup recovery order is user-visible because it controls whether the boot overlay can continue with a base map.
- The continue handler must preserve rollback, deferred UI bootstrap wait, warmup state, invalidation, flush, metric checkpoints, and ready finalization order.
- Dist output is expected to change when source startup files change.
