# TNO political edit progressive recovery plan

## Goal

Fix the Scenario Forge political fill regression where heavy scenarios can show admin0 coarse background after a color edit and skip fine feature rendering. The edited color data must become visible and interactive immediately while preserving progressive recovery for non-edit recovery frames.

## Constraints

- Keep the fix inside the political render state and pass lifecycle.
- Preserve `partialPoliticalDirtyIds` as the narrow partial repaint signal.
- Preserve progressive coarse recovery for startup and non-edit invalidations.
- Avoid changing scenario data, topology builders, README files, or broad background collection policy in this phase.
- Main Codex agent owns all live tests, dev server, browser, and build commands.

## Implementation Steps

1. Add pending political color edit cache state with initialization and normalization.
2. Mark pending edits from `refreshResolvedColorsForFeatures()`.
3. Make pending edits block progressive admin0 recovery and the fine feature loop skip.
4. Clear pending edits after a successful fine feature draw path or successful partial repaint for the same color revision.
5. Extend existing runtime-state and scenario-chunk contract tests.
6. Add a targeted dev E2E regression to the existing political progressive recovery route.
7. Run focused verification, review, and update closeout evidence.

## Implementation Update

Runtime diagnostics showed a second failure mode after the pending marker fix: the edited feature was drawn, then later same-pass political features with the old owner color covered its pixels. The final fix therefore has two parts:

1. Pending political color edit state keeps edit frames on the exact/fine path during progressive recovery.
2. Political feature ordering paints shell/primary underlays first, ordinary detail features next, and explicit or pending color edits last.

## Acceptance Criteria

- Political color edit frames do not use `progressive-coarse-underlay` to skip fine feature fills.
- Pending edit state survives unrelated political invalidation until a fine render path confirms the edit.
- Pending edit state clears after confirmed fine drawing, so progressive recovery remains available afterward.
- Explicitly edited political features keep final pixel priority over overlapping fallback/detail features.
- Existing color source coverage behavior stays unchanged.
- Focused unit/contract/E2E gates pass or any baseline failure is explicitly documented.
