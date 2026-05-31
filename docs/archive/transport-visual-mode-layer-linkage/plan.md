# transport visual mode layer linkage

## Plan

- [x] Start a focused code/data-flow audit for the transport visual mode controls.
- [x] Verify runtime behavior: changing visual mode must affect actual transport overview state or prove it is disconnected.
- [x] Decide the smallest model for global mode plus per-layer override.
- [x] Implement only if the missing linkage is confirmed and the model is low-risk.
- [x] Add or update a named targeted test.
- [x] Verify and archive this task folder.

## Acceptance

- We can state clearly whether the current visual mode is wired to rendering/layer controls.
- Current code already links the global visual mode to transport summary and renderer strategy.
- Per-layer visual mode override is a separate product change: keep global as default, then add a family-level linked/manual override when that UX is requested.
- Airport/Port/Rail/Road behavior remains separately controllable.
