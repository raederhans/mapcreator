# A11y Home/App Fix Plan

## Goal

Improve the homepage and app-page UI accessibility findings without changing the product style or reducing existing functionality.

## Steps

- [x] Ground the work in the existing homepage/app entrypoints, i18n flow, and Pages dist delivery.
- [x] Add stable names and semantic hints for controls, inputs, map workspace, decorative images, and icon-only buttons.
- [x] Add keyboard support for existing tab groups using roving `tabindex` and arrow/Home/End behavior.
- [x] Preserve visual style while improving contrast and small target sizes.
- [x] Sync `dist` with source changes.
- [x] Verify with targeted tests, Pages dist checks, and axe/pa11y/Lighthouse scans.
- [x] Record integration guidance and delivery evidence.

## Integration State

Ready for integration after rebase onto current `main`. Direct overlap is expected in `docs/active/_worktree_registry.md` with the housekeeping worktree; keep both registry records during integration.
