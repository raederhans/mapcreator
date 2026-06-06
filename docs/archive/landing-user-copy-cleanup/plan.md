# Landing User Copy Cleanup Plan

## Goal
Remove homepage copy that reads like developer or data-pipeline notes, and replace it with user-facing product descriptions.

## Scope
- Landing page source: `landing/index.html`, `landing/app.js`
- Existing landing contract tests: `tests/test_pages_dist_startup_shell.py`
- Generated Pages dist output after verification

## Acceptance Criteria
- The selected Japan preview paragraph no longer mentions checked-in assets, manifests, ledgers, build audits, or similar internal pipeline details.
- Comparable developer-facing phrases elsewhere on the homepage are removed or rewritten.
- English fallback HTML and i18n runtime copy stay aligned.
- `npm run verify:pages-dist` passes and refreshes `dist`.
- The final commit excludes unrelated `.omx/metrics.json` changes from the main checkout.

## Live Process Ownership
- Main agent owns `npm run verify:pages-dist`.
- Sidecar agents may perform static read-only review only.

## Task List
- [x] Create isolated worktree from `origin/main`.
- [x] Run sidecar static copy review.
- [x] Rewrite landing copy.
- [x] Add regression assertions for stale developer-facing homepage copy.
- [x] Run Pages dist verification.
- [x] Review for simpler or safer implementation.
- [ ] Merge to `main`, push, and clean worktree.

## Verification Evidence
- `npm run verify:pages-dist` passed: Pages dist rebuilt, 26 tests passed.
- Static scan found no stale homepage copy fragments in `landing/index.html`, `landing/app.js`, `dist/index.html`, or `dist/app.js`.
- Manifest size check found 9322 matching records and `total_bytes` matched the computed dist size.
- Read-only review agent found no blocking issues.
