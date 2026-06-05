# DataTab/EditOverlay and Legend Workflow Plan

## Goal

Complete the V1 project editing loop for Transport Workbench point data and legend control state.

## Scope

- Show edit delta state in the DataTab for point-family rows.
- Keep user point edits in `transportWorkbenchPointDeltas`.
- Keep source packs, manifests, catalog entries, and projected source caches read-only.
- Persist `legendControl` with project export/import alongside existing legend labels and config.

## Non-goals

- Main-map Apply support for edit deltas.
- Line or polygon geometry editing.
- Legend template library or export layout tooling.

## Steps

- [ ] Confirm existing DataTab, EditOverlay, project roundtrip, and legend contracts.
- [ ] Add DataTab edit status display for source, created, updated, and deleted rows.
- [ ] Ensure point edit deltas refresh preview state without mutating source packs.
- [ ] Add `legendControl` to project export/import normalization and tests.
- [ ] Sync `dist/app` through the existing Pages dist build.
- [ ] Run targeted Node/Python verification and final review.

## Live Process Owner

Main agent owns all tests, Pages dist, browser smoke, and command polling. Subagents are static review only.
