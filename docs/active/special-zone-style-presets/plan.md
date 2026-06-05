# Special zone style presets

## Goal
- Show special-zone preset parent categories first.
- Keep preset children collapsed by default.
- Render preset pattern previews as visible rectangular samples.
- Replace the raw pattern dropdown with localized rectangular preview choices.
- Remove the visible workbench status note while preserving status updates for assistive tech.
- Make the current layer style card more compact without changing neighboring cards.

## Steps
- [x] Locate the preset render path and preview CSS.
- [x] Update the preset UI to use collapsed category groups.
- [x] Update tests for collapsed groups and rectangular previews.
- [x] Sync dist and run focused verification.
- [x] Locate the current pattern dropdown render path.
- [x] Replace the pattern dropdown with preview choices.
- [x] Add localized pattern labels.
- [x] Sync dist and run focused verification again.
- [x] Hide the workbench status note and remove related spacing.
- [x] Sync dist and run focused verification after status cleanup.
- [x] Add a dedicated class for the current layer style card.
- [x] Tighten spacing, preview sizes, and field heights in that card.
- [x] Sync dist and run focused verification after style-card compaction.
- [x] Fix preset preview samples to use one consistent rectangle size.
- [x] Add a CSS contract check for preset preview sizing.
- [x] Clarify the member copy source dropdown with placeholder text and disabled empty state.
- [x] Add behavior coverage for empty and selectable copy-source states.

## Notes
- Keep the change scoped to the special-zone workbench.
- Reuse `SPECIAL_ZONE_PRESETS` as the source of truth.
- Preset sample size now comes from `.special-zone-preset-card` and `.special-zone-preset-preview`, so label length cannot change the rectangle width.
- The member copy dropdown now communicates its source-layer role directly instead of rendering as a blank select.
