# Export Workflow Review Fix Plan

## Goal

Audit the latest export artifact workflow commit, fix confirmed defects, and land the corrections without touching the user's dirty main checkout.

## Scope

- Review commit `b7fbb57b` and any direct follow-up fixes.
- Focus on ZIP artifact generation, Export workbench integration, Project JSON handoff metadata, scenario publish metadata, vendored browser dependency, and Pages dist parity.

## Acceptance

- Independent review lanes report findings or clear status.
- Confirmed defects are fixed with focused source changes and tests.
- Targeted Node and Python tests pass.
- `python tools/i18n_audit.py` passes.
- `npm run verify:pages-dist` passes after source changes.
- Main is pushed, temporary worktree is cleaned, and the original dirty main checkout state is preserved.

## Stages

- [x] Stage 1: Establish isolated audit worktree and review scope.
- [x] Stage 2: Run independent review lanes and local inspection.
- [x] Stage 3: Fix confirmed issues and add coverage.
- [x] Stage 4: Verify and prepare closeout.

## Constraints

- Main thread owns live tests, Pages dist build, and final `js/ui/toolbar.js` integration.
- Do not change README.
- Keep the fix narrow; avoid adding new abstractions unless a confirmed defect requires it.
