# Thematic Legend And Safety Semantics Task

## Status

planned

## Objective

Prepare the semantic contract for thematic legends and safety metadata before any canvas rendering, UI toggle, or save-format work begins.

## Acceptance Criteria

1. Active docs contain plan, context, and task files for this phase.
2. Registry truth says WGI QA and cleanup are already complete on current `origin/main`.
3. Archived WGI task records the current post-cleanup registry truth commit.
4. The phase explicitly keeps renderer, toggle, save-format, generated data, and Pages dist out of scope.
5. WGI semantics require official dimensions and project proxy/composite wording to stay separate.
6. Missing numeric values stay null.
7. Composite uncertainty remains `not_computed` until a defensible method exists.
8. Thematic layers remain hidden by default and disabled for main-map rendering.
9. The future implementation slice starts with contract tests before code changes.
10. Verification evidence is recorded before this docs branch is integrated.

## Suggested First Implementation Slice

1. Extend existing thematic contract tests with required metadata fields.
2. Add the smallest Python contract representation that satisfies the tests.
3. Mirror only the catalog-facing assertions needed by runtime consumers.
4. Rebuild generated thematic payloads only after the metadata contract is implemented.

## Initial Verification Commands

- `git diff --check -- docs/active/_worktree_registry.md docs/archive/wgi-real-source-qa-fix-20260622/task.md docs/active/thematic-legend-safety-semantics-20260622`
- `rg "ready-for-integration|Fast-forward push|ready for fast-forward push" docs/active/_worktree_registry.md docs/archive/wgi-real-source-qa-fix-20260622/task.md`
- `npm run test:node:thematic-layer-catalog`

## Draft Delivery Package For This Docs Pass

1. Updated worktree registry to current `origin/main@159870ed` truth.
2. Updated archived WGI task with post-cleanup registry truth.
3. Added active phase docs for Thematic Legend and Safety Semantics.
4. Kept production code, generated assets, Pages dist, renderer, UI toggles, and save-format untouched.

### File Groups

- Core files: none.
- Test files: none changed.
- Documentation files: `docs/active/_worktree_registry.md`, `docs/archive/wgi-real-source-qa-fix-20260622/task.md`, `docs/active/thematic-legend-safety-semantics-20260622/plan.md`, `docs/active/thematic-legend-safety-semantics-20260622/context.md`, `docs/active/thematic-legend-safety-semantics-20260622/task.md`.
- Temporary files: none.

### Diff Summary

- Base: `origin/main@159870ed0752d5e03ef550c2ac51e2af87125f24`.
- Current branch: `codex/thematic-legend-safety-semantics-20260622`.
- Scope: docs-only registry/archive truth plus active planning docs.
- Current commit state: pending commit during this draft package; final commit hash should be recorded in the registry closeout after integration.
- Main divergence: no production divergence; branch starts from current `origin/main@159870ed`.

### Overlap Assessment

- Direct overlap with admin metrics loader: none by file path.
- Semantic overlap with admin metrics loader: yellow, because both belong to thematic work.
- Shared-hot-file overlap: registry is shared project coordination state; production hot files are untouched.
- Recommended order: integrate this docs-only pass before admin metrics loader code integration.

### Verification

- PASS `git diff --check -- docs/active/_worktree_registry.md docs/archive/wgi-real-source-qa-fix-20260622/task.md docs/active/thematic-legend-safety-semantics-20260622`.
- PASS `rg "ready-for-integration|Fast-forward push|ready for fast-forward push" docs/active/_worktree_registry.md docs/archive/wgi-real-source-qa-fix-20260622/task.md`: no stale WGI action text in registry/archive truth files.
- PASS `npm run test:node:thematic-layer-catalog`: 5/5 tests, with existing Node module-type warnings.
- PASS static architect review after adding current-worktree row: CLEAR.
- PASS static code review after adding current-worktree row: APPROVE, no findings.

### Remaining Risks

- This docs pass deliberately does not validate future Python schema fields because that implementation slice has not started.
- Browser smoke was not run because this pass changes documentation only.
- Admin metrics loader worktree is in progress and touches `js/core/data_service.js`, `package.json`, `js/core/thematic_admin_metrics_loader.js`, and `tests/thematic_admin_metrics_loader_behavior.test.mjs`; it remains outside this integration.

## Integration Recommendation

Merge this docs-only pass into `main` after verification, then remove the temporary worktree. Keep the admin metrics loader worktree independent until its owner publishes a delivery package.
