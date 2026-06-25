# Main Runtime Diagnostics Phase 2 Plan

## Goal

Move the main runtime diagnostics snapshot construction out of `js/main.js` into `js/bootstrap/main_runtime_diagnostics.js` while preserving snapshot schema, provider names, field conversion, and registration timing.

## Steps

- [x] Start from clean `origin/main` with post-ready scheduler phase1 integrated.
- [x] Identify the exact `main.js` snapshot helper/provider registration boundary.
- [x] Add `main_runtime_diagnostics` bootstrap owner with read-only snapshot builders.
- [x] Replace local `main.js` helpers with early `registerMainRuntimeDiagnostics(...)`.
- [x] Add behavior and boundary tests plus package script.
- [x] Run requested verification and handle expected dist drift.
- [ ] Push branch, merge/push main, and record cleanup status.

## Constraints

- Preserve `loadStatus/main_runtime` and `version/main_runtime` provider names.
- Preserve loadStatus and version snapshot schema.
- Do not import root `state` inside the new module.
- Do not write to `targetState`.
- Keep parent checkout `docs/archive/**` deletion WIP untouched.
- `cloneSnapshotValue` remains exported because the phase2 task explicitly requires it, even though architect review recommended keeping it private for a smaller long-term API surface.
