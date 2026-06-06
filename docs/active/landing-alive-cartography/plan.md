# Landing Alive Cartography Plan

## Scope

Redesign the public homepage so the first viewport and showcase sections feel like a living cartography product. Use generated, source-backed map imagery and keep runtime interaction small.

## Execution Steps

1. Create an isolated worktree and keep docs under `docs/active/landing-alive-cartography/`.
2. Generate static SVG map assets from checked-in topology and transport data.
3. Replace weak homepage screenshots with generated map-forward assets.
4. Add thin landing interactions for hero chips, preview tabs, reveal, scroll state, and metric count-up.
5. Extend pages-dist contract tests for the new assets and hooks.
6. Run targeted syntax/contracts, then `npm run verify:pages-dist`.
7. Run a bounded browser QA pass owned by the main agent.
8. Run review/bug/first-principles self-check, fix findings, archive docs, merge to main, commit, push, and clean worktree.

## Boundaries

- Keep shared app files untouched unless browser QA finds a screenshot blocker.
- Keep generated landing assets compact and deterministic.
- Keep manual code edits limited to `landing/`, `tools/`, tests, and task docs unless evidence requires a wider scope.
