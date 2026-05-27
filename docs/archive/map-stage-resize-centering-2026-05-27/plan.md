# Map Stage Resize Centering Fix

## Goal

Fix the map viewport drift after both side columns are collapsed/expanded and then restored.

## Acceptance

- Side-column size changes preserve the current map center when the visible map stage returns to its original size.
- The fix stays inside the map layout / resize / viewport ownership path.
- Targeted automated tests cover the resize-centering contract.
- Source and checked-in `dist/app` surfaces stay synchronized.

## Steps

- [x] Locate map stage resize and viewport state ownership.
- [x] Identify why panel resize changes leave the map offset.
- [x] Patch the narrow owner path.
- [x] Add or extend targeted tests.
- [x] Sync `dist/app` for changed runtime files.
- [x] Run targeted verification and final self-review.
