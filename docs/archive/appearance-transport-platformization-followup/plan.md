# Appearance + Transport Platformization Follow-up Plan

## Goal
Finish the current appearance + transport platformization follow-up on top of `origin/main`.

## Scope
- Keep `transport_capability_registry.js` as the source for transport overview data-layer requests.
- Keep shared UI files serialized; this pass does not restructure `index.html`, `css/style.css`, or `js/ui/toolbar.js`.
- Preserve current airport/port/rail/road behavior while removing registry-drift risk.
- Sync `dist/app` after source changes and verify Pages manifest parity.

## Acceptance
- Transport appearance toggles request overview data layers through registry metadata.
- Existing release/deferred context ordering remains intact.
- Targeted Node and Python contracts pass.
- `verify:pages-dist` passes after source/dist sync.
- Code review and QA gates are clean or findings are fixed in this lane.

## Plan
- [x] Create isolated worktree from `origin/main`.
- [x] Read prior appearance + transport PRD/test-spec/archive context.
- [x] Identify a low-risk platformization gap in current source.
- [x] Move transport appearance data-layer requests to registry metadata.
- [x] Run targeted tests.
- [x] Sync `dist/app` and run Pages verification.
- [ ] Commit, push, merge, and clean worktree.
