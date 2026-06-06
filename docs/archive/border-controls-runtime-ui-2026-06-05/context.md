# Border Controls Runtime UI Context

## 2026-06-05

- User reported that internal borders, empire/country borders, and coastlines appear to ignore their settings.
- Initial code read shows `border_draw_owner.js` reads `styleConfig`, and border pass signatures include the three style objects.
- The draw owner still hard-codes country/coastline alpha and clamps internal alpha to minimums, so opacity changes can be muted.
- Country borders and coastlines currently expose only color and width in UI/default state.
- Worktree already contains unrelated dirty files from earlier tasks; this task will keep changes scoped to border UI/runtime/test/dist surfaces.
- Added a focused appearance border owner so internal/country/coastline controls no longer bind directly from `toolbar.js`.
- Added country/coastline opacity controls and made normal plus interactive border draw paths consume opacity, color, and width from `styleConfig`.
- Targeted checks passed: JS syntax, appearance border owner, parent border owner, border draw owner behavior, and border draw static contract.
- `npm run verify:pages-dist` passed and synced `dist/app`.
- Final design choice: keep the stored `empireBorders` key for project-file compatibility while changing visible UI copy to Country Borders.
- Final design choice: coastline controls also feed the coastal accent overlay because that overlay is the visible coast stroke in modern scenario views.
- Read-only review found one low-risk color fallback issue; fixed by using border-specific default colors for invalid border color values.

## Live Process Ownership

- Main agent owns all test/build/dev-server processes for this task.
- Subagents are read-only unless explicitly assigned disjoint patch work.
