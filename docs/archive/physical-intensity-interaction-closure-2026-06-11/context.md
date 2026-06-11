# Physical intensity interaction closure context

## 2026-06-11 intake
- Parent checkout `C:\Users\raede\Desktop\dev\mapcreator` has local `.omx/metrics.json` runtime noise, so implementation uses isolated worktree `C:\Users\raede\Desktop\dev\mapcreator-physical-intensity-closure`.
- Worktree branch: `codex/physical-intensity-interaction-closure`.
- Baseline: `origin/main` at `a416dc98 Clarify intensity and HGO maintenance contracts`.
- User-approved plan requires constants cleanup, Day/Night validation, removal of `physicalIntensityField`, performance repair, map editing, UI rebuild, tests, review, commit, push, and cleanup.

## Current facts
- `physicalIntensityField` was removed from source state, history capture/apply, save payloads, and renderer/UI writes.
- Legacy project import migrates `physicalIntensityField.points` into `intensityFields.channels.physicalAtlas.points` only when the Atlas point list is empty.
- `intensityFields.channels.physicalAtlas` and `physicalContour` are the runtime and persistence source of truth.
- `stampIntensityBrush` now scans only the covered lon/lat window, supports wrapped longitudes, returns dirty rects, and pairs with incremental `bakeIntensityComposite(channel, rect)`.
- Physical owner exposes channel-first Atlas/Contour controls, map tool mode, paint/erase/points, per-channel clear, radius in degrees with km display, and point selection/deletion.
- Runtime hooks contract includes `setIntensityFieldToolFn`.

## Constraints
- No README edits.
- No production mocks.
- Browser/live tests are main-agent owned.
- Pages/dist verification is required if delivery surfaces are touched.

## Closeout Notes
- Day/Night behavior was covered by constants cleanup plus `tests/appearance_texture_owner_behavior.test.mjs`, `tests/city_lights_asset_contract.test.mjs`, and `city_lights_layer_regression.spec.js`.
- The Physical regression E2E samples the owning `physicalBase` render pass canvas because later composite passes can hide small layer deltas on the final canvas.
- Remote `origin/main` advanced with progressive cache recovery; final integration must preserve that repaint path when rebasing this branch.
