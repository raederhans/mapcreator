# Appearance Transport Facility Icons And Selection Plan

## Goal

Improve `Appearance > Transport` airport and port point layers by replacing simple geometric markers with subtype-aware pixel icons, keeping marker size stable in screen pixels, and fixing hover/click hit precision after zoom and pan.

## Tasks

- [ ] Generate a project-owned pixel icon atlas for airport and port subtypes.
- [ ] Add a small icon owner that maps real airport/port properties to atlas cells and screen-size metadata.
- [ ] Update airport/port overview rendering to draw atlas icons with stable screen-space sizing and light tint/stroke support.
- [ ] Update facility hover entries so `screenPoint` matches the painted icon position after zoom/pan.
- [ ] Extend contract tests for atlas wiring, subtype coverage, screen-point math, and selection cache behavior.
- [ ] Run targeted verification and record results.

## Acceptance

- Airport icons distinguish `major`, `mid/regional`, `small/local`, `military`, and `spaceport`.
- Port icons distinguish `international_hub`, `important`, and `local`.
- Airport/port icons stay within a compact 10-18px visual range during normal zoom.
- Hover/click selection uses screen-space coordinates matching painted icons.
- Existing facility info-card and pointer-gating behavior remains intact.
- Targeted contract tests pass.

