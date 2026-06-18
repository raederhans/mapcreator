# TNO + HGO Integration Plan

## Goal

Create a clean integration branch that preserves the TNO political color progressive recovery fix, then layers the HGO preview projection/base-replacement fix on top.

## Acceptance Criteria

- TNO scoped fix is applied without carrying unrelated landing/main drift from the parent checkout.
- HGO commit `7a95e26c267abd9fb4b06c2e22a1e958dd901ee5` is applied on top.
- `drawPoliticalPass` keeps HGO preview early return first, then runs the TNO pending political color edit path for normal rendering.
- HGO visibility signatures and render pipeline token invalidation remain intact.
- Source and `dist/app` mirrors stay synchronized for touched browser files.
- Targeted TNO, HGO, renderer boundary, Pages dist, and diff checks pass or have explicit blockers.
- Branch is committed, pushed, and worktree registry is updated.

## Execution Checklist

- [x] Confirm current worktrees and dirty state.
- [x] Create clean integration worktree from current `origin/main`.
- [x] Confirm scoped TNO fix is already present in `origin/main@1206eb43`.
- [ ] Validate TNO-focused tests in the combined branch.
- [ ] Commit integration scaffolding.
- [ ] Cherry-pick HGO commit and resolve conflicts by preserving both semantics.
- [ ] Run HGO-focused tests and combined renderer tests.
- [ ] Run Pages dist verification and `git diff --check`.
- [ ] Run final static review / first-principles bug check.
- [ ] Update docs, registry, lessons learned if there is a durable new lesson.
- [ ] Commit, push, and report integration status.

## Live Process Ownership

- Main agent owns all test/build/dev-server commands.
- Subagents may inspect files and produce review notes only.
- No browser/dev-server smoke is planned unless command-level tests leave a visual/runtime gap.

## TNO Baseline Finding

Static review and direct grep show the TNO progressive recovery fix is already present in the clean integration base. The parent checkout appears dirty because it is still on older branch commit `a4957713`; those scoped renderer/runtime files have no remaining semantic diff to import from the parent checkout when compared with current `origin/main`.
