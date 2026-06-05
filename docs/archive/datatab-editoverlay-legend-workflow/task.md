# DataTab/EditOverlay and Legend Workflow Task

## Checklist

- [x] DataTab shows edit status for source, created, updated, and deleted point rows.
- [x] DataTab search/sort/selection keeps edit status visible and stable.
- [x] EditOverlay created/updated/deleted deltas remain project-only state.
- [x] Project export/import preserves `legendControl`.
- [x] Tests cover DataTab edit status, point delta roundtrip, and legend control roundtrip.
- [x] `dist/app` is regenerated through `verify:pages-dist`.
- [x] Final verification and review are recorded in `context.md`.

## Boundaries

- Do not write user point edits into source transport packs.
- Do not add line or polygon editing.
- Do not add legend templates or export layout controls.
