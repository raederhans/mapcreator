# Landing Europe 1936 Showcase Audit Plan

## Goal
Audit the newly added Europe 1936 landing showcase for correct data connection, viewport/perspective correctness, and maintainable boundaries. Apply necessary decoupling fixes.

## Acceptance Criteria
- Data entrypoints resolve from scenario manifest/catalog contracts rather than scattered display code.
- SVG/JSON viewport and counts reflect the same Europe 1936 source set.
- Landing JS remains presentation-only and does not own data source paths or data semantics.
- Tests cover the data/view contract and Pages dist output.
- `npm run verify:pages-dist` passes after any fix.
- Final review states findings and fixes clearly.

## Task List
- [x] Create isolated audit worktree.
- [x] Inspect generator, SVG metadata, and landing integration.
- [x] Run independent data/view and decoupling review lanes.
- [x] Apply minimal fixes if audit finds issues.
- [x] Refresh generated assets and dist.
- [x] Run verification.
- [ ] Archive this audit folder.
- [ ] Merge, push, and clean worktree if changes are made.
