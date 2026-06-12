# Intensity Field Appearance Platformization Plan

## Scope

Build the appearance-panel and nearby-rendering platform work in five phases:

1. Phase 0 foundations: brush-radius preview, scenario-global `intensityFields`, and backend shared-project allowlist.
2. Phase 1 `urbanGlow`: generic intensity-field registry, reusable editor UI, Urban render integration, pass signatures, and cache keys.
3. Phase 2 `oceanDepth`: `passMask` support, Ocean-owned UI, and ocean render integration.
4. Phase 3 `appearancePresets`: top-level state, save/apply/import/export/history/share.
5. Verification and landing: targeted tests, dist sync, QA review, merge, commit, push, and worktree cleanup.

## Constraints

- Work happens in isolated worktree `C:/Users/raede/Desktop/dev/mapcreator-intensity-appearance-platform-20260612`.
- Parent `main` contains unrelated WIP and remains untouched until final merge.
- Shared files `index.html`, `css/style.css`, and `js/ui/toolbar.js` are integrated by the main thread.
- Live test/build owner is the main thread unless this file is updated with a handoff.
- Runtime outputs belong under `.runtime/`.

## Acceptance Criteria

- `intensityFields` stays scenario-global and is supported by shared project import/export.
- All intensity-field channels use one registry contract for target passes and UI labels.
- Physical, Urban, and Ocean field editors share one UI factory.
- `urbanGlow` affects only city/urban glow-style surfaces and invalidates relevant render passes.
- `oceanDepth` affects only ocean/background rendering through an explicit mask contract.
- `appearancePresets` are top-level application state, history-aware, import/export safe, and shareable.
- Dist app is regenerated or verified against source for changed deliverable files.

## Verification Plan

- Run targeted unit/contract tests around intensity field state, file manager, history, renderer signatures, and backend shared projects.
- Run `verify:pages-dist` when source delivery files change.
- Run a final QA review pass after implementation.
- Update `lessons learned.md` only for a major new project lesson.
