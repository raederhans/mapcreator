# P21 Plan

## Classification

`complex`: renderer owner extraction touches shared `map_renderer.js`, architecture boundary tooling, package scripts, tests, and worktree registry. Main thread owns implementation and live validation. Subagents are read-only/static reviewers.

## Steps

- [x] Confirm parent checkout WIP and create isolated worktree from latest `origin/main`.
- [x] Confirm P18/P19/P20 artifacts exist on `origin/main`.
- [x] Read recent owner patterns and current `initZoom()` behavior.
- [x] Add zoom interaction lifecycle owner with injected getters/helpers/effects.
- [x] Convert `map_renderer.js` `initZoom()` into an owner wrapper while preserving host-owned functions.
- [x] Add focused node behavior tests.
- [x] Add package script and architecture boundary checks.
- [x] Run required syntax, node, architecture, state-write, import-graph, and e2e validations.
- [x] Run final review/fix pass and update delivery package.
- [ ] Commit, push, integrate to `origin/main`, archive docs, and clean the worktree after integration.

## Verification Owner

Main Codex thread owns all live commands. Child agents may inspect code and review landed diffs only.
