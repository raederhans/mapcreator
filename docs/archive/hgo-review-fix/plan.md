# HGO Review Fix Plan

## Summary

Audit the HGO identity inspector changes on latest `origin/main`, fix confirmed defects, and keep runtime/data/Pages delivery contracts clean. Work is isolated in `C:\Users\raede\Desktop\dev\mapcreator-hgo-review-fix` on `codex/hgo-review-fix`.

## Acceptance Criteria

- HGO resolver preserves exact, reviewed alias, suggested alias, missing, flag tier, variant, and palette behavior.
- Inspector UI keeps HGO identity display-only and scoped to list/search/detail.
- HGO runtime assets are available in Pages dist for every URL the browser reads.
- Data governance remains valid for runtime registry, manifest, catalog, and source ledger.
- A review pass finds no remaining blocking HGO issues.

## Steps

1. Create isolated worktree and task docs.
2. Run read-only review lane against HGO-related files.
3. Inspect HGO runtime/UI/data/dist code locally.
4. Fix confirmed issues with focused tests.
5. Run targeted Node/Python/data/Pages checks.
6. Commit, push, merge to `main`, and clean worktree.
