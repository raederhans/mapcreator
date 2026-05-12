# Annotation Productization Plan

## Goal

Make the first publishable-map annotation lane reliable before adding new editor capability. The first batch covers save/load, relationship sync, export annotation visibility, and light Project/Guide/Export wording polish.

## Acceptance

- Project roundtrip preserves strategic overlay data for `operationalLines`, `operationGraphics`, and `unitCounters`.
- Unit counter combat/presentation fields survive export/import.
- Dragging an attached unit counter away from an operational line clears the line-side `attachedCounterIds` relation.
- Export workbench keeps stable public ids while showing creator-facing annotation names and counts.
- Targeted Node/Python tests pass, followed by strategic overlay and project save/load E2E as main-thread-owned live verification.

## Tasks

- [x] Preserve unit counter product fields and strategic overlay legacy kind values in `file_manager`.
- [x] Sync line attachment ids after unit counter drag detach.
- [x] Improve export workbench annotation labels and family counts without changing public ids.
- [x] Add or extend targeted tests for file-manager roundtrip, detach sync, and export workbench behavior.
- [x] Run targeted verification and record results in `context.md`.
