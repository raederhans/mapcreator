# Deferred Bootstrap Phase6 Plan

Base: `origin/main@edf9e4dc282a694d33dc931209274d6b558b6808`
Branch: `codex/deferred-bootstrap-phase6-20260625`
Worktree: `C:\Users\raede\.codex\worktrees\mapcreator-deferred-bootstrap-phase6-20260625`

## Goal

Extract `yieldToMain`, deferred milsymbol loading, and deferred UI bootstrap ownership from `js/main.js` into focused bootstrap owner modules while preserving startup behavior.

## Scope

1. Add `js/bootstrap/deferred_vendor_loader.js`.
2. Add `js/bootstrap/deferred_ui_bootstrap.js`.
3. Wire `js/main.js` to delegate to those owners.
4. Add behavior and boundary tests.
5. Refresh Pages dist if the checked dist mirror drifts.
6. Run the required Node, architecture, dist, and e2e smoke gates.

## Constraints

- Keep the parent checkout WIP untouched.
- Keep ordinary startup milsymbol loading out of UI shell debug startup.
- Preserve UI module dynamic imports and init order.
- Preserve cached promise behavior, including rejected UI bootstrap promises.
- Keep live/browser tests owned by the main agent only.
