# Appearance + Transport Platformization Plan

## Objective

Complete the approved appearance + transport platformization plan:

- Audit fixes for Texture, City Points, Transport, Urban, and Parent Borders.
- Day/Night true UTC mode plus automatic cycle mode.
- Physical intensity field pilot with editable grid field, weighted points, undo/redo, save/load, and render integration.
- Targeted verification, UltraQA, final review, merge to main, push, and worktree cleanup.

## Execution Order

1. Baseline and documentation.
2. Audit fixes.
3. Day/Night state, renderer, UI, and tests.
4. Intensity field core state, serialization, import, and history.
5. Physical renderer integration.
6. Physical field UI and interaction tools.
7. Targeted verification and UltraQA.
8. Final review, archive docs, merge, commit, push, cleanup.

## Ownership

- Main thread owns all live tests, browser checks, dev servers, builders, and final shared-file integration.
- Shared files `index.html`, `css/style.css`, and `js/ui/toolbar.js` are edited serially.
- Subagents may do static review and bounded implementation on disjoint files.

## Acceptance

- Targeted node tests pass.
- State writer allowlist passes.
- Physical e2e regression passes.
- Pages dist verification passes if published output changes.
- UltraQA report has passed scenarios or explicit safe substitutes.
- Final independent review has no blocking findings.
