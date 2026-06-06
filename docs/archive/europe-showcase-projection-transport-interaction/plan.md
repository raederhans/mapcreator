# Europe Showcase Projection Transport Interaction Plan

## Goal
Improve the Europe 1936 homepage showcase so the map projection reads correctly, the transport layer uses a complete Europe-focused source set, and the map supports limited zoom and pan interactions.

## Acceptance Criteria
- Projection no longer appears horizontally stretched in the homepage showcase.
- Transport layer data is selected from the Europe rail full source set with coverage across the viewport.
- Showcase metadata records the viewport, projected aspect, transport selection policy, counts, and layer ids.
- Landing JS keeps data semantics in metadata and owns only DOM interaction state.
- Users can zoom and pan within bounded limits, reset the view, and continue switching layers.
- `landing` and checked-in `dist` assets stay in sync.
- Targeted tests and `npm run verify:pages-dist` pass.

## Task List
- [x] Inspect current generator projection and transport selection.
- [x] Inspect current landing interaction boundary.
- [x] Implement minimal projection, transport, and interaction fixes.
- [x] Refresh generated assets and dist.
- [x] Run targeted verification and full Pages dist verification.
- [x] Run final review/self-audit.
- [x] Archive this task folder.
- [ ] Merge, push, and clean worktree.
